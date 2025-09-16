#!/bin/bash
# this code tries to create a file to map runners in navisport to AM competition ( sub competition) 
# currently 2025 reworked irma can't show this data and its database contains different values 
# If -f json given, lets try to output  JSON to stdout, othervice just create file am_seurat.txt.

URL="https://www.suunnistavauusimaa.fi/yhteystiedot/"

# -------------------------------------------------
# Funktio: kerää kaikki kelvolliset nimet taulukkoon
# -------------------------------------------------
collect_entries() {
    local -a entries=()
    while IFS= read -r tr; do
        # poimitaan ensimmäinen ja toinen <td>
        nimi=$(printf '%s' "$tr" |
               grep -oP '(?<=<td>).*?(?=</td>)' | sed -n 1p)
        lyhenne=$(printf '%s' "$tr" |
                  grep -oP '(?<=<td>).*?(?=</td>)' | sed -n 2p)

        # suodatetaan pois OK77‑lyhenne ja <strong>-merkinnät
        if [[ "$lyhenne" != "OK77" && "$nimi" != *"<strong>"* ]]; then
            entries+=("$nimi")
        fi
    done < <(
        curl -s "$URL" |
        tr '\n' ' ' |
        grep -oP '<tr>.*?</tr>'
    )
    printf '%s\n' "${entries[@]}"
}

# -------------------------------------------------
# JSON‑tulostus, jos argumentti on "-f json"
# -------------------------------------------------
if [[ "$1" == "-f" && "$2" == "json" ]]; then
    # Kerätään nimet taulukkoon
    IFS=$'\n' read -r -d '' -a names < <(collect_entries && printf '\0')

    # Rakennetaan JSON‑array
    json='['
    for i in "${!names[@]}"; do
        # Escape‑merkit \ ja "
        esc=$(printf '%s' "${names[i]}" |
              sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')
        json+='"'"$esc"'"'
        (( i < ${#names[@]}-1 )) && json+=', '
    done
    json+=']'

    echo "$json"
else
    # Tavallinen teksti‑tulostus tiedostoon
    collect_entries > am_seurat.txt
fi
