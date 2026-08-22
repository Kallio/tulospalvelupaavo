# Tulospalvelupaavo — suunnistuksen ja seikkailu-urheilun työkaluvalikoima

[English](README.md) · **Suomi**

**Tulospalvelupaavo**
on kokoelma työkaluja — ikään kuin kasvava työkalupakki, joka laajentaa tulospalvelun, kuten [Navisport](#navisport), ominaisuuksia ja näkymiä tulospalvelun toteutukseen, streamaukseen sekä osallistujille. Osa työkaluista on täysimittaisia HTML-sovelluksia, toiset taas nopeita kertakäyttöscriptejä. Kaikki HTML-työkalut toimivat kokonaan selaimessa — ei asennuksia, ei palvelinta, ei tiliä: lataa tiedosto (tai avaa se suoraan) ja aloita.

---

## Mitä tarvitset?

| Tarvitsen... | Työkalu |
|---|---|
| Lähtönumeroita viivakoodeineen ja sponsorilogoineen | [Lähtönumerojen generaattori](#lähtönumerojen-generaattori) |
| Rastilippu-viestin ilmoittautumisen Navisport-alkulistaksi | [Rastilippu → Navisport -rinnakkaisosuuksien korjaaja](#rastilippu--navisport--rinnakkaisosuuksien-korjaaja) |
| Tasavahvat 25-manna-joukkueet juoksijapoolista | [25-manna joukkuesuunnittelu](#25-manna-joukkuesuunnittelu) |
| Tasavahvat Nuorten Jukola -joukkueet | [Nuorten Jukola -joukkuesuunnittelu](#nuorten-jukola--joukkuesuunnittelu) |
| Tasavahvat Halikko-viesti -joukkueet | [Halikko-viesti -joukkuesuunnittelu](#halikko-viesti--joukkuesuunnittelu) |
| SM-viesti-joukkueet (ikäsarjat + veteraanien ikäsummasäännöt) | [SM-viesti -joukkuesuunnittelu](#sm-viesti--joukkuesuunnittelu) |
| Ajantasaisen listan Suomen suunnistusseuroista | [IRMA-seurarekisterin hakija](#irma-seurarekisterin-hakija) |
| ...piirikartoituksineen | [IRMA-seurahaku piirikarttoineen](#irma-seurahaku-piirikarttoineen) |
| Purple Pen -radat IOF XML -muotoon | [Purple Pen → IOF -muunnin](#purple-pen--iof--muunnin) |
| Lasten kartat A4-arkeiksi painoon | [Map Merger](#map-merger) |
| Live-tulokset/väliajat streamiin (OBS/vMix) | [OBS-lähetysgrafiikat](#obs-lähetysgrafiikat) |
| Pisteseurannan moniosaiselle sarjalle | [Pokaalijahti WordPress -liitännäinen](#pokaalijahti-wordpress--liitännäinen) |
| Tulokset lehdistötiedotteeseen | [Lehdistötulokset](#lehdistötulokset) |
| Nähdä, miten kisa oikeasti sujui — ajat, vauhti, pullonkaulat | [Kilpailuanalyysi](#kilpailuanalyysi) |

## Päätyökalut

### Lähtönumerojen generaattori

Tiedosto: [`bibgenerator.html`](bibgenerator.html)

Tarvitsetko lähtönumerot viivakoodeineen, sponsorilogoineen ja väreillä
merkityin sarjoin ennen kisapäivää? Tuo CSV tai hae suoraan Navisportista,
raahaa asettelu kohdilleen ja tulosta.

<details>
<summary>Lisätiedot</summary>

Luo lähtönumeroita juoksu-, seikkailu- ja suunnistuskilpailuihin. Tuo CSV:n
(IRMA-muoto) tai lataa suoraan [Navisport](#navisport)-API:sta. Generoi yksittäisiä
numerolappuja viivakoodeineen, sponsorilogoineen, värikoodattuine luokkineen
ja täysin vedä-ja-pudota-konfiguroitavalla asettelulla (esim. A5 vaakasuunta).
Tukee viestiosuuksia, moniosaistapahtumia ja tarralistoja.

</details>

### Rastilippu → Navisport -rinnakkaisosuuksien korjaaja

Tiedosto: [`rastilippu_parallel_legs_to_navisport.html`](rastilippu_parallel_legs_to_navisport.html)

Viesti ilmoittautui Rastilipun kautta, mutta Navisport haluaa
osuuskohtaiset `Osuus`/`Alaosuus`-sarakkeet? Pudota ilmoittautumis-CSV sisään
ja saat Navisportin hyväksymän alkulistan.

<details>
<summary>Lisätiedot</summary>

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

</details>

### 25-manna joukkuesuunnittelu

Tiedosto: [`25manna_joukkuesuunnittelija.html`](25manna_joukkuesuunnittelija.html)

Jaatko satojen juoksijoiden poolia tasavahvoiksi 25-hengen joukkueiksi käsin
taulukkolaskennassa? Tämä tekee sen sekunneissa — säännöt sisäänrakennettuina
— ja tuloksen voi silti hienosäätää vedä-ja-pudota-tekniikalla.

<details>
<summary>Lisätiedot</summary>

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

</details>

### Nuorten Jukola -joukkuesuunnittelu

Tiedosto: [`nuorten_jukola_joukkuesuunnittelija.html`](nuorten_jukola_joukkuesuunnittelija.html)

Sama idea Nuorten Jukolalle: syötä juoksijapooli, saat takaisin niin monta
kelvollista 7-juoksijan joukkuetta kuin mahtuu, 2026-sääntöjen ikä-/
sukupuolirajoitukset jokaiselle osuudelle jo valmiina.

<details>
<summary>Lisätiedot</summary>

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

</details>

### Halikko-viesti -joukkuesuunnittelu

Tiedosto: [`halikkoviesti_joukkuesuunnittelija.html`](halikkoviesti_joukkuesuunnittelija.html)

Sama Halikko-viestille: jakaa juoksijasi automaattisesti Kilpasarja-joukkueisiin
(kiintiöineen) ja loput Avoin-joukkueisiin.

<details>
<summary>Lisätiedot</summary>

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

</details>

### SM-viesti -joukkuesuunnittelu

Tiedosto: [`sm_viesti_joukkuesuunnittelija.html`](sm_viesti_joukkuesuunnittelija.html)

Jaatko SM-viestin osallistujia joukkueisiin käsin? Syötä juoksijapooli, ja
työkalu muodostaa 3 hengen joukkueet ikäsarjoihin (H21/H20/H18/H16,
D21/D20/D18/D16) ja päättää veteraanisarjoissa automaattisesti, ketkä
juoksevat yhdessä *ja missä sarjassa* — koska veteraanisarja vaatii
vähimmäisikäsumman koko joukkueelle, ei vain vähimmäisikää juoksijaa kohti.

<details>
<summary>Lisätiedot</summary>

SM-viesti-joukkuesuunnittelija. Kolme osuutta läpi linjan. Kahdeksalla
ikäsarjalla (H21/D21 on avoin, ilman ikärajaa; H20/H18/H16 ja D-vastineet
nuoremmille) ei ole joukkuetason vaatimuksia — joukkueet muodostetaan suoraan
ilmoitetun sarjatunnisteen mukaan. Ainoa kaikkialla tarkistettava kova
ikäsääntö on liiton yleinen alaikäraja (kilpailuvuonna vähintään 14 v); tämä
näytetään ei-estävänä varoituksena, ei virheenä, koska nuorempien
osallistuminen muihinkin sarjoihin on sallittu erikoistapaus.

14 veteraanisarjaa (H35–H80, D35–D70) vaativat kukin sekä yksilön
vähimmäisiän että joukkueen ikäsumman (syntymävuoteen perustuen) — ja koska
vaikeampaan sarjaan kelpaava juoksija kelpaa aina myös kaikkiin helpompiin,
se missä sarjassa kolmikko lopulta juoksee on oikea valinta. Suunnittelija
ratkaisee tämän automaattisesti: se käsittelee vaikeimman sarjan ensin
(vanhin/suurin summavaatimus), yhdistäen kaksi nuorinta kelpaavaa juoksijaa
vanhimpaan saatavilla olevaan aina kun summa riittää, jotta iäkkäitä
juoksijoita ei "tuhlata" helpompiin sarjoihin ennen vaikeampien täyttämistä.
Tämä on heuristiikka, ei todistetusti globaalisti optimaalinen ratkaisu.

Muita ominaisuuksia: valinnainen "Pari"-tunniste, jolla kaksi aiemmin yhdessä
juossutta juoksijaa pyritään pitämään samassa joukkueessa; kolme erillistä
osuuskohtaista roolipistettä (aloitus/keski/loppu) yhden vahvuusluvun sijaan,
joilla päätetään kunkin joukkueen jäsenen osuus; vedä-ja-pudota-säätö, kipeän
juoksijan automaattinen korvaus (kohdejoukkueen ikäsummavaatimusta
kunnioittaen), juoksijakohtaiset joukkuetoiveet, [Navisport](#navisport)-alkulista-CSV-vienti,
JSON-tallennus/lataus `localStorage`-autotallennuksella sekä sisäänrakennettu
esimerkkipooli, joka kattaa molemmat sarjatyypit.

</details>

### IRMA-seurarekisterin hakija

Tiedosto: [`fetch_irma_clubs.bash`](fetch_irma_clubs.bash)

Tarvitsetko ajantasaisen listan kaikista Suomen suunnistusseuroista, vaikka
seuranimien normalisointiin omassa datassasi? Yksi komento, koko lista JSON:na.

<details>
<summary>Lisätiedot</summary>

Lataa julkisen seurarekisterin Suomen Suunnistusliiton IRMA-järjestelmästä
(`irma.suunnistusliitto.fi`). Tulostaa koko seuralistan JSON:na. Useat muut
työkalut käyttävät sitä seuranimien normalisointiin.

</details>

### IRMA-seurahaku piirikarttoineen

Tiedosto: [`fetch_irma_clubs_with_districts.py`](fetch_irma_clubs_with_districts.py)

Sama seuralista, mutta jokaisen seuran alue/piiri mukana — hyödyllinen
piirikohtaiseen suodatukseen ja raportointiin.

<details>
<summary>Lisätiedot</summary>

Laajentaa perusseuralistan alue (piiri) -kartoituksella IRMA:n
ClubEndpoint/viewClub-API:sta. Hakee kunkin seuran alueen ja tuottaa
[`clubs_with_districts.json`](clubs_with_districts.json) -tiedoston (myös
valmiiksi rakennettu tässä repossa). Tukee jatkamista — hakee vain seurat, jotka
puuttuvat olemassa olevasta tulostiedostosta. Tiedot on kerätty IRMA:n julkisesta
API:sta, mutta ne eivät ole virallinen liiton tieto; käyttö omalla vastuulla.

</details>

### Purple Pen → IOF -muunnin

Tiedosto: [`ppen_to_iof.html`](ppen_to_iof.html) (selain) · CLI: [`ppen_to_iof.py`](ppen_to_iof.py)

Suunnittelitko radat Purple Penillä, mutta tulospalvelu haluaa IOF 3.0
CourseData XML:n? Pudota `.ppen`-tiedosto(t) sisään, esikatsele radat ja
lataa XML — ei asennuksia.

<details>
<summary>Lisätiedot</summary>

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

</details>

### Map Merger

Hakemisto: [`map_merger/`](map_merger/) · avaa [`index.html`](map_merger/index.html)

Tulostatko lasten karttoja painoon? Lataa PDF:t/kuvat sisään ja saat
valmiiksi rajatut, aseteltut A4-arkit — muuta ei tarvitse säätää.

<details>
<summary>Lisätiedot</summary>

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
  reunamarginaali (oletus 5 mm — jokainen kartta skaalataan ja keskitetään
  kennonsa tulostusalueelle, jolloin saman arkin kartat vedetään yhteen arkin
  keskustaan eivätkä ulotu tulostumattomalle reunamarginaalille; mitään ei
  leikata pois paitsi 1:1-karttoja, jotka ovat fyysisesti tulostusaluetta
  suurempia), sisältötietoinen automaattikääntö (oletuksena päällä — kääntää
  kartan 90°,
  kun sen rajatun sisällön suunta on pystysuuntainen, jotta se täyttää
  vaaka-A5-arkin skaalaamisen sijaan; päätös perustuu sisällön suuntaan, ei
  sivun mittoihin, joten esim. pystyä sivua, jonka kartta on vaakasuuntainen,
  ei käännetä), alkuperäisen koon säilytys (1:1, sijoitetaan keskelle — arkkia
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
- Toistotila ruuduttaa **jokaisen** ladatun sivun 1:1-kopioina omalle
  A4-arkilleen parhaiten sopivaan ruudukkoon (esim. jokainen sivu 4 × A6 →
  yksi A4 per sivu) tavallisen kahden pinotun A5-kennon sijaan. Näin
  useamman kartan tapauksessa jokainen kartta saa oman toistoarkkinsa, ja
  arkin otsikko kertoo lähdekartan. Kopioiden määrä rajataan karttakohtaisesti
  niin, että jokainen kopio mahtuu arkille 1:1-koossa — esim. enintään
  2 A5-karttaa per A4 (kenttä rajaa määrän ja varoittaa).
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

</details>

### OBS-lähetysgrafiikat

Tiedosto: [`OBS_helper/`](OBS_helper/)

Striimaatko kisaa? Kytke tämä Navisportin live-dataan ja saat maaliintulot,
rastinohitukset ja alkulistat valmiina OBS/vMix-grafiikoina.

<details>
<summary>Lisätiedot</summary>

Työkaluja live-suunnistuslähetysten grafiikoihin OBS:ssä (Browser Source) ja
vMixissä (JSON-päätepisteet). Yhdistyy [Navisportin](#navisport) live Socket.IO-dataan ja
renderöi maaliintuloja, rastinohituksia ja alkulistoja. Sisältää
URL-generaattorin käyttöliittymän ja Python-vMix-palvelimen. Suunniteltu TV- ja
striimituotantoon.

</details>

### Pokaalijahti WordPress -liitännäinen

Tiedosto: [`pokaalijahti-wp-plugin/`](pokaalijahti-wp-plugin/)

Lasketko moniosaisen sarjan pisteitä käsin taulukossa? Tämä seuraa
pisteitä Navisport-tapahtumista automaattisesti ja näyttää tilanteen sivustollasi.

<details>
<summary>Lisätiedot</summary>

WordPress-liitännäinen ("Pokaalijahti" / Trophy Hunt) monitapahtumaisen
kilpailun pisteidenlaskentaan [Navisport](#navisport)-tapahtumista. Seuraa pisteitä useiden
tapahtumien välillä, näyttää pokaalitilanteen ja sisältää seuranimien
normalisoinnin. Erillinen versio ([`pokaalijahti.html`](pokaalijahti.html))
toimii myös ilman WordPressiä.

</details>

### Lehdistötulokset

Tiedosto: [`stopthelegacypress.html`](stopthelegacypress.html)

Tarvitsetko tulokset klassisessa sanomalehtiasussa lehdistötiedotteeseen?
Lataa ne Navisportista tai liitä JSON, ja saat suodatettavan,
tulostettavan, kopioitavan tuloksen.

<details>
<summary>Lisätiedot</summary>

Lehdistötulokset [Navisport](#navisport)-tapahtumille. Lataa dataa [Navisportin](#navisport) julkisen API:n
kautta tai liitetystä JSON:sta. Muodostaa luokittain suodatettavat, tulostettavat
tulosnäkymät perinteisessä sanomalehtityylisessä asussa alue (piiri) -suodatuksella.
Tukee pelkkänä tekstinä vientiä kopiointia varten julkaisujärjestelmiin. Lataa
seura→alue-kartoituksen tiedostosta [`clubs_with_districts.json`](clubs_with_districts.json).

</details>

### Kilpailuanalyysi

Tiedosto: [`kilpailuanalyysi.html`](kilpailuanalyysi.html)

Kiinnostaako, miten kisa oikeasti sujui — kuinka kauan ensimmäisestä
lähdöstä viimeiseen maaliintuloon, milloin maalilla oli ruuhkaisinta, miten
sarjat vertautuivat vauhdiltaan? Liitä Navisport-tapahtuman tunnus (slug) ja
saat heti valmiin analyysin ilman taulukkolaskentaa.

<details>
<summary>Lisätiedot</summary>

Kilpailun kulun analytiikkaa [Navisport](#navisport)-tapahtumille. Hakee tapahtuman
tunnuksella (slug), tukee myös viesti- ja moniosaistapahtumia (analysoidaan
osuuksittain), ja raportoi lähtijät, maaliintulleet, keskeyttäneet, ajan
ensimmäisestä lähdöstä viimeiseen lähtöön ("metsään"), ajan ensimmäiseen
tulokseen, ajan ensimmäisestä maaliintulosta viimeiseen sekä koko tapahtuman
keston, kunkin taustalla olevine lähtö-/maaliaikoineen. Näyttää
maaliintuloaikataulun sarjoittain (suhteellinen tai kellonaika, viesteille
joukkolähtö-/vaihto-/uusintalähtömerkinnöin ja korostetun ruuhkahuipun) sekä
sarjojen vauhtivertailun referenssivauhteja vasten; aikajanoja voi yhdistää
vertailua varten. Merkitsee todennäköisesti virheelliset tulokset (poistetut
tulokset, kilpailijat jotka näkyvät yhä radalla) erilliseen
varoituspaneeliin. Vie koko raportin CSV:ksi, tulostuu siististi, ja voi
luoda jaettavan linkin, joka lataa saman analyysin uudelleen. Käyttöliittymä
saatavilla suomeksi ja englanniksi.

</details>

## AM-työkalut (Suunnistava Uusimaa)

Nämä työkalut on suunnattu Uudenmaan piiriin ("AM" = AlueMestaruus / alueellinen
mestaruus). Ne auttavat yhdistämään seuratason tulokset erillisistä
[Navisport](#navisport)-vienneistä yhdistetyksi piirinäkymäksi, jossa on AM-osallistujien
merkinnät:

- **[`fetch_AM_seurat.sh`](fetch_AM_seurat.sh)** — Hakee Uudenmaan piirin seuralistan
  osoitteesta `suunnistavauusimaa.fi`
- **[`map_AM_status_to_navisport_csv_export.bash`](map_AM_status_to_navisport_csv_export.bash)** — Merkitsee
  Uusimaalaisten seurojen yksittäiset juoksijat `(AM)`-merkinnällä CSV-vienneissä;
  `-r` poistaa merkinnät, `-o` asettaa tulostiedoston nimen
- **[`map_relay_AM_status_to_navisport_csv_export.bash`](map_relay_AM_status_to_navisport_csv_export.bash)** — Sama
  viestitapahtumiin, merkitsee joukkuenimet; `-p` täyttää myös tuntemattomat juoksijat
  `N N`-paikkamerkinnöillä, `-r` poistaa ` (AM)`-merkinnät, `-o` asettaa tulostiedoston nimen
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
Update: käytettäessä onlinetulospalvelu.fi:n näkymää, hieman monimutkaisempi bookmarkletti hoitaa jokaisen sarakkeen otsikon mukaisen sorttauksen. 
```javascript
javascript:(function(){function pv(s){if(!s||typeof s!=='string')return{t:'x',v:''};s=s.trim().replace(/\u00a0/g,' ');if(!s)return{t:'x',v:''};var m=s.match(/^(\d+):(\d+):(\d+)/);if(m)return{t:'n',v:parseInt(m[0])*3600+parseInt(m[1])*60+parseInt(m[2])};m=s.match(/^(\d+):(\d+)[,.](\d+)/);if(m)return{t:'n',v:parseInt(m[1])*6000+parseInt(m[2])*100+parseInt((m[3]+'00').substring(0,2))};m=s.match(/^(\d+)[,.](\d+)/);if(m)return{t:'n',v:parseInt(m[1])*100+parseInt((m[2]+'00').substring(0,2))};var n=parseFloat(s.replace(',','.'));if(!isNaN(n))return{t:'n',v:n};return{t:'x',v:s};}function enableSorting(){var tables=document.querySelectorAll('table');tables.forEach(function(t){var rows=Array.from(t.querySelectorAll('tbody tr'));if(rows.length<1)return;var headers=t.querySelectorAll('thead th');if(headers.length<2)return;var state={};headers.forEach(function(h,idx){h.style.cursor='pointer';h.style.userSelect='none';var span=h.querySelector('.dt-column-order');if(!span){span=document.createElement('span');span.className='dt-column-order';h.appendChild(span);}span.textContent='';h.removeEventListener('click',h._sortHandler);h._sortHandler=function(e){e.preventDefault();e.stopPropagation();headers.forEach(function(hh,ii){if(ii!==idx){var s=hh.querySelector('.dt-column-order');if(s)s.textContent='';}});var asc=state[idx]!=='asc';state[idx]=asc?'asc':'desc';span.textContent=asc?' ↑':' ↓';var sorted=[...rows].sort(function(a,b){var va=pv(a.children[idx]?a.children[idx].textContent:null);var vb=pv(b.children[idx]?b.children[idx].textContent:null);if(va.t==='n'&&vb.t==='n')return asc?va.v-vb.v:vb.v-va.v;if(va.t==='n'&&vb.t==='x')return asc?-1:1;if(va.t==='x'&&vb.t==='n')return asc?1:-1;var cmp=va.v.localeCompare(vb.v,'fi');return asc?cmp:-cmp;});var tbody=t.querySelector('tbody');sorted.forEach(function(r){tbody.appendChild(r);});};h.addEventListener('click',h._sortHandler);});var msg=document.createElement('div');msg.textContent='✓ Lajittelu käytössä ('+headers.length+' sarakkeen yli)';msg.style.cssText='position:fixed;bottom:20px;right:20px;background:#1a1a2e;color:#0f0;padding:10px 16px;border-radius:6px;font:13px sans-serif;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.5)';document.body.appendChild(msg);setTimeout(function(){msg.style.transition='opacity .4s';msg.style.opacity='0';setTimeout(function(){msg.remove();},400);},2500);});};enableSorting();})();
```

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
