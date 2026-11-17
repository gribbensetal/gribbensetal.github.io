# Secret Santa

Each person gets a private link. It opens a bauble they click about 30 times to smash it, which reveals who they're buying for and that person's wish list.

## Running the draw

1. `cp santa/people.example.json santa/people.json` and fill in everyone. This file is gitignored.
   - `wishlist`: a list of strings, or `{ "text": ..., "url": ..., "note": ... }` objects.
   - `never`: people this person must not be paired with. This works both ways, so you only need to list it on one of the two people.
   - `only`: limits who this person can buy for (one-way).
   - `rules.households`: a list of groups, e.g. `[["Kieran", "Helena"], ...]`. Nobody draws someone from their own group.
   - `rules.noMutualPairs`: stops A→B and B→A both happening.
2. `node santa/generate.mjs`
3. Commit and push `santa/data.js`, then send each person their line from `santa/links.txt`.

`data.js` only holds encrypted blobs. Each one can only be opened with the token after the `#` in that person's link. The token never gets sent to the server, and the organiser never sees the pairings either.

Running the generator again makes a completely new draw with new links, and the old links stop working.

## Redrawing

`./santa/redraw.sh` asks for confirmation, then makes a new draw. Add `--push` to also commit and push `data.js` so the new links go live, or `-y` to skip the confirmation.

## The Mallons

The Mallons have their own separate draw at an unlisted address: `https://shiteupastickandlickitcomingdown.com/4dea3020b64d/`. Nothing links to it, so only people with a link will find it.

1. `cp 4dea3020b64d/people.example.json 4dea3020b64d/people.json` and fill in the Mallons (same format as above). This file is gitignored.
2. `./santa/mallons.sh --push` draws, writes `4dea3020b64d/data.js` and `4dea3020b64d/links.txt`, and pushes the page live.
3. Send each Mallon their line from `4dea3020b64d/links.txt`.

The script copies `santa/index.html` into their directory every time it runs, so the page always matches the Gribben one. Redraws work the same way as above: run it again and everyone gets new links.
