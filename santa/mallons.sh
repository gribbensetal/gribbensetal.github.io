#!/usr/bin/env bash
# Draw the Mallon Secret Santa and generate everyone's private links.
#
#   ./santa/mallons.sh          new draw, new links (asks first)
#   ./santa/mallons.sh --push   same, then commits and pushes so the new links go live
#   ./santa/mallons.sh -y       skip the confirmation
#
# The Mallons live in their own unlisted directory with their own people.json,
# data.js and links.txt, completely separate from the Gribben draw in santa/.
# Their page is a copy of santa/index.html, refreshed on every run so it
# picks up any changes made to the Gribben page.

set -euo pipefail
cd "$(dirname "$0")/.."

dir=4dea3020b64d

push=false
yes=false
for arg in "$@"; do
  case "$arg" in
    --push) push=true ;;
    -y|--yes) yes=true ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

if [[ ! -f "$dir/people.json" ]]; then
  echo "No $dir/people.json yet. Copy $dir/people.example.json to $dir/people.json and fill in the Mallons." >&2
  exit 1
fi

if ! $yes; then
  read -r -p "This makes a new Mallon draw and ALL their old links stop working. Continue? [y/N] " answer
  [[ "$answer" =~ ^[Yy] ]] || { echo "Cancelled."; exit 0; }
fi

cp santa/index.html "$dir/index.html"
node santa/generate.mjs "$dir/people.json"

if $push; then
  git add "$dir/data.js" "$dir/index.html" "$dir/people.example.json"
  git commit -m "Redraw Mallon Secret Santa"
  git push
  echo "Pushed. New links are live once GitHub Pages rebuilds (usually a minute or two)."
else
  echo "Not pushed yet. Run with --push, or commit $dir/data.js and $dir/index.html yourself, to make the new links live."
fi
