/* app.js
   Muokattu versio, joka käyttää WordPressin AJAX-proxyä (PokaaliAjax.ajaxUrl / nonce).
   Liitä tämä tiedosto pluginin js/app.js -polkuun.
*/

const OPEN_KEYWORDS = ['avoin','open'];
const MIN_POINTS_FOR_DNF = 10;
const WINNER_POINTS = 100;
const TOP_N_SCORES_TO_SUM = 3;

const ALLOWED_SERIES = [
  'D8RR','H8RR','D10RR','H10RR','D10','H10','D12TR','H12TR','D12','H12','D14','H14','D16','H16',
  'RR Avoin','TR Avoin','10 Avoin','12 Avoin','14 Avoin','16 Avoin'
];

const ALLOWED_CLUBS = ['EsSu','Espoon Suunta'];

function normalizeSeriesName(name){
  if(!name) return '';
  return name.replace(/\s+/g,'')
             .replace(/$.*?$/g,'')
             .toLowerCase()
             .trim();
}

function isClubAllowed(club){
  if(typeof noClubLimit !== 'undefined' && noClubLimit) return true;
  if(ALLOWED_CLUBS==='all') return true;
  if(!club || !club.trim()) club='EsSu';
  return ALLOWED_CLUBS.includes(club.trim());
}

function isSeriesAllowed(series){
  if(typeof noSeriesLimit !== 'undefined' && noSeriesLimit) return true;
  if(!SERIES_FILTER_LIST) return true;
  const norm = normalizeSeriesName(series);
  return SERIES_FILTER_LIST.some(s=>normalizeSeriesName(s)===norm);
}

function normalizeName(name){
  if(!name) return '';
  const cleaned = String(name)
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return cleaned;
}

function isOpenSeries(seriesName){
  if(!seriesName) return false;
  const s = seriesName.toLowerCase();
  return OPEN_KEYWORDS.some(k => s.includes(k));
}

function escapeHtml(s){ return (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// --- Lue konfiguraatio ---
const rootEl = document.getElementById('pokaali-app');
let cfg = { eventids: '', noclublimit: '0', noserieslimit: '0', series: '', notrophy:'' };
if (rootEl && rootEl.dataset && rootEl.dataset.config) {
  try { cfg = JSON.parse(rootEl.dataset.config); } catch(e){ /* ignore invalid JSON */ }
}
const urlParams = new URLSearchParams(window.location.search);
const urlEventIds = (urlParams.get('eventid') || '').trim();
const rawEventIds = urlEventIds || (cfg.eventids || '');
const eventIds = (rawEventIds || '').toString().split(',').map(s=>s.trim()).filter(Boolean);

const noClubLimit = urlParams.has('noclublimit') ? true : (cfg.noclublimit === '1');
const noSeriesLimit = urlParams.has('noserieslimit') ? true : (cfg.noserieslimit === '1');
const noTrophy = urlParams.has('notrophy')? true : (cfg.notrophy === '1');

const rawSeries = urlParams.get('series') || cfg.series || '';
const SERIES_FILTER_LIST = rawSeries ? rawSeries.split(',').map(s=>s.trim()).filter(Boolean) : null;

// --- Time parsing ---
function parseTimeToSeconds(t){
  if(t===null || t===undefined) return null;
  if(typeof t==='number') return t;
  const str = String(t).trim();
  if(!str) return null;
  if(/^0+$/.test(str) || /^0+:0+(:0+)?$/.test(str)) return 0; // erityinen 0-tapaus
  if(/^P/i.test(str) && /S$/i.test(str)){
    const m = str.match(/PT(\d+(?:\.\d+)?)S/i);
    if(m) return parseFloat(m[1]);
  }
  const parts = str.split(':').map(x=>x.trim());
  if(parts.length===1){
    const n = Number(parts[0].replace(',','.'));
    return isNaN(n)?null:n;
  }
  let seconds = 0;
  if(parts.length===2) seconds = Number(parts[0])*60+Number(parts[1]);
  else if(parts.length===3) seconds = Number(parts[0])*3600+Number(parts[1])*60+Number(parts[2]);
  else return null;
  return isNaN(seconds)?null:seconds;
}

function secondsToMinRounded(secs){
  const mins = secs/60;
  return Math.round(mins);
}

// --- Scoring ---
function scoreEvent(event){
  const participants = (event.participants||[]).map(p=>({...p}));
  const bySeries = {};

  participants.forEach(p=>{
    const series = p.series || '---';
    if(!isSeriesAllowed(series)) return;
    if(!isClubAllowed(p.club)) return;
    if(!bySeries[series]) bySeries[series]=[];

    p._timeSecs = parseTimeToSeconds(p.time);
    p._status = (p.status||'').toLowerCase();
    const isDnsStatus = p._status.includes('dns') || p._status.includes('registered');
    const isDisq = ['dnf','keskeytti','hylätty','disq','dsq'].some(x=>p._status.includes(x));
    p._ok = !isDisq && p._timeSecs !== null;
    p._validParticipation = !isDnsStatus && !isDisq && p._timeSecs !== null;

    bySeries[series].push(p);
  });

  const results = [];
  for(const series in bySeries){
    const list = bySeries[series];
    const open = isOpenSeries(series);

    const validRunners = list.filter(p => p._ok && p._timeSecs !== 0);
    const ranked = validRunners.sort((a,b)=>a._timeSecs-b._timeSecs);
    const winnerTime = ranked.length ? ranked[0]._timeSecs : null;

    list.forEach(p=>{
      if(open) {
        p._points = 0;
      } else if(!p._ok || p._timeSecs === null) {
        p._points = MIN_POINTS_FOR_DNF;
      } else if(p._timeSecs === 0) {
        p._points = MIN_POINTS_FOR_DNF;
      } else {
        p._points = winnerTime===null ? 0 : Math.max(0, WINNER_POINTS - secondsToMinRounded(Math.max(0,p._timeSecs - winnerTime)));
      }
    });

    results.push({series, open, list});
  }
  return results;
}

function calculateTotals(events){
  const athletes = {};

  events.forEach(ev=>{
    const perSeries = scoreEvent(ev);
    perSeries.forEach(sobj=>{
      sobj.list.forEach(p=>{
        const key = normalizeName(p.name);
        if(!athletes[key]){
          athletes[key] = {id:p.id,name:p.name,clubs:new Set(),results:[]};
        }

        const clubName = p.club && p.club.trim() ? p.club.trim() : 'EsSu';
        athletes[key].clubs.add(clubName);

        athletes[key].results.push({
          eventName: ev.name,
          eventId: ev.id,
          date: ev.date,
          series: sobj.series,
          time: p.time,
          status: p._ok ? 'OK' : 'HYL',
          points: p._points,
          validParticipation: p._validParticipation,
          eventUrl: p.eventUrl
        });
      });
    });
  });

  return Object.values(athletes)
    .map(a=>{
      const validResults = a.results.filter(r => r.validParticipation);
      const pointsList = a.results.filter(r=>r.points!==undefined && r.points!==null).map(r=>r.points).sort((a,b)=>b-a);
      const eventsWithValid = new Set(validResults.map(r => `${r.eventName}||${r.date}`));
      const participationCount = eventsWithValid.size;
      const topSum = pointsList.slice(0,TOP_N_SCORES_TO_SUM).reduce((s,x)=>s+x,0);
      const club = Array.from(a.clubs).join('/');
      return {...a,pointsList,topSum,participationCount,club};
    })
    .filter(a => a.participationCount > 0);
}

// --- Rendering ---
function renderSeriesLinks(seriesList){
  const container = document.getElementById('seriesLinks');
  container.innerHTML = 'Siirry sarjaan: ';
  seriesList.forEach(series=>{
    const a = document.createElement('a');
    a.href = `#series-${series.replace(/\s+/g,'_')}`;
    a.textContent = series;
    container.appendChild(a);
  });
}

let currentTotals = [];

function renderTableBySeries(totals){
  currentTotals = totals;
  const out = document.getElementById('output');
  out.innerHTML = '';

  if(!noTrophy){
    const trophyList = totals.filter(t=>t.participationCount>=3);
    if(trophyList.length){
      const div = document.createElement('div');
      div.innerHTML = `<h2 id="trophyList">🏆 Pokaalin ansainneita (${trophyList.length})</h2>`;
      const table = document.createElement('table');
      table.className = 'pokaali-table';
      table.innerHTML = `<thead><tr><th>#</th><th>Nimi</th><th>Osallistumisia</th><th>Pokaali</th></tr></thead>`;
      const tbody = document.createElement('tbody');
      trophyList.forEach((t,i)=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i+1}</td><td>${escapeHtml(t.name)}</td><td>${t.participationCount}</td><td>🏆</td>`;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      div.appendChild(table);
      out.appendChild(div);
    }
  }

  const seriesMap = {};
  totals.forEach(t=>{
    const perSeries = {};
    t.results.forEach(r=>{
      if(!perSeries[r.series]) perSeries[r.series] = [];
      perSeries[r.series].push(r);
    });

    Object.keys(perSeries).forEach(series=>{
      if(!seriesMap[series]) seriesMap[series] = [];
      const resultsForSeries = perSeries[series];
      const pointsList = resultsForSeries.map(r=>r.points);
      const topSum = pointsList.sort((a,b)=>b-a).slice(0, TOP_N_SCORES_TO_SUM).reduce((s,x)=>s+x,0);
      const participationCount = resultsForSeries.length;
      const club = t.club;
      seriesMap[series].push({...t, pointsList, topSum, participationCount, club, results: resultsForSeries});
    });
  });

  const seriesKeys = Object.keys(seriesMap).sort();
  renderSeriesLinks(seriesKeys);

  seriesKeys.forEach(series=>{
    const h = document.createElement('h2');
    h.className='series-title';
    h.id = `series-${series.replace(/\s+/g,'_')}`;
    h.textContent = series;
    out.appendChild(h);

    const table = document.createElement('table');
    table.className = 'pokaali-table';
    table.innerHTML = `<thead><tr>
      <th>#</th><th>Nimi</th><th>Seura</th><th>Osallistumiset</th><th>Top pisteet</th><th>Yhteispisteet</th>
    </tr></thead>`;
    const tbody = document.createElement('tbody');

    seriesMap[series].sort((a,b)=>b.topSum - a.topSum).forEach((t,i)=>{
      tbody.innerHTML += `<tr>
        <td>${i+1}</td>
        <td>${escapeHtml(t.name)}</td>
        <td>${escapeHtml(t.club)}</td>
        <td>${t.participationCount}</td>
        <td>${t.pointsList.map((pts,j)=>`<a href="${t.results[j].eventUrl || '#'}">${pts}</a>`).join(', ')}</td>
        <td>${t.topSum}</td>
      </tr>`;
    });

    table.appendChild(tbody);
    out.appendChild(table);
  });
}

// --- CSV export ---
function exportCsv(totals){
  const rows=[['rank','name','club','series','participations','top_scores','total_points']];
  totals.forEach(t=>{
    t.results.forEach(r=>{
      rows.push([1,t.name,t.club,r.series,t.participationCount,t.pointsList? t.pointsList.join(';') : '',t.topSum]);
    });
  });
  const csv = rows.map(r=>r.map(f=>('"'+(f||'').toString().replace(/"/g,'""')+'"')).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pokaalijahti.csv';
  document.body.appendChild(a); a.click(); a.remove();
}

// --- WP AJAX proxy fetch ---
async function fetchEvent(eventId){
  try {
    const url = PokaaliAjax.ajaxUrl + '?action=pokaalijahti_fetch_event&eventid=' + encodeURIComponent(eventId) + '&nonce=' + encodeURIComponent(PokaaliAjax.nonce);
    const res = await fetch(url, {credentials:'same-origin'});
    const data = await res.json();
    if(!data.success) throw new Error('Server error');
    return data.data;
  } catch(e){
    console.error('Virhe haettaessa event',eventId,e);
    return null;
  }
}

async function fetchEventsByIds(ids){
  const events=[];
  for(const id of ids){
    const ev = await fetchEvent(id);
    if(ev) events.push(ev);
  }
  return events;
}

// --- Run ---
(async()=>{
  if(!eventIds.length){ document.getElementById('output').innerHTML='<p>Ei eventid-parametreja</p>'; return; }
  const events = await fetchEventsByIds(eventIds);
  const totals = calculateTotals(events);
  renderTableBySeries(totals);
  document.getElementById('exportCsvBtn').addEventListener('click',()=>exportCsv(totals));
})();
