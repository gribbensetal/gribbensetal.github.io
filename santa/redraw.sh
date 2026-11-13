#!/usr/bin/env bash
# Re-run the Secret Santa draw from santa/people.json.
#
#   ./santa/redraw.sh          new draw, new links (asks first)
#   ./santa/redraw.sh --push   same, then commits and pushes data.js so the new links go live
#   ./santa/redraw.sh -y       skip the confirmation
#
# Every redraw makes brand new links. The old ones stop working once the
# new data.js is live, so everyone needs to be sent their new link.

set -euo pipefail
cd "$(dirname "$0")"

push=false
yes=false
for arg in "$@"; do
  case "$arg" in
    --push) push=true ;;
    -y|--yes) yes=true ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

if ! $yes; then
  read -r -p "This makes a new draw and ALL old links stop working. Continue? [y/N] " answer
  [[ "$answer" =~ ^[Yy] ]] || { echo "Cancelled."; exit 0; }
fi

node generate.mjs

if $push; then
  git add data.js index.html
  git commit -m "Redraw Secret Santa"
  git push
  echo "Pushed. New links are live once GitHub Pages rebuilds (usually a minute or two)."
else
  echo "Not pushed yet. Run with --push, or commit santa/data.js yourself, to make the new links live."
fi
