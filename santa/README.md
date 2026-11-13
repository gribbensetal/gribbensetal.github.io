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
