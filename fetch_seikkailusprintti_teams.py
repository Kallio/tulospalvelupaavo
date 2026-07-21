#!/usr/bin/env python3
"""Fetch team data embedded in the seikkailusprintti.com JS bundle (the
"#joukkueet" section) and write a CSV in the format bibgenerator.html
expects (see the CSV format tooltip in that file).

Usage: python3 fetch_seikkailusprintti_teams.py [output.csv]

The site is a static SPA (Lovable/React) with the team list hardcoded into
its JS bundle rather than served from an API, so this script scrapes that
bundle instead of calling an endpoint.
"""

import csv as csv_module
import io
import re
import sys
import urllib.request
from urllib.parse import urljoin

SITE_URL = 'https://seikkailusprintti.com/'

CAT_RE = re.compile(
    r'\{key:"(\w+)",label:"((?:[^"\\]|\\.)*)",teams:\[((?:[^\]]|\](?!\}))*)\]\}'
)
TEAM_RE = re.compile(
    r'\{number:(\d+),name:"((?:[^"\\]|\\.)*)",racer1:"((?:[^"\\]|\\.)*)",racer2:"((?:[^"\\]|\\.)*)"\}'
)


def fetch_text(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        return resp.read().decode('utf-8')


def unescape_js_string(s):
    return re.sub(r'\\(.)', lambda m: {'n': '\n', 't': '\t'}.get(m.group(1), m.group(1)), s)


def find_bundle_url():
    html = fetch_text(SITE_URL)
    m = re.search(r'src="(/assets/index-[^"]+\.js)"', html)
    if not m:
        raise RuntimeError('Could not locate JS bundle path in site HTML')
    return urljoin(SITE_URL, m.group(1))


def extract_categories(bundle_js):
    categories = []
    for key, label, teams_blob in CAT_RE.findall(bundle_js):
        teams = [
            {
                'number': number,
                'name': unescape_js_string(name),
                'racer1': unescape_js_string(r1),
                'racer2': unescape_js_string(r2),
            }
            for number, name, r1, r2 in TEAM_RE.findall(teams_blob)
        ]
        if teams:
            categories.append({'key': key, 'label': unescape_js_string(label), 'teams': teams})
    return categories


def runner_header(n):
    return ['', f'Nimi-{n}', f'Kilpailukortti-{n}', f'Lainakortti-{n}', f'Osuus-{n}', f'Alaosuus-{n}', f'Rata-{n}', f'Lähtöaika-{n}']


def build_csv(categories):
    # Both racers on a team share a single timing chip, so they're written as
    # one combined runner (not two Osuus legs) — one bib per team.
    header = ['Kilpailunumero', 'Sarja', 'Joukkueen nimi', 'Kansalaisuus', 'Seura'] \
        + runner_header(1)

    buf = io.StringIO()
    writer = csv_module.writer(buf, lineterminator='\r\n', quoting=csv_module.QUOTE_ALL)
    writer.writerow(header)

    for cat in categories:
        for team in cat['teams']:
            runner_name = f"{team['racer1']} & {team['racer2']}"
            team_name = runner_name if team['name'] == '—' else team['name']
            row = [
                team['number'], cat['label'], team_name, '', '',
                '', runner_name, '', '', '', '', '', '',
            ]
            writer.writerow(row)

    return buf.getvalue()


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    out_file = args[0] if args else 'seikkailusprintti_teams.csv'

    bundle_url = find_bundle_url()
    bundle_js = fetch_text(bundle_url)
    categories = extract_categories(bundle_js)

    total_teams = sum(len(c['teams']) for c in categories)
    if not total_teams:
        print(f'No teams found — the site markup may have changed. Inspect the bundle at: {bundle_url}', file=sys.stderr)
        sys.exit(1)

    csv_text = build_csv(categories)
    with open(out_file, 'w', encoding='utf-8-sig', newline='') as f:
        f.write(csv_text)

    summary = ', '.join(f"{c['label']}: {len(c['teams'])}" for c in categories)
    print(f'Wrote {total_teams} teams ({summary}) to {out_file}')


if __name__ == '__main__':
    main()
