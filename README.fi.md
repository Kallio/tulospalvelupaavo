# Tulospalvelupaavo — suunnistuksen ja seikkailu-urheilun työkaluvalikoima

[English](README.md) · **Suomi**

**Tulospalvelupaavo** Tulospalvelupaavo on kokoelma työkaluja – ikään kuin kasvava työkalupakki, joka laajentaa tulospalvelun, kuten Navisport, ominaisuuksia ja näkymiä tulospalvelun toteutukseen, streamaukseen sekä osallistujille. Osa työkaluista on täysimittaisia HTML‑sovelluksia, toiset taas nopeita kertakäyttöscriptejä.
---

## Päätyökalut

### [`stopthelegacypress.html`](stopthelegacypress.html)
Tulostulostin Navisport-tapahtumille. Lataa dataa Navisportin julkisen API:n kautta
tai liitetystä JSON:sta ja renderöi luokittain suodatettavat, tulostettavat tulokset
perinteisessä sanomalehtityylisessä asussa alue (piiri) -suodatuksella. Tukee
pelkkänä tekstinä vientiä kopiointia varten julkaisujärjestelmiin. Lataa
seura→alue-kartoituksen tiedostosta
[`clubs_with_districts.json`](clubs_with_districts.json).

### [`bibgenerator.html`](bibgenerator.html)
Numerokorttien generaattori juoksu-, seikkailu- ja suunnistuskilpailuihin. Tuo
CSV:n (ESP/IRMA-muoto) tai lataa Navisport-API:sta. Generoi yksittäisiä
kilpailijakortteja viivakoodeineen, sponsorilogoineen, värikoodattuine luokkineen
ja täysin vedä-ja-pudota-konfiguroitavalla asettelulla (A5 vaakasuunta). Tukee
viestiosuuksia, moniosaistapahtumia ja tarralistoja.

### [`rastilippu_parallel_legs_to_navisport.html`](rastilippu_parallel_legs_to_navisport.html)
Muuntaa Rastilippu-viestin ilmoittautumis-CSV:n Navisport-alkulista-CSV:ksi, jossa
on osuuskohtaiset `Osuus`/`Alaosuus`-sarakkeet. Joukkuetta kartoitetaan
konfiguroitaviin osuusprofiileihin (esim. Kompassi-viesti 3-osuuksinen,
Halikko-viesti 7-osuuksinen): ensimmäinen juoksija → osuus 1, viimeinen juoksija →
viimeinen osuus, keskimmäiset täyttävät vasemmalta oikealle. Avoimet sarjat
sallivat vain 3 nimeä. Profiilikohtaiset kilpailunumerosarjat ovat tuettuja
(tyhjä = ei numeroita); päällekkäiset numerosarjat profiilien välillä estävät
tallennuksen.

**Piilotetut URL-parametrit (edistyneet käyttäjät):**
- `?teams=N` — luo satunnaisen esimerkin N joukkueella ja lataa sen auki
  (esimerkkinimet otetaan sisäänrakennetuista varannoista, sukunimi ensin).
- `?ex=halikko` — käytä Halikko-viesti-profiilia oletus Kompassi-profiilin
  sijaan (toimii `?teams=`-parametrin kanssa, käyttää profiilia).
- `?seed=123` — kiinteä satunnaissiemen, jotta luotu esimerkki on toistettavissa.

Esimerkki: `rastilippu_parallel_legs_to_navisport.html?teams=40&ex=halikko&seed=123`

### [`25manna_joukkuesuunnittelija.html`](25manna_joukkuesuunnittelija.html)
25-manna-joukkuesuunnittelija. Lukee juoksijapoolin (`Sarja:Nimi`, valinnainen
joukkuetoive kolmantena kenttänä, esim. `D16:Virtanen Aino:1`) ja generoi niin
monta kelvollista 25-juoksijan joukkuetta kuin mahtuu, optimoiden
vahvuusjakaumaa (joukkue 1 vahvin) ja kunnioittaen joukkuetoiveita
("Toiveet ensin / Vahvuus ensin" -valitsin). Joukkueilta voi säätää
vedä-ja-pudota-tekniikalla; juoksijan merkitseminen kipeäksi korvaa hänet
automaattisesti varamiehillä tai toisesta joukkuesta. Vie Navisport-alkulista-CSV:n
(rinnakkaiset osuudet `Alaosuus`-alasinumeroina, yhteen sopien Rastilippu-muuntimen
kanssa), tulostusvalmiin PDF:n selaimen kautta sekä JSON-tallennuksen/latauksen
`localStorage`-autotallennuksella. 25-manna-kelpoisuussäännöt (vain naisille
-osuudet, rajatut ikä-/sukupuoliosuudet 3–10/23, ≥9 miestä ja ≥1 H≤16, ≥9 naista
ja ≥1 D≤16, ≤8 H21) on sisäänrakennettu.

### [`nuorten_jukola_joukkuesuunnittelija.html`](nuorten_jukola_joukkuesuunnittelija.html)
Nuorten Jukola -joukkuesuunnittelija. Lukee juoksijapoolin (`Sarja:Nimi`,
valinnainen joukkuetoive kolmantena kenttänä) ja generoi niin monta kelvollista
7-juoksijan joukkuetta kuin mahtuu, optimoiden vahvuusjakaumaa (joukkue 1 vahvin)
ja kunnioittaen joukkuetoiveita. Vuoden 2026 Nuorten Jukola -profiili on
sisäänrakennettu: 7 osuutta osuuskohtaisine ikä-/sukupuolirajoituksineen
(D16/H-D16 os. 1–2, H/D14 os. 3–5, D18/H-D18 os. 6–7; "s. 20XX–" tarkoittaa
mainittuna tai sen jälkeen syntynyttä, joten nuoremmat juoksijat kelpaavat
vanhemmille osuuksille, ja os. 1/4/6 ovat vain naisille). Tukee
vedä-ja-pudota-säätöä, kipeän juoksijan automaattista korvaamista (peräkkäisellä
lainauksella myöhemmistä joukkueilta), juoksijakohtaisia pisteitä ja
joukkuetoiveita, Navisport-alkulista-CSV-vientiä (7 lohkoa yhteen sopien
Rastilippu-muuntimen kanssa), JSON-tallennusta/latausta ja
`localStorage`-autotallennusta sekä sisäänrakennettuja esimerkkipooleja
21/28/35 juoksijalle.

### [`halikkoviesti_joukkuesuunnittelija.html`](halikkoviesti_joukkuesuunnittelija.html)
Halikko-viesti-joukkuesuunnittelija. Lukee juoksijapoolin (`Sarja:Nimi`, valinnainen
joukkuetoive kolmantena kenttänä) ja jakaa juoksijat automaattisesti mahdollisimman
moneen kelvolliseen **Kilpasarja**-joukkueeseen, muodostaen **Avoin**-joukkueita
lopuista. Halikko-viesti 2026 -säännöt on sisäänrakennettu: 15 juoksijaa joukkuetta
kohti (osuus 1 yksin, osuudet 2–5 kolminkertaiset, osuudet 14–15 yksin),
Kilpasarja vaatii ≥5 naista, osuuden 1 juoksijan (D / -H16 / H50-), osuuden 15
D-sarjalaisen ja osuuksien 2–5 kiintiöt (2 D, 2 (-H18/H45-/D), 3 (-H15/H55-/D18/D40-),
2 (-H13/H65-/-D15/D50-)); Avoin vaatii vain osuuden 1 rajoituksen. Tukee
vedä-ja-pudota-säätöä, kipeän juoksijan automaattista korvaamista,
juoksijakohtaisia pisteitä ja joukkuetoiveita, Navisport-alkulista-CSV-vientiä
(15 lohkoa `Osuus`/`Alaosuus`-sarakkein, yhteen sopien Rastilippu Halikko -profiilin
kanssa), JSON-tallennusta/latausta ja `localStorage`-autotallennusta sekä
sisäänrakennettuja esimerkkipooleja 45/60/75 juoksijalle.

### [`fetch_irma_clubs.bash`](fetch_irma_clubs.bash)
Lataa julkisen seurarekisterin Suomen Suunnistusliiton IRMA-järjestelmästä
(`irma.suunnistusliitto.fi`). Tulostaa koko seuralistan JSON:na. Useat muut
työkalut käyttävät sitä seuranimien normalisointiin.

### [`fetch_irma_clubs_with_districts.py`](fetch_irma_clubs_with_districts.py)
Laajentaa perusseuralistan alue (piiri) -kartoituksella IRMA:n
ClubEndpoint/viewClub-API:sta. Hakee kunkin seuran alueen ja tuottaa
[`clubs_with_districts.json`](clubs_with_districts.json) -tiedoston (myös
valmiiksi rakennettu tässä repossa). Tukee jatkamista — hakee vain seurat, jotka
puuttuvat olemassa olevasta tulostiedostosta. Tiedot on kerätty IRMA:n julkisesta
API:sta, mutta ne eivät ole virallinen IRMA-vienti; käytä omalla vastuulla.

### [`ppen_to_iof.py`](ppen_to_iof.py)
Muuntaa Purple Pen (`.ppen`) -radansuunnittelutiedostot IOF 3.0 CourseData XML
-muotoon — rastien sijainnit, ratojen asettelut ja välimatkat.

### [`OBS_helper/`](OBS_helper/)
Työkaluja live-suunnistuslähetysten grafiikoihin OBS:ssä (Browser Source) ja
vMixissä (JSON-päätepisteet). Yhdistyy Navisportin live Socket.IO-dataan ja
renderöi maaliintuloja, rastinohituksia ja alkulistoja. Sisältää
URL-generaattorin käyttöliittymän ja Python-vMix-palvelimen. Suunniteltu TV- ja
striimituotantoon.

### [`pokaalijahti-wp-plugin/`](pokaalijahti-wp-plugin/)
WordPress-liitännäinen ("Pokaalijahti" / Trophy Hunt) monitapahtumaisen
kilpailun pisteidenlaskentaan Navisport-tapahtumista. Seuraa pisteitä useiden
tapahtumien välillä, näyttää pokaalitilanteen ja sisältää seuranimien
normalisoinnin. Erillinen versio ([`pokaalijahti.html`](pokaalijahti.html))
toimii myös ilman WordPressiä.

## AM-työkalut (Suunnistava Uusimaa)

Nämä työkalut on suunnattu Uudenmaan piiriin ("AM" = AlueMestaruus / alueellinen
mestaruus). Ne auttavat yhdistämään seuratason tulokset erillisistä
Navisport-vienneistä yhdistetyksi piirinäkymäksi, jossa on AM-osallistujien
merkinnät:

- **[`fetch_AM_seurat.sh`](fetch_AM_seurat.sh)** — Hakee Uudenmaan piirin seuralistan
  osoitteesta `suunnistavauusimaa.fi`
- **[`map_AM_status_to_navisport_csv_export.bash`](map_AM_status_to_navisport_csv_export.bash)** — Merkitsee
  Uusimaalaisten seurojen yksittäiset juoksijat `(AM)`-merkinnällä CSV-vienneissä
- **[`map_relay_AM_status_to_navisport_csv_export.bash`](map_relay_AM_status_to_navisport_csv_export.bash)** — Sama
  viestitapahtumiin, merkitsee joukkuenimet
- **[`top_filtering_from_results.html`](top_filtering_from_results.html)** — Tulosten
  koosteselausnäkymä, jossa on vain-AM-suodatus ja seuran korostus

## Muut

| Tiedosto | Tarkoitus |
|------|---------|
| [`seuroittain.html`](seuroittain.html) | Alkulistan selausnäkymä seuroittain, live-kelloilla ja CSV-viennillä |
| [`lahtoaikasort.js`](lahtoaikasort.js) | Kirjanmerkki vanhan Pirilä-tyylisen alkulistan taulukoiden lajitteluun kellonajan mukaan ([asenna](#lahtoaikasortjs-kirjanmerkki)) |
| [`fetch_seikkailusprintti_teams.py`](fetch_seikkailusprintti_teams.py) | Kaapii joukkuetiedot seikkailusprintti.comista CSV:ksi bibgeneratoria varten |
| [`clubs_with_districts.json`](clubs_with_districts.json) | Valmiiksi rakennettu seura→alue-kartoitus (322 seuraa, 14 piiriä). Tuottaa [`fetch_irma_clubs_with_districts.py`](fetch_irma_clubs_with_districts.py) |

## Kirjanmerkit

### lahtoaikasort.js -kirjanmerkki

1. Kopioi alla oleva koodi
2. Luo uusi kirjanmerkki selaimeesi (nimeksi esim. `Aikajärjestys`)
3. Muokkaa kirjanmerkkiä ja liitä koodi URL-osoite-kenttään

```javascript
javascript:(function(){function sortTableByTime(){const tables=document.querySelectorAll("table");tables.forEach(table=>{const rows=Array.from(table.querySelectorAll("tr"));rows.sort((a,b)=>{const timeA=a.cells[1]?.textContent.trim();const timeB=b.cells[1]?.textContent.trim();return parseTime(timeA)-parseTime(timeB);});const parent=table.tBodies[0]||table;rows.forEach(row=>parent.appendChild(row));});}function parseTime(time){if(!time)return Infinity;const cleaned=time.replace(/[^\d.]/g,"");const parts=cleaned.split(".");if(parts.length!==2)return Infinity;const hours=parseInt(parts[0],10);const minutes=parseInt(parts[1],10);return hours*60+minutes;}sortTableByTime();})();
```

Käyttö: navigoi vanhan Pirilä-tyyliselle lähtölistasivulle ja klikkaa kirjanmerkkiä — taulukot järjestyvät kellonajan mukaan.

## Linkit

| Palvelu | URL | Tarkoitus |
|---------|-----|---------|
| **Navisport** | [navisport.com](https://navisport.com) | Navisport tulospalvelu on suomalainen urheilutapahtumien ja kilpailujen hallintajärjestelmä, joka tarjoaa monipuolisia ratkaisuja tulospalveluun ja kilpailujen järjestämiseen |
| **OBS** | [obsproject.com](https://obsproject.com) | Live-striimaus- ja lähetysohjelmisto |
| **IRMA** | [irma.suunnistusliitto.fi](https://irma.suunnistusliitto.fi) | Suomen Suunnistusliiton virallinen suunnistusportaali — kilpailut, ilmoittautumiset ja kuntorastit |
| **Suunnistava Uusimaa** | [suunnistavauusimaa.fi](https://suunnistavauusimaa.fi) | Uudenmaan piirin suunnistus |
| **Purple Pen** | [purplepen.com](https://purplepen.com) | Radansuunnitteluohjelmisto (.ppen) |
| **Suunnistusliitto** | [suunnistusliitto.fi](https://suunnistusliitto.fi) | Suomen Suunnistusliitto |

## Lisenssi

MIT — katso [LICENSE](LICENSE).
