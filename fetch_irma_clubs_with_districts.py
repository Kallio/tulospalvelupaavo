#!/usr/bin/env python3
"""
Fetches club district (area) information from IRMA.
Extends the club list with area mapping from ClubEndpoint/viewClub.

DISCLAIMER: The output JSON file is gathered from IRMA's public API but is
not an official IRMA export. Use at your own risk. The data may become stale;
re-run this script periodically to refresh it.

Usage:
    python3 fetch_irma_clubs_with_districts.py [output_file]

Default output: clubs_with_districts.json

If the output file already exists, only missing clubs are fetched.
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from http.cookiejar import CookieJar

IRMA_BASE = "https://irma.suunnistusliitto.fi"
CLUB_LIST_URL = f"{IRMA_BASE}/connect/ClubEndpoint/list"
CLUB_VIEW_URL = f"{IRMA_BASE}/connect/ClubEndpoint/viewClub"
AREA_LIST_URL = f"{IRMA_BASE}/connect/AreaEndpoint/list"
INITIAL_URL = f"{IRMA_BASE}/public/club/list"

TIMEOUT = 60
MAX_WORKERS = 8
MAX_RETRIES = 2


def build_opener(cookiejar=None):
    if cookiejar is None:
        cookiejar = CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cookiejar),
    )
    opener.addheaders = [
        ("User-Agent", "Mozilla/5.0 (compatible; IRMA-fetcher)"),
    ]
    return opener


def fetch_text(url, data=None, headers=None, opener=None):
    if opener is None:
        opener = build_opener()
    req = urllib.request.Request(url, data=data, headers=headers or {})
    resp = opener.open(req, timeout=TIMEOUT)
    return resp.read().decode("utf-8")


def extract_csrf(html):
    m = re.search(r'name="_csrf" content="([^"]+)"', html)
    if m:
        return m.group(1)
    m = re.search(r'name="csrf-token" content="([^"]+)"', html)
    if m:
        return m.group(1)
    return None


def get_initial_session(opener):
    print("  Establishing session...", file=sys.stderr)
    html = fetch_text(INITIAL_URL, opener=opener)
    csrf = extract_csrf(html)
    if not csrf:
        print("ERROR: Could not find CSRF token", file=sys.stderr)
        sys.exit(1)
    return csrf


def post_json(opener, url, payload, csrf, referer=None):
    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrf,
        "Origin": IRMA_BASE,
    }
    if referer:
        headers["Referer"] = referer
    resp_text = fetch_text(url, data=data, headers=headers, opener=opener)
    return json.loads(resp_text)


def fetch_all_areas(opener, csrf):
    print("  Fetching areas...", file=sys.stderr)
    return post_json(opener, AREA_LIST_URL, {}, csrf, referer=INITIAL_URL)


def fetch_all_clubs(opener, csrf):
    print("  Fetching club list...", file=sys.stderr)
    return post_json(opener, CLUB_LIST_URL, {}, csrf, referer=INITIAL_URL)


def fetch_club_view_with_retry(opener, csrf, club_id, club_name):
    for attempt in range(1 + MAX_RETRIES):
        try:
            data = post_json(opener, CLUB_VIEW_URL, {"id": club_id}, csrf, referer=INITIAL_URL)
            area = data.get("area")
            if area:
                return club_id, club_name, area["id"], area["name"]
            return club_id, club_name, None, None
        except Exception as e:
            if attempt < MAX_RETRIES:
                wait = 2 ** (attempt + 1)
                print(f"  Retry {attempt + 1}/{MAX_RETRIES} for {club_name} in {wait}s...", file=sys.stderr)
                time.sleep(wait)
            else:
                print(f"  WARN: Failed club {club_id} ({club_name}): {e}", file=sys.stderr)
                return club_id, club_name, None, None


def load_existing(output_file):
    if os.path.exists(output_file):
        with open(output_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def main():
    output_file = sys.argv[1] if len(sys.argv) > 1 else "clubs_with_districts.json"

    existing = load_existing(output_file)
    if existing:
        print(f"Found existing {output_file} ({len(existing.get('clubMap', {}))} clubs)", file=sys.stderr)

    print("Fetching club district data from IRMA...", file=sys.stderr)

    shared_jar = CookieJar()
    opener = build_opener(shared_jar)
    csrf = get_initial_session(opener)

    areas = fetch_all_areas(opener, csrf)
    print(f"  Got {len(areas)} areas", file=sys.stderr)

    clubs = fetch_all_clubs(opener, csrf)
    print(f"  Got {len(clubs)} clubs", file=sys.stderr)

    existing_map = (existing or {}).get("clubMap", {})
    club_map = dict(existing_map)

    to_fetch = [c for c in clubs if c["name"] not in club_map or club_map[c["name"]].get("areaId") is None]
    skip_count = len(clubs) - len(to_fetch)

    if skip_count:
        print(f"  Skipping {skip_count} already-mapped clubs", file=sys.stderr)

    if not to_fetch:
        print("  All clubs already mapped.", file=sys.stderr)
        return

    done = 0
    total = len(to_fetch)
    start = time.time()

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futs = {}
        for c in to_fetch:
            cid = c["id"]
            cname = c["name"]
            thread_opener = build_opener(shared_jar)
            futs[pool.submit(fetch_club_view_with_retry, thread_opener, csrf, cid, cname)] = cname

        for fut in as_completed(futs):
            cid, cname, area_id, area_name = fut.result()
            club_map[cname] = {"areaId": area_id, "areaName": area_name}
            done += 1
            if done % 50 == 0 or done == total:
                elapsed = time.time() - start
                print(f"  Progress: {done}/{total} ({elapsed:.0f}s)", file=sys.stderr)

    elapsed = time.time() - start
    mapped = sum(1 for v in club_map.values() if v["areaId"] is not None)
    print(f"  Done in {elapsed:.0f}s — {mapped}/{len(club_map)} clubs mapped to districts", file=sys.stderr)

    output = {
        "disclaimer": "This data is gathered from IRMA's public API but is not an official IRMA export. Use at your own risk.",
        "updated": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "areas": [{"id": a["id"], "name": a["name"], "abbreviation": a.get("abbreviation", "")} for a in areas],
        "clubMap": club_map,
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nWritten to {output_file}", file=sys.stderr)


if __name__ == "__main__":
    main()
