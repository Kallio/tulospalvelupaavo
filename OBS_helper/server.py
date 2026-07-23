#!/usr/bin/env python3
"""vMix JSON API server for orienteering live data.

Connects to Navisport via Socket.IO and serves TV-friendly JSON endpoints
for vMix Data Source consumption.

Usage:
    python server.py --event jukola-2025 --port 3000
    python server.py --event <event-uuid> --port 3000

Endpoints:
    GET /api/tv-results?class=H21&limit=10&relay=team
    GET /api/tv-split?control=<id>&class=H21&limit=10
    GET /api/tv-runner?id=1024
"""

import argparse
import asyncio
import json
import logging
import re
import sys
import time
import zlib
from datetime import datetime
from pathlib import Path
from urllib.parse import urlencode

import aiohttp
from aiohttp import web
import socketio

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("vmix-server")

NAVISPORT_ORIGIN = "https://navisport.com"

# ═══════════════════════════════════════════
# DATA STORE
# ═══════════════════════════════════════════

class EventData:
    """Thread-safe in-memory store for event data."""

    def __init__(self):
        self.event_id = None
        self.event_name = ""
        self.race_type = "Individual"
        self.class_id_map = {}  # id -> name
        self.checkpoints = []
        self.results_map = {}   # id -> result dict
        self.passings_map = {}  # id -> passing dict
        self._lock = asyncio.Lock()

    async def upsert_result(self, r):
        if not r or not r.get("id"):
            return
        async with self._lock:
            existing = self.results_map.get(r["id"], {})
            existing.update(r)
            self.results_map[r["id"]] = existing

    async def remove_result(self, rid):
        async with self._lock:
            self.results_map.pop(rid, None)

    async def upsert_passing(self, p):
        if not p or not p.get("id"):
            return
        async with self._lock:
            existing = self.passings_map.get(p["id"], {})
            existing.update(p)
            self.passings_map[p["id"]] = existing

    async def snapshot(self):
        """Return a consistent snapshot of all data."""
        async with self._lock:
            return {
                "results": dict(self.results_map),
                "passings": dict(self.passings_map),
                "class_id_map": dict(self.class_id_map),
                "checkpoints": list(self.checkpoints),
                "event_name": self.event_name,
                "race_type": self.race_type,
            }


data = EventData()

# ═══════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════

def nav_name(r):
    """Extract runner name from result dict."""
    name = (r.get("name") or "").strip()
    if name:
        return name
    surname = (r.get("surname") or "").strip()
    given = (r.get("givenName") or "").strip()
    if surname and given:
        return f"{surname} {given}"
    return surname or given or ""


def format_time(sec):
    """Format seconds into human-readable time string."""
    if sec is None:
        return ""
    sec = round(sec)
    if sec < 0:
        sec = 0
    if sec < 60:
        return f"{sec}s"
    h = sec // 3600
    m = (sec % 3600) // 60
    s = sec % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def parse_navisport_time(time_str):
    """Parse Navisport time string to seconds."""
    if not time_str:
        return None
    try:
        parts = str(time_str).split(":")
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        return float(time_str)
    except (ValueError, TypeError):
        return None


def calc_elapsed(result):
    """Calculate elapsed time for a result."""
    if result.get("finishTime") and result.get("startTime"):
        try:
            ft = datetime.fromisoformat(result["finishTime"].replace("Z", "+00:00"))
            st = datetime.fromisoformat(result["startTime"].replace("Z", "+00:00"))
            return (ft - st).total_seconds()
        except (ValueError, TypeError):
            pass
    total = result.get("totalTime")
    if total and float(total) > 0:
        return float(total)
    return None


def resolve_team_name(r, results_map):
    """Get team name for relay."""
    parent_id = r.get("parentId")
    if parent_id and parent_id in results_map:
        parent = results_map[parent_id]
        return parent.get("name") or parent.get("club") or nav_name(r)
    return nav_name(r)


def resolve_bib(r, results_map):
    """Get bib number, looking at parent for relay legs."""
    parent_id = r.get("parentId")
    if parent_id and parent_id in results_map:
        parent = results_map[parent_id]
        if parent.get("bibNumber") is not None:
            return parent.get("bibNumber")
    return r.get("bibNumber")


def resolve_class_name(class_id, class_id_map):
    """Resolve class ID to class name."""
    return class_id_map.get(class_id, "")


def get_class_id(name, class_id_map):
    """Resolve class name to class ID."""
    for cid, cname in class_id_map.items():
        if cname == name:
            return cid
    return None


def status_to_tv(result):
    """Map result status to TV-friendly string."""
    status = result.get("status", "")
    if not status or status in ("Ok", "Finished"):
        return "OK"
    mapping = {"DNS": "DNS", "DNF": "DNF", "DSQ": "DSQ", "MP": "MP"}
    return mapping.get(status, status)

# ═══════════════════════════════════════════
# DATA PROCESSORS
# ═══════════════════════════════════════════

async def calc_finish(class_filter=None, limit=0, relay="team"):
    """Calculate finish results, mirroring overlay.html recalcFinish()."""
    snap = await data.snapshot()
    results_map = snap["results"]
    class_id_map = snap["class_id_map"]
    race_type = snap["race_type"]

    all_results = list(results_map.values())

    filtered = []
    for r in all_results:
        if r.get("resultType") == "Team" and relay == "leg":
            continue
        if r.get("resultType") == "Team" and relay == "team":
            if class_filter:
                cn = resolve_class_name(r.get("classId"), class_id_map)
                if cn not in class_filter:
                    continue
            filtered.append(r)
            continue
        status = r.get("status", "")
        if status and status not in ("Ok", "Finished"):
            continue
        if class_filter:
            cn = resolve_class_name(r.get("classId"), class_id_map)
            if cn not in class_filter:
                continue
        filtered.append(r)

    if relay == "team" and race_type == "Relay":
        filtered = _build_relay_teams(filtered, results_map)

    for r in filtered:
        r["_elapsed"] = calc_elapsed(r)

    filtered.sort(key=lambda r: r["_elapsed"] if r["_elapsed"] is not None else float("inf"))
    if limit > 0:
        filtered = filtered[:limit]

    leader_elapsed = filtered[0]["_elapsed"] if filtered and filtered[0]["_elapsed"] is not None else 0

    results = []
    for i, r in enumerate(filtered):
        elapsed = r.get("_elapsed")
        if elapsed is None:
            time_str = status_to_tv(r)
            diff_str = ""
        elif i == 0:
            time_str = format_time(elapsed)
            diff_str = "0:00"
        else:
            time_str = format_time(elapsed)
            diff_str = "+" + format_time(elapsed - leader_elapsed)

        entry = {
            "rank": str(i + 1),
            "name": nav_name(r),
            "club": r.get("club", ""),
            "time": time_str,
            "diff": diff_str,
            "status": status_to_tv(r),
        }
        if r.get("bibNumber") is not None:
            entry["bib"] = str(r["bibNumber"])
        if r.get("countryCode"):
            entry["country"] = r["countryCode"]
        if race_type == "Relay":
            entry["team"] = r.get("name", "")
        results.append(entry)

    return results


def _build_relay_teams(results, results_map):
    """Build relay team entries from individual legs."""
    team_map = {}

    for r in results:
        if r.get("resultType") == "Team":
            bib = r.get("bibNumber")
            if bib is not None:
                key = str(bib)
                if key not in team_map:
                    team_map[key] = {
                        "_team_result": r,
                        "bibNumber": r.get("bibNumber"),
                        "club": r.get("club", ""),
                        "name": r.get("name", ""),
                        "classId": r.get("classId"),
                        "_legs": [],
                    }

    for r in results:
        if r.get("resultType") != "Team":
            parent = results_map.get(r.get("parentId")) if r.get("parentId") else None
            bib = parent.get("bibNumber") if parent else r.get("bibNumber")
            if bib is not None:
                key = str(bib)
                if key not in team_map:
                    team_map[key] = {
                        "_team_result": None,
                        "bibNumber": bib,
                        "club": (parent.get("club") if parent else None) or r.get("club", ""),
                        "name": (parent.get("name") if parent else None) or "",
                        "classId": r.get("classId"),
                        "_legs": [],
                    }
                team_map[key]["_legs"].append(r)

    built = []
    for t in team_map.values():
        t["_legs"].sort(key=lambda l: l.get("leg") or 0)
        team_result = t["_team_result"]
        status = (team_result.get("status") if team_result else None) or "Ok"
        is_finished = not status or status in ("Ok", "Finished")
        total_time = 0
        if is_finished:
            if team_result and team_result.get("totalTime", 0) > 0:
                total_time = float(team_result["totalTime"])
            else:
                for leg in t["_legs"]:
                    if leg.get("finishTime") and leg.get("startTime"):
                        try:
                            ft = datetime.fromisoformat(leg["finishTime"].replace("Z", "+00:00"))
                            st = datetime.fromisoformat(leg["startTime"].replace("Z", "+00:00"))
                            total_time += (ft - st).total_seconds()
                        except (ValueError, TypeError):
                            pass
                    elif leg.get("totalTime") is not None:
                        total_time += float(leg["totalTime"])

        entry = {
            "id": team_result["id"] if team_result else f"team-{t['bibNumber']}",
            "bibNumber": t["bibNumber"],
            "club": t["club"],
            "name": t["name"],
            "classId": t["classId"],
            "status": status,
            "totalTime": total_time,
            "_elapsed": total_time if total_time > 0 else None,
            "resultType": "Team",
            "country": (team_result.get("countryCode") if team_result else "") or "",
        }
        built.append(entry)

    return built


async def calc_passing(class_filter=None, limit=0, checkpoint="latest"):
    """Calculate checkpoint passings, mirroring overlay.html recalcPassing()."""
    snap = await data.snapshot()
    results_map = snap["results"]
    passings_map = snap["passings"]
    class_id_map = snap["class_id_map"]

    all_passings = list(passings_map.values())

    filtered = []
    for p in all_passings:
        if not p.get("resultId"):
            continue
        if checkpoint and checkpoint != "latest":
            if p.get("checkpointId") != checkpoint:
                continue
        filtered.append(p)

    if not checkpoint or checkpoint == "latest":
        latest_map = {}
        for p in filtered:
            rid = p["resultId"]
            ptime = p.get("time")
            existing = latest_map.get(rid)
            if not existing:
                latest_map[rid] = p
            else:
                etime = existing.get("time")
                if ptime is not None and (etime is None or float(ptime) > float(etime)):
                    latest_map[rid] = p
        filtered = list(latest_map.values())

    if class_filter:
        class_ids = []
        for cn in class_filter:
            cid = get_class_id(cn, class_id_map)
            if cid:
                class_ids.append(cid)
        if class_ids:
            filtered = [
                p for p in filtered
                if (r := results_map.get(p["resultId"])) and r.get("classId") in class_ids
            ]

    def sort_key(p):
        t = p.get("time")
        if t is not None:
            return float(t)
        tt = p.get("totalTime")
        if tt is not None:
            return float(tt)
        return float("inf")

    filtered.sort(key=sort_key)
    if limit > 0:
        filtered = filtered[:limit]

    leader_time = 0
    if filtered:
        p0 = filtered[0]
        leader_time = float(p0.get("time") or p0.get("totalTime") or 0)

    results = []
    for i, p in enumerate(filtered):
        elapsed = float(p.get("time") or p.get("totalTime") or 0)
        r = results_map.get(p.get("resultId"), {})
        if i == 0:
            diff_str = "0:00"
        else:
            diff_str = "+" + format_time(elapsed - leader_time)

        entry = {
            "rank": str(i + 1),
            "name": nav_name(r),
            "club": r.get("club", ""),
            "time": format_time(elapsed),
            "diff": diff_str,
            "status": status_to_tv(r),
        }
        if r.get("bibNumber") is not None:
            entry["bib"] = str(r["bibNumber"])
        if r.get("countryCode"):
            entry["country"] = r["countryCode"]
        results.append(entry)

    return results


async def calc_runner(runner_id):
    """Get individual runner details."""
    snap = await data.snapshot()
    results_map = snap["results"]
    passings_map = snap["passings"]

    runner = results_map.get(str(runner_id))
    if not runner:
        for r in results_map.values():
            if r.get("id") == runner_id:
                runner = r
                break
    if not runner:
        return None

    splits = {}
    for p in passings_map.values():
        if str(p.get("resultId")) == str(runner.get("id")):
            cp_id = p.get("checkpointId", "")
            splits[str(cp_id)] = {
                "time": format_time(p.get("time")),
                "rank": p.get("rank", ""),
            }

    elapsed = calc_elapsed(runner)

    return {
        "id": runner.get("id"),
        "name": nav_name(runner),
        "club": runner.get("club", ""),
        "status": status_to_tv(runner),
        "result_time": format_time(elapsed) if elapsed else "",
        "bib": runner.get("bibNumber", ""),
        "country": runner.get("countryCode", ""),
        "splits": splits,
    }

# ═══════════════════════════════════════════
# NAVISPORT CONNECTION
# ═══════════════════════════════════════════

def decode_message(raw):
    """Decode Socket.IO message, handling compressed payloads."""
    try:
        if isinstance(raw, (bytes, bytearray)):
            try:
                inflated = zlib.decompress(bytes(raw), -zlib.MAX_WBITS)
            except zlib.error:
                try:
                    inflated = zlib.decompress(bytes(raw))
                except zlib.error:
                    inflated = zlib.decompress(bytes(raw), 16 + zlib.MAX_WBITS)
            return json.loads(inflated.decode("utf-8"))
        if isinstance(raw, dict):
            return raw
        if isinstance(raw, str):
            s = raw
            if s and s[0].isdigit():
                s = re.sub(r"^\d+", "", s)
            if s:
                return json.loads(s)
    except Exception:
        pass
    return None


sio = socketio.AsyncClient(logger=False, engineio_logger=False)


@sio.on("connect")
async def on_connect():
    log.info("Connected to Navisport (sid=%s)", sio.sid)


@sio.on("disconnect")
async def on_disconnect():
    log.warning("Disconnected from Navisport")


@sio.on("message")
async def on_message(raw):
    msg = decode_message(raw)
    if not msg:
        return
    subject = msg.get("subject")
    operation = msg.get("operation")
    payload = msg.get("payload", {})

    if subject == "Result" and operation == "Update":
        if isinstance(payload, dict):
            r = payload.get("result")
            if r:
                await data.upsert_result(r)
            for r in payload.get("results", []):
                await data.upsert_result(r)
        elif isinstance(payload, list):
            for r in payload:
                await data.upsert_result(r)

    elif subject == "Result" and operation == "Delete":
        rid = payload.get("resultId") if isinstance(payload, dict) else None
        if rid:
            await data.remove_result(rid)

    elif subject == "Passing" and operation == "Update":
        if isinstance(payload, dict):
            p = payload.get("passing")
            if p:
                await data.upsert_passing(p)
            for r in payload.get("results", []):
                await data.upsert_result(r)
        elif isinstance(payload, list):
            for item in payload:
                if isinstance(item, dict) and item.get("id"):
                    await data.upsert_passing(item)


async def fetch_event(session, event_slug):
    """Fetch initial event data from Navisport REST API."""
    is_uuid = bool(re.match(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        event_slug, re.IGNORECASE
    ))

    if is_uuid:
        url = f"{NAVISPORT_ORIGIN}/api/events/{event_slug}"
    else:
        inp = urlencode({"0": event_slug})
        url = f"{NAVISPORT_ORIGIN}/trpc/eventsTrpcRouter.getEvent,adsTrpcRouter.getAds?batch=1&input={inp}"

    async with session.get(url) as resp:
        if not resp.ok:
            raise RuntimeError(f"HTTP {resp.status} fetching event")
        batch = await resp.json()

    if is_uuid:
        ev = batch
    else:
        ev = batch and batch[0] and batch[0].get("result", {}).get("data")
        if not ev:
            raise RuntimeError("Unexpected response format")

    return ev


async def init_event(event_slug):
    """Initialize event data from REST API + class/checkpoint maps."""
    async with aiohttp.ClientSession() as session:
        ev = await fetch_event(session, event_slug)

    data.event_id = ev.get("id", event_slug)
    data.event_name = ev.get("name", "")
    data.race_type = ev.get("raceType", "Individual")

    data.class_id_map = {}
    for c in ev.get("courseClasses", []):
        data.class_id_map[c["id"]] = c["name"]

    data.checkpoints = ev.get("checkpoints", [])

    for r in ev.get("results", []):
        await data.upsert_result(r)

    log.info(
        "Event loaded: %s (%s) — %d results, %d classes, %d checkpoints",
        data.event_name, data.race_type,
        len(data.results_map), len(data.class_id_map), len(data.checkpoints),
    )

    return data.event_id


async def connect_navisport(event_id):
    """Connect to Navisport Socket.IO."""
    url = f"{NAVISPORT_ORIGIN}?eventId={event_id}"
    await sio.connect(url, transports=["websocket"])

# ═══════════════════════════════════════════
# HTTP ENDPOINTS
# ═══════════════════════════════════════════

async def handle_tv_results(request):
    """GET /api/tv-results?class=H21&limit=10&relay=team"""
    class_param = request.query.get("class", "")
    class_filter = [c.strip() for c in class_param.split(",") if c.strip()] if class_param else None
    limit = int(request.query.get("limit", 0))
    relay = request.query.get("relay", "team")

    results = await calc_finish(class_filter=class_filter, limit=limit, relay=relay)
    return web.json_response(results, content_type="application/json")


async def handle_tv_split(request):
    """GET /api/tv-split?control=<id>&class=H21&limit=10"""
    control = request.query.get("control", "latest")
    class_param = request.query.get("class", "")
    class_filter = [c.strip() for c in class_param.split(",") if c.strip()] if class_param else None
    limit = int(request.query.get("limit", 0))

    results = await calc_passing(class_filter=class_filter, limit=limit, checkpoint=control)
    return web.json_response(results, content_type="application/json")


async def handle_tv_runner(request):
    """GET /api/tv-runner?id=1024"""
    runner_id = request.query.get("id", "")
    if not runner_id:
        return web.json_response({"error": "Missing 'id' parameter"}, status=400)

    result = await calc_runner(runner_id)
    if result is None:
        return web.json_response({"error": "Runner not found"}, status=404)
    return web.json_response(result, content_type="application/json")


async def handle_index(request):
    """GET / — Status page."""
    snap = await data.snapshot()
    return web.json_response({
        "service": "vMix Orienteering API",
        "event": snap["event_name"],
        "race_type": snap["race_type"],
        "results_count": len(snap["results"]),
        "passings_count": len(snap["passings"]),
        "classes": list(snap["class_id_map"].values()),
        "endpoints": [
            "/api/tv-results?class=&limit=&relay=",
            "/api/tv-split?control=&class=&limit=",
            "/api/tv-runner?id=",
        ],
    }, content_type="application/json")

# ═══════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════

def parse_args():
    parser = argparse.ArgumentParser(
        description="vMix JSON API server for orienteering live data"
    )
    parser.add_argument(
        "--event", required=True,
        help="Navisport event slug or UUID"
    )
    parser.add_argument(
        "--port", type=int, default=3000,
        help="HTTP server port (default: 3000)"
    )
    parser.add_argument(
        "--host", default="0.0.0.0",
        help="HTTP server host (default: 0.0.0.0)"
    )
    return parser.parse_args()


async def start_server(args):
    """Initialize event, connect Socket.IO, start HTTP server."""
    event_id = await init_event(args.event)
    await connect_navisport(event_id)

    app = web.Application()
    app.router.add_get("/", handle_index)
    app.router.add_get("/api/tv-results", handle_tv_results)
    app.router.add_get("/api/tv-split", handle_tv_split)
    app.router.add_get("/api/tv-runner", handle_tv_runner)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, args.host, args.port)
    await site.start()

    log.info("Server listening on http://%s:%d", args.host, args.port)
    log.info("vMix endpoints:")
    log.info("  http://localhost:%d/api/tv-results?class=H21&limit=10", args.port)
    log.info("  http://localhost:%d/api/tv-split?control=latest&class=H21", args.port)
    log.info("  http://localhost:%d/api/tv-runner?id=1024", args.port)

    await asyncio.Event().wait()


def main():
    args = parse_args()
    try:
        asyncio.run(start_server(args))
    except KeyboardInterrupt:
        log.info("Shutting down")


if __name__ == "__main__":
    main()
