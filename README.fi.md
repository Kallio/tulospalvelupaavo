# Tulospalvelupaavo — suunnistuksen ja seikkailu-urheilun työkaluvalikoima

[English](README.md) · **Suomi**

**Tulospalvelupaavo**
on kokoelma työkaluja — ikään kuin kasvava työkalupakki, joka laajentaa tulospalvelun, kuten [Navisport](#navisport), ominaisuuksia ja näkymiä tulospalvelun toteutukseen, streamaukseen sekä osallistujille. Osa työkaluista on täysimittaisia HTML-sovelluksia, toiset taas nopeita kertakäyttöscriptejä. HTML-tiedostojen käyttö on helppoa. Lataa tiedosto koneellesi ja käytä paikallisesti.
---

## Päätyökalut

### Sisällysluettelo

- [Lähtönumerojen generaattori](#lähtönumerojen-generaattori)
- [Rastilippu → Navisport -rinnakkaisosuuksien korjaaja](#rastilippu--navisport--rinnakkaisosuuksien-korjaaja)
- [25-manna joukkuesuunnittelu](#25-manna-joukkuesuunnittelu)
- [Nuorten Jukola -joukkuesuunnittelu](#nuorten-jukola--joukkuesuunnittelu)
- [Halikko-viesti -joukkuesuunnittelu](#halikko-viesti--joukkuesuunnittelu)
- [IRMA-seurarekisterin hakija](#irma-seurarekisterin-hakija)
- [IRMA-seurahaku piirikarttoineen](#irma-seurahaku-piirikarttoineen)
- [Purple Pen → IOF -muunnin](#purple-pen--iof--muunnin)
- [Map Merger](#map-merger)
- [OBS-lähetysgrafiikat](#obs-lähetysgrafiikat)
- [Pokaalijahti WordPress -liitännäinen](#pokaalijahti-wordpress--liitännäinen)
- [Lehdistötulokset](#lehdistötulokset)

### Lähtönumerojen generaattori

Tiedosto: [`bibgenerator.html`](bibgenerator.html)

Luo lähtönumeroita juoksu-, seikkailu- ja suunnistuskilpailuihin. Tuo CSV:n
(IRMA-muoto) tai lataa suoraan [Navisport](#navisport)-API:sta. Generoi yksittäisiä
numerolappuja viivakoodeineen, sponsorilogoineen, värikoodattuine luokkineen
ja täysin vedä-ja-pudota-konfiguroitavalla asettelulla (esim. A5 vaakasuunta).
Tukee viestiosuuksia, moniosaistapahtumia ja tarralistoja.

### Rastilippu → Navisport -rinnakkaisosuuksien korjaaja

Tiedosto: [`rastilippu_parallel_legs_to_navisport.html`](rastilippu_parallel_legs_to_navisport.html)

Muuntaa Rastilippu-viestin ilmoittautumis-CSV:n [Navisportin](#navisport) alkulista-CSV:ksi,
jossa on osuuskohtaiset `Osuus`/`Alaosuus`-sarakkeet. Joukkeet kartoitetaan
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

### 25-manna joukkuesuunnittelu

Tiedosto: [`25manna_joukkuesuunnittelija.html`](25manna_joukkuesuunnittelija.html)

Lukee juoksijapoolin (`Sarja:Nimi`, valinnainen joukkuetoive kolmantena kenttänä,
esim. `D16:Virtanen Aino:1`) ja generoi niin monta kelvollista 25-juoksijan
joukkuetta kuin mahdollista, optimoiden vahvuusjakaumaa (joukkue 1 vahvin) ja
kunnioittaen joukkuetoiveita ("Toiveet ensin / Vahvuus ensin" -valitsin).
Joukkuetta voi säätää vedä-ja-pudota-tekniikalla; juoksijan merkitseminen
kipeäksi korvaa hänet automaattisesti varamiehillä tai toisesta joukkuesta.
Vie [Navisport](#navisport)-alkulista-CSV:n (rinnakkaiset osuudet
`Alaosuus`-alasinumeroina, yhteen sopien Rastilippu-muuntimen kanssa),
tulostusvalmiin PDF:n selaimen kautta sekä JSON-tallennuksen/latauksen
`localStorage`-autotallennuksella. Tukee 2026 25-manna-kelpoisuussääntöjä
(vain naisille -osuudet, rajatut ikä-/sukupuoliosuudet 3–10/23, ≥9 miestä ja
≥1 H≤16, ≥9 naista ja ≥1 D≤16, ≤8 H21).

### Nuorten Jukola -joukkuesuunnittelu

Tiedosto: [`nuorten_jukola_joukkuesuunnittelija.html`](nuorten_jukola_joukkuesuunnittelija.html)

Lukee juoksijapoolin (`Sarja:Nimi`, valinnainen joukkuetoive kolmantena kenttänä)
ja generoi niin monta kelvollista 7-juoksijan joukkuetta kuin mahtuu, optimoiden
vahvuusjakaumaa (joukkue 1 vahvin) ja kunnioittaen joukkuetoiveita. Vuoden 2026
Nuorten Jukola -profiili on sisäänrakennettu: 7 osuutta osuuskohtaisine
ikä-/sukupuolirajoituksineen (D16/H-D16 os. 1–2, H/D14 os. 3–5, D18/H-D18 os.
6–7; "s. 20XX–" tarkoittaa mainittuna tai sen jälkeen syntynyttä, joten
nuoremmat juoksijat kelpaavat vanhemmille osuuksille, ja os. 1/4/6 ovat vain
naisille). Tukee vedä-ja-pudota-säätöä, kipeän juoksijan automaattista
korvaamista (peräkkäisellä lainauksella myöhemmistä joukkueilta),
juoksijakohtaisia pisteitä ja joukkuetoiveita, [Navisport](#navisport)-alkulista-CSV-viennin
(7 lohkoa yhteen sopien Rastilippu-muuntimen kanssa), JSON-tallennuksen/latauksen
ja `localStorage`-autotallennuksen sekä sisäänrakennetut esimerkkipoolit
21/28/35 juoksijalle.

### Halikko-viesti -joukkuesuunnittelu

Tiedosto: [`halikkoviesti_joukkuesuunnittelija.html`](halikkoviesti_joukkuesuunnittelija.html)

Jakaa juoksijat automaattisesti mahdollisimman moneen kelvolliseen
**Kilpasarja**-joukkueeseen, muodostaen **Avoin**-joukkueita lopuista.
Halikko-viesti 2026 -säännöt on sisäänrakennettu: 15 juoksijaa joukkuetta kohti
(osuus 1 yksin, osuudet 2–5 kolminkertaiset, osuudet 14–15 yksin), Kilpasarja
vaatii ≥5 naista, osuuden 1 juoksijan (D / -H16 / H50-), osuuden 15 D-sarjalaisen
ja osuuksien 2–5 kiintiöt (2 D, 2 (-H18/H45-/D), 3 (-H15/H55-/-D18/D40-),
2 (-H13/H65-/-D15/D50-)); Avoin vaatii vain osuuden 1 rajoituksen. Tukee
vedä-ja-pudota-säätöä, kipeän juoksijan automaattista korvaamista,
juoksijakohtaisia pisteitä ja joukkuetoiveita, [Navisport](#navisport)-alkulista-CSV-viennin
(15 lohkoa `Osuus`/`Alaosuus`-sarakkein, yhteen sopien Rastilippu Halikko
-profiilin kanssa), JSON-tallennuksen/latauksen ja
`localStorage`-autotallennuksen sekä sisäänrakennetut esimerkkipoolit 45/60/75
juoksijalle.

### IRMA-seurarekisterin hakija

Tiedosto: [`fetch_irma_clubs.bash`](fetch_irma_clubs.bash)

Lataa julkisen seurarekisterin Suomen Suunnistusliiton IRMA-järjestelmästä
(`irma.suunnistusliitto.fi`). Tulostaa koko seuralistan JSON:na. Useat muut
työkalut käyttävät sitä seuranimien normalisointiin.

### IRMA-seurahaku piirikarttoineen

Tiedosto: [`fetch_irma_clubs_with_districts.py`](fetch_irma_clubs_with_districts.py)

Laajentaa perusseuralistan alue (piiri) -kartoituksella IRMA:n
ClubEndpoint/viewClub-API:sta. Hakee kunkin seuran alueen ja tuottaa
[`clubs_with_districts.json`](clubs_with_districts.json) -tiedoston (myös
valmiiksi rakennettu tässä repossa). Tukee jatkamista — hakee vain seurat, jotka
puuttuvat olemassa olevasta tulostiedostosta. Tiedot on kerätty IRMA:n julkisesta
API:sta, mutta ne eivät ole virallinen liiton tieto; käyttö omalla vastuulla.

### Purple Pen → IOF -muunnin

Tiedosto: [`ppen_to_iof.html`](ppen_to_iof.html) (selain) · CLI: [`ppen_to_iof.py`](ppen_to_iof.py)

Muuntaa Purple Pen (`.ppen`) -radansuunnittelutiedostot IOF 3.0 CourseData XML
-muotoon — rastien sijainnit, ratojen asettelut ja välimatkat.

HTML-työkalu toimii offline selaimessa: lataa yksi tai useampi `.ppen`-tiedosto
(useat tiedostot yhdistetään yhdeksi CourseData-XML:ksi print-alueiden
päällekkäisyyden mukaan), tarkastele ratoja SVG-esikatselussa (valinnainen
karttakuva) ja lataa XML. XML päivittyy automaattisesti kaikista muutoksista,
joten erillistä muunnospainiketta ei ole, ja asetus-, esikatselu- ja
latausvaiheet ovat piilossa kunnes tiedostoja on ladattu. Asetuksissa voi
määrittää tapahtuman nimen, kartan rajat ja XML:n `creator`-attribuutin. Symbolit skaalautuvat
print-alueen koon mukaan, käyttävät `fill="none"`-täyttöä ja print-alueiden
suorakulmiot on nimetty lähdetiedoston mukaan. Aluetta klikkaamalla se (ja sen
tiedoston radat) voidaan piilottaa esikatselusta; piilotettu alue jää näkyviin
haaleana katkoviivana, jota klikkaamalla se palautetaan. XML ei muutu
näkymävalinnoista. Tyhjennä-painike nollaa tiedostot ja asetukset alkuun, ja
FI/EN-painike vaihtaa käyttöliittymän kielen. Yksi sisäänrakennettu
demopainike lataa nimetön (obfuskoitu) "Nuorten kisa" -esimerkin ilman tiedostoja.
Python-CLI tuottaa identtisen tulosteen.

### Map Merger

Hakemisto: [`map_merger/`](map_merger/) · avaa [`index.html`](map_merger/index.html)

Yhdistää lasten suunnistuskarttojen PDF:t/kuvat painovalmiksi A4-arkeiksi
painolaitokselle (esim. Grano). Jokainen PDF-sivu tai kuva tulee yhdeksi
kartaksi; jokaiseen A4-sivuun (210×297 mm, ilman rakoja tai marginaaleja)
asetetaan kaksi karttaa (oletuksena skaalattu arkkisoluun, vaihtoehtoisesti
1:1-koossa).
Toimii täysin selaimessa pdf.js:n (kiinnitetty versioon 3.11.174) ja
pdf-lib:n avulla, ladattu CDN:ltä tavallisina skripteinä — ei rakennusvaihetta,
ja toimii myös suoraan levyltä avattuna (`file://`).

- Valkoisen tilan tunnistus poistaa ympäröivät marginaalit (pikselit, joissa
  R,G,B > 245, katsotaan taustaksi), ja tunnistettu rajausalue näkyy esikatselussa.
- Asetukset: automaattinen rajaus, leikkuuvara (mm), tulostumaton
  reunamarginaali (oletus 5 mm — se ei muuta asettelua eikä skaalausta, vaan
  leikkaa pois vain sen kartan osan, joka menee tulostimen reunan yli),
  pysty-sivujen kääntö 90° (jotta ne täyttävät vaaka-A5-arkin skaalaamisen
  sijaan), alkuperäisen koon säilytys (1:1, sijoitetaan keskelle — arkkia
  suuremmat kartat leikkaantuvat reunoista ja niistä varoitetaan) ja
  kuvakohtainen paperikokovalitsin (A5/A6/A7) jokaisella bittikarttasivulla —
  kuvan pisin sivu asetetaan valitun koon pidemmäksi sivuksi, jolloin fyysinen
  koko määräytyy ilman DPI-säätöä ja sen voi vaihtaa kuvalle uudelleen
  lataamatta. Esikatselu näyttää alkuperäisen, rajausalueen,
  tulostettavan alueen ja lopullisen A4-asettelun; tulostettava PDF luodaan
  selaimessa.
- Sivupalkki näyttää kunkin vaiheen vasta, kun sen edellytys on täyttynyt:
  "2. Asetukset" tulee näkyviin, kun tiedostoja on ladattu, ja "3. Yhteenveto"
  / "4. Lataa PDF" (sekä A4-arkkien esikatselu), kun sivuja on — kuten muissa
  tämän repon työkaluissa.
- Toistotila ruuduttaa yhden valitun (tai ensimmäisen) kartan 1:1-kopioina
  yhdelle A4-arkille parhaiten sopivaan ruudukkoon (esim. 4 × A6 → yksi A4)
  tavallisen kahden pinotun A5-kennon sijaan. Kopioiden määrä rajataan niin,
  että jokainen kopio mahtuu arkille 1:1-koossa — esim. enintään 2 A5-karttaa
  per A4 (kenttä rajaa määrän ja varoittaa).
- Easter egg: "duplex-valoläpäisy" lisää jokaisen A4-sivun perään vaakasuunnassa
  peilatun kopion, jolloin kaksipuolisesti tulostettuna takapuoli kohdistuu
  etusivun kanssa valoa vasten katsottaessa (esim. rastit toisella puolella,
  reitinviivat toisella). Soveltuu lyhytsärmä/vasemmalle kääntyvään
  duplex-sidontaan. Lapsille on tarjolla "tulosta vain peilatut sivut" -versio.

  Peilausasetukset ovat oletuksena piilossa (asetuspaneeli pysyy siistinä).
  Ne voi paljastaa joko avaamalla sivun `?easteregg=1` -parametrilla (esim.
  `index.html?easteregg=1`) tai klikkaamalla "2. Asetukset" -otsikkoa viisi
  kertaa nopeasti (sama viiden klikkauksen sarja piilottaa ne uudelleen).
  Valintaa ei säilytetä — asetukset ovat seuraavalla latauksella taas piilossa.

### OBS-lähetysgrafiikat

Tiedosto: [`OBS_helper/`](OBS_helper/)

Työkaluja live-suunnistuslähetysten grafiikoihin OBS:ssä (Browser Source) ja
vMixissä (JSON-päätepisteet). Yhdistyy [Navisportin](#navisport) live Socket.IO-dataan ja
renderöi maaliintuloja, rastinohituksia ja alkulistoja. Sisältää
URL-generaattorin käyttöliittymän ja Python-vMix-palvelimen. Suunniteltu TV- ja
striimituotantoon.

### Pokaalijahti WordPress -liitännäinen

Tiedosto: [`pokaalijahti-wp-plugin/`](pokaalijahti-wp-plugin/)

WordPress-liitännäinen ("Pokaalijahti" / Trophy Hunt) monitapahtumaisen
kilpailun pisteidenlaskentaan [Navisport](#navisport)-tapahtumista. Seuraa pisteitä useiden
tapahtumien välillä, näyttää pokaalitilanteen ja sisältää seuranimien
normalisoinnin. Erillinen versio ([`pokaalijahti.html`](pokaalijahti.html))
toimii myös ilman WordPressiä.

### Lehdistötulokset

Tiedosto: [`stopthelegacypress.html`](stopthelegacypress.html)

Lehdistötulokset [Navisport](#navisport)-tapahtumille. Lataa dataa [Navisportin](#navisport) julkisen API:n
kautta tai liitetystä JSON:sta. Muodostaa luokittain suodatettavat, tulostettavat
tulosnäkymät perinteisessä sanomalehtityylisessä asussa alue (piiri) -suodatuksella.
Tukee pelkkänä tekstinä vientiä kopiointia varten julkaisujärjestelmiin. Lataa
seura→alue-kartoituksen tiedostosta [`clubs_with_districts.json`](clubs_with_districts.json).

## AM-työkalut (Suunnistava Uusimaa)

Nämä työkalut on suunnattu Uudenmaan piiriin ("AM" = AlueMestaruus / alueellinen
mestaruus). Ne auttavat yhdistämään seuratason tulokset erillisistä
[Navisport](#navisport)-vienneistä yhdistetyksi piirinäkymäksi, jossa on AM-osallistujien
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
| [`seuroittain.html`](seuroittain.html) | Lähtölistan selausnäkymä seuroittain, live-kelloilla ja CSV-viennillä |
| [`lahtoaikasort.js`](lahtoaikasort.js) | Bookmarklet työkalu, vanhan Pirilä-pohjaisten Lähtölistan taulukoiden lajitteluun lähtöajan mukaan ([asenna](#lahtoaikasortjs-kirjanmerkki)) |
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

Käyttö: navigoi vanhalle Pirilä-tyyliselle lähtölistasivulle ja klikkaa kirjanmerkkiä — taulukot järjestyvät lähtöajan mukaan.

## Linkit

| Palvelu | URL | Tarkoitus |
|---------|-----|---------|
| **Navisport** <a id="navisport"></a> | [navisport.com](https://navisport.com) | Navisport tulospalvelu on suomalainen urheilutapahtumien ja kilpailujen hallintajärjestelmä, joka tarjoaa monipuolisia ratkaisuja tulospalveluun ja kilpailujen järjestämiseen. Tukee EMIT-, SportIdent-, Learnjoy- ja Huichang-sirujärjestelmiä (kaikki IOF:n hyväksymiä) |
| **IOF Electronic Punching** | [orienteering.sport/iof/it/electronic-punching](https://orienteering.sport/iof/it/electronic-punching/) | IOF:n hyväksymät elektroniset rastileimausjärjestelmät |
| **OBS** | [obsproject.com](https://obsproject.com) | Live-striimaus- ja lähetysohjelmisto |
| **IRMA** | [irma.suunnistusliitto.fi](https://irma.suunnistusliitto.fi) | Suomen Suunnistusliiton virallinen suunnistusportaali — kilpailut, ilmoittautumiset ja kuntorastit |
| **Suunnistava Uusimaa** | [suunnistavauusimaa.fi](https://suunnistavauusimaa.fi) | Uudenmaan piirin suunnistus |
| **Purple Pen** | [purplepen.com](https://purplepen.com) | Radansuunnitteluohjelmisto (.ppen) |
| **Suunnistusliitto** | [suunnistusliitto.fi](https://suunnistusliitto.fi) | Suomen Suunnistusliitto |

---

## 🛠 Miksi nimi "Tulospalvelupaavo"?

Jokaisessa kisaorganisaatiossa on se tietty "Joku" — luottotyyppi, jonka pakista löytyy aina sopiva työkalu, kaapeli tai kikka yllättävään haasteeseen. **Tulospalvelupaavo** on tämän luottotyypin digitaalinen vastine: joustava työkalupakki, joka tuo nopeasti uusia näkymiä ja toimintavarmuutta tulospalveluun, striimaukseen ja kisaympäristöön.

Nimi toimii myös laitteisto- ja ohjelmistohenkisenä akronyyminä:

* **P**aikallinen
* **A**pujärjestelmä
* **A**joitukseen,
* **V**iestintään ja
* **O**ptimointiin

## Lisenssi

MIT — katso [LICENSE](LICENSE).
