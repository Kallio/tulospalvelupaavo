#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Käyttö: $0 [-p] [-r] [-o output.csv] input.csv"
  echo "  -p  täytä tuntemattomat juoksijat \"N N\" -paikkamerkinnöillä (kaikki joukkuerivit)"
  echo "  -r  poista joukkuenimistä \" (AM)\"-merkinnät"
  echo "  -o  tulostiedoston nimi (oletus: <input>_output.csv)"
  exit 1
}

CSV=""
OUT=""
PSEUDO=0
REMOVE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--pseudo)
      PSEUDO=1
      ;;
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

awk -v FS=',' -v OFS=',' -v pat="$regex" -v pseudo="$PSEUDO" -v remove="$REMOVE" '
BEGIN { gsub(/"/, "", pat) }
NR==1 {
  # etsitään otsikosta Nimi-k ja Osuus-k sarakkeiden indeksit
  for (i = 1; i <= NF; i++) {
    if (match($i, /Nimi-[0-9]+/)) {
      leg = substr($i, RSTART + 5, RLENGTH - 5)
      nimi_idx[leg] = i
    }
    if (match($i, /Osuus-[0-9]+/)) {
      leg = substr($i, RSTART + 6, RLENGTH - 6)
      osuus_idx[leg] = i
    }
  }
  print; next
}
{
  seura=$5      # Seura
  joukkue=$3    # Joukkueen nimi
  gsub(/^"|"$/, "", seura)
  gsub(/^"|"$/, "", joukkue)
  if (remove) {
    # poistetaan kaikki lopussa olevat " (AM)"-merkinnät (myös tuplat)
    while (joukkue ~ / \(AM\)$/) {
      sub(/ \(AM\)$/, "", joukkue)
    }
    $3 = "\"" joukkue "\""
  } else if (seura ~ pat && joukkue !~ /\(AM\)"?$/) {
    $3 = "\"" joukkue " (AM)\""
  }
  if (pseudo) {
    for (leg in nimi_idx) {
      ni = nimi_idx[leg]
      val = $ni
      gsub(/^"|"$/, "", val)
      if (val ~ /^[[:space:]]*$/) {
        $ni = "\"N N\""
        val = "N N"
      }
      # juoksijalla pitää aina olla osuusnumero
      if ((leg in osuus_idx) && val != "") {
        oi = osuus_idx[leg]
        oval = $oi
        gsub(/^"|"$/, "", oval)
        if (oval ~ /^[[:space:]]*$/) {
          $oi = "\"" leg "\""
        }
      }
    }
  }
  print
}' "$CSV" > "$OUT"

echo "Valmis! Tiedosto luotu: $OUT"
