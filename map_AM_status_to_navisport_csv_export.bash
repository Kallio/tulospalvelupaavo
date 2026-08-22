#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Käyttö: $0 [-r] [-o output.csv] input.csv"
  echo "  -r  poista nimistä \" (AM)\"-merkinnät"
  echo "  -o  tulostiedoston nimi (oletus: <input>_output.csv)"
  exit 1
}

CSV=""
OUT=""
REMOVE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    -r|--remove-am)
      REMOVE=1
      ;;
    -o|--output)
      if [[ $# -lt 2 ]]; then
        echo "Valitsin -o vaatii argumentin" >&2
        usage
      fi
      OUT="$2"
      shift
      ;;
    -h|--help)
      usage
      ;;
    -*)
      echo "Tuntematon valitsin: $1" >&2
      usage
      ;;
    *)
      CSV="$1"
      ;;
  esac
  shift
done

if [[ -z "$CSV" ]]; then
  usage
fi

# generoi am_seurat.txt joko käsin tai hae alueesi data vastaavalla scriptillä kuin fetch_AM_seurat.sh
UUFILE="am_seurat.txt"

# Poimi tiedostonimi ilman .csv-päätettä ja muodosta uusi nimi ellei tulostiedostoa annettu
if [[ -z "$OUT" ]]; then
  BASENAME="${CSV%.csv}"
  OUT="${BASENAME}_output.csv"
fi

if [[ "$OUT" == "$CSV" ]]; then
  echo "Virhe: tulostiedosto saa olla sama kuin syötetiedosto" >&2
  exit 1
fi

# Rakennetaan regex tiedostosta
regex=""
while IFS= read -r line; do
  # ohitetaan tyhjät rivit
  [[ -z "$line" ]] && continue
  regex="${regex}|${line}"
done < "$UUFILE"
regex="(${regex:1})"

awk -v FS=',' -v OFS=',' -v pat="$regex" -v remove="$REMOVE" '
BEGIN { gsub(/"/, "", pat) }
NR==1 { print; next }
{
  seura=$7
  nimi=$5
  gsub(/^"|"$/, "", seura)
  gsub(/^"|"$/, "", nimi)
  if (remove) {
    # poistetaan kaikki lopussa olevat " (AM)"-merkinnät (myös tuplat)
    while (nimi ~ / \(AM\)$/) {
      sub(/ \(AM\)$/, "", nimi)
    }
    $5 = "\"" nimi "\""
  } else if (seura ~ pat && nimi !~ /\(AM\)"?$/) {
    $5 = "\"" nimi " (AM)\""
  }
  print
}' "$CSV" > "$OUT"

echo "Valmis! Tiedosto luotu: $OUT"
