#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Käyttö: $0 input.csv"
  exit 1
fi

CSV="$1"
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
  seura=$5      # Seura
  joukkue=$3    # Joukkueen nimi
  gsub(/^"|"$/, "", seura)
  gsub(/^"|"$/, "", joukkue)
  if (seura ~ pat) {
    $3 = "\"" joukkue " (AM)\""
  }
  print
}' "$CSV" > "$OUT"

echo "Valmis! Tiedosto luotu: $OUT"
