#!/bin/bash
# this code tries to create a file to map runners in navisport to AM competition ( sub competition) 
# currently 2025 reworked irma can't show this data and its database contains different values 
URL="https://www.suunnistavauusimaa.fi/yhteystiedot/"

# Hae sivu ja poimi seurat
curl -s "$URL" | \
# Poistetaan rivinvaihdot, jotta taulukko on yhtenä rivinä
tr '\n' ' ' | \
# Etsitään kaikki <tr>...</tr>
grep -oP '<tr>.*?</tr>' | \
# Käydään rivit läpi
while read -r tr; do
    # Poimi ensimmäinen ja toinen <td>
    nimi=$(echo "$tr" | grep -oP '(?<=<td>).*?(?=</td>)' | sed -n 1p)
    lyhenne=$(echo "$tr" | grep -oP '(?<=<td>).*?(?=</td>)' | sed -n 2p)
    # Jos lyhenne ei ole OK77, tulosta nimi
if [[ "$lyhenne" != "OK77" && "$nimi" != *"<strong>"* ]]; then
    echo "$nimi"
fi
done > am_seurat.txt
