#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo lataa osallistujatiedot navisportista csv tiedostoon.
  echo "Käyttö: $0 input.csv"
  exit 1
fi

CSV="$1"
# generoi am_seurat.txt joko käsin tai hae alueesi data vastaavalla scriptillä kuin fetch_AM_seurat.sh
UUFILE="am_seurat.txt"

# Poimi tiedostonimi ilman .csv-päätettä ja muodosta uusi nimi
BASENAME="${CSV%.csv}"
OUT="${BASENAME}_output.csv"

# Rakennetaan regex tiedostosta
regex=""
while IFS= read -r line; do
  # ohitetaan tyhjät rivit
  [[ -z "$line" ]] && continue
  regex="${regex}|${line}"
done < "$UUFILE"
regex="(${regex:1})"

awk -v FS=',' -v OFS=',' -v pat="$regex" '
BEGIN { gsub(/"/, "", pat) }
NR==1 { print; next }
{
  seura=$7
  nimi=$5
  gsub(/^"|"$/, "", seura)
  gsub(/^"|"$/, "", nimi)
  if (seura ~ pat) {
    $5 = "\"" nimi " (AM)\""
  }
  print
}' "$CSV" > "$OUT"

echo "Valmis! Tiedosto luotu: $OUT"
