#!/usr/bin/env node
// Secret Santa generator.
//
// Reads people.json, draws a valid assignment honouring the rules, and writes:
//   data.js   - public: one AES-GCM encrypted blob per person (safe to commit)
//   links.txt - private: each person's personal link (gitignored, don't commit)
//
// Each link carries a random token in the URL fragment (#...). The token is the
// only way to find and decrypt that person's blob, so nobody — including whoever
// runs this script — can see who got whom without opening someone else's link.
//
// Usage: node santa/generate.mjs [path/to/people.json]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const configPath = process.argv[2] ?? join(here, 'people.json');

if (!existsSync(configPath)) {
  console.error(`No config at ${configPath}.\nCopy people.example.json to people.json and fill it in.`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const people = config.people ?? [];
const rules = config.rules ?? {};
const baseUrl = config.baseUrl ?? 'https://shiteupastickandlickitcomingdown.com/santa/';

// ---------- validation ----------

const names = people.map(p => p.name);
const fail = msg => { console.error(`Error: ${msg}`); process.exit(1); };

if (people.length < 2) fail('need at least 2 people');
if (new Set(names).size !== names.length) fail('names must be unique');
for (const p of people) {
  for (const n of [...(p.never ?? []), ...(p.only ?? [])]) {
    if (!names.includes(n)) fail(`${p.name} references unknown person "${n}"`);
  }
}

// "never" is symmetric: if A never gets B, B never gets A either.
const never = new Map(names.map(n => [n, new Set()]));
for (const p of people) {
  for (const n of p.never ?? []) {
    never.get(p.name).add(n);
    never.get(n).add(p.name);
  }
}

// Households: nobody draws someone from their own household.
for (const household of rules.households ?? []) {
  for (const a of household) {
    if (!names.includes(a)) fail(`household references unknown person "${a}"`);
    for (const b of household) if (a !== b) never.get(a).add(b);
  }
}

// "only" is one-way: it limits who this person may buy for.
const options = new Map(people.map(p => [
  p.name,
  names.filter(n =>
    n !== p.name &&
    !never.get(p.name).has(n) &&
    (!p.only || p.only.includes(n))),
]));

for (const [name, opts] of options) {
  if (opts.length === 0) fail(`${name} has nobody they're allowed to buy for`);
}

// ---------- matching ----------

function randomInt(max) {
  return crypto.getRandomValues(new Uint32Array(1))[0] % max;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Backtracking search, most-constrained giver first, with shuffled candidates
// so every run gives a fresh random draw.
function draw(noMutual) {
  const givers = shuffle(names).sort((a, b) => options.get(a).length - options.get(b).length);
  const assigned = new Map();
  const taken = new Set();

  const step = i => {
    if (i === givers.length) return true;
    const giver = givers[i];
    for (const r of shuffle(options.get(giver))) {
      if (taken.has(r)) continue;
      if (noMutual && assigned.get(r) === giver) continue;
      assigned.set(giver, r);
      taken.add(r);
      if (step(i + 1)) return true;
      assigned.delete(giver);
      taken.delete(r);
    }
    return false;
  };

  return step(0) ? assigned : null;
}

const noMutual = rules.noMutualPairs ?? false;
const assignment = draw(noMutual);
if (!assignment) {
  fail(noMutual
    ? 'no valid draw exists with these rules. Try loosening "never"/"only" lists, or set rules.noMutualPairs to false.'
    : 'no valid draw exists with these rules. Try loosening "never"/"only" lists.');
}

// ---------- encryption ----------

const enc = new TextEncoder();
const b64url = bytes => Buffer.from(bytes).toString('base64url');
const sha256 = async s => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));

const entries = {};
const links = [];

for (const giver of names) {
  const recipient = assignment.get(giver);
  const token = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const id = b64url((await sha256(`id|${token}`)).slice(0, 16));
  const key = await crypto.subtle.importKey('raw', await sha256(`key|${token}`), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const payload = {
    giver,
    recipient,
    wishlist: people.find(p => p.name === recipient).wishlist ?? [],
  };
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(payload)));

  entries[id] = { iv: b64url(iv), ct: b64url(new Uint8Array(ct)) };
  links.push([giver, `${baseUrl}#${token}`]);
}

// Sort by id so file order says nothing about the people list order.
const sorted = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));
const data = { event: config.event ?? {}, entries: sorted };

writeFileSync(join(here, 'data.js'), `window.SANTA = ${JSON.stringify(data, null, 2)};\n`);

const width = Math.max(...names.map(n => n.length));
const linkText = links.map(([n, url]) => `${n.padEnd(width)}  ${url}`).join('\n') + '\n';
writeFileSync(join(here, 'links.txt'), linkText);

console.log(`Drew ${names.length} people${noMutual ? ' (no mutual pairs)' : ''}.\n`);
console.log(linkText);
console.log('Wrote santa/data.js (commit this) and santa/links.txt (keep private).');
console.log('Re-running makes a brand new draw and new links; old links stop working.');
