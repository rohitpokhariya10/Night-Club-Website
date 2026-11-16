#!/usr/bin/env bash
# Builds one contact sheet per scene (0/25/50/75/100% and reverse-25%) from sequence-check output.
# usage: bash scripts/motion/sequence-sheets.sh <dir> [thumbWidth]
set -euo pipefail
dir=$1; w=${2:-280}
for g in "A_hero B_venue B_nightlife" "C_food D_specials D_events" "E_celebration E_gallery F_footer"; do
  files=(); for n in $g; do for p in 000 025 050 075 100 rev025; do files+=("$dir/$n-$p.png"); done; done
  set -- $g; node "$(dirname "$0")/contact-sheet.mjs" "$dir/sheet-$1-$3.png" 6 "$w" "${files[@]}"
done
ls "$dir"/sheet-*
