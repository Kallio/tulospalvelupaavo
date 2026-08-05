#!/usr/bin/env python3
"""Convert Purple Pen (.ppen) files to IOF 3.0 CourseData XML."""

import argparse
import math
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone


def parse_ppen(path):
    tree = ET.parse(path)
    root = tree.getroot()

    event_el = root.find("event")
    map_el = event_el.find("event") if event_el is not None else None
    if map_el is None:
        map_el = event_el.find("map") if event_el is not None else None
    scale = int(map_el.get("scale", "15000")) if map_el is not None else 15000

    pa = event_el.find("print-area") if event_el is not None else None
    if pa is not None:
        map_bounds = {
            "left": float(pa.get("left", "0")),
            "top": float(pa.get("top", "0")),
            "right": float(pa.get("right", "0")),
            "bottom": float(pa.get("bottom", "0")),
            "present": True,
        }
    else:
        map_bounds = {"left": 0, "top": 600, "right": 200, "bottom": 0, "present": False}

    controls = {}
    for ctrl in root.findall("control"):
        cid = ctrl.get("id")
        kind = ctrl.get("kind")
        code_el = ctrl.find("code")
        code = code_el.text if code_el is not None else None
        loc = ctrl.find("location")
        x = float(loc.get("x", "0"))
        y = float(loc.get("y", "0"))
        controls[cid] = {"kind": kind, "code": code, "x": x, "y": y}

    courses = []
    for course in root.findall("course"):
        name = course.find("name").text
        first_cc = course.find("first").get("course-control")
        labels_el = course.find("labels")
        label_kind = labels_el.get("label-kind") if labels_el is not None else None
        courses.append({"name": name, "first_cc": first_cc, "label_kind": label_kind})

    course_controls = {}
    for cc in root.findall("course-control"):
        ccid = cc.get("id")
        ctrl_id = cc.get("control")
        next_el = cc.find("next")
        next_cc = next_el.get("course-control") if next_el is not None else None
        course_controls[ccid] = {"control": ctrl_id, "next": next_cc}

    return controls, courses, course_controls, scale, map_bounds


def _rect_area(b):
    return (b["right"] - b["left"]) * (b["top"] - b["bottom"])


def _rect_overlaps(a, b):
    return (max(a["left"], b["left"]) < min(a["right"], b["right"])
            and max(a["bottom"], b["bottom"]) < min(a["top"], b["top"]))


def merge_ppen(paths):
    files = []
    for path in paths:
        controls, courses, course_controls, scale, bounds = parse_ppen(path)
        files.append({
            "path": path,
            "controls": controls,
            "courses": courses,
            "course_controls": course_controls,
            "scale": scale,
            "bounds": bounds,
        })

    with_pa = [f for f in files if f["bounds"]["present"]]
    biggest = max(with_pa, key=lambda f: _rect_area(f["bounds"])) if with_pa else None

    if biggest is None:
        accepted = files
    else:
        accepted = [biggest]
        pending = [f for f in files if f is not biggest]
        while True:
            joining = [f for f in pending
                       if any(_rect_overlaps(f["bounds"], a["bounds"]) for a in accepted)]
            if not joining:
                break
            accepted.extend(joining)
            pending = [f for f in pending if f not in joining]
        for f in pending:
            reason = ("has no print-area" if not f["bounds"]["present"]
                      else "print-area does not overlap the others")
            print(f"Warning: {f['path']} {reason}; skipping", file=sys.stderr)

    map_bounds = dict(biggest["bounds"]) if biggest is not None else dict(files[0]["bounds"])
    scale = accepted[0]["scale"]

    title = None
    for f in accepted:
        if title is None:
            tree = ET.parse(f["path"])
            t = tree.getroot().find(".//event/title")
            title = t.text if t is not None else None
        if f["scale"] != scale:
            print(f"Warning: {f['path']} has scale {f['scale']}, using {scale}", file=sys.stderr)

    merged_controls = {}
    merged_courses = []
    merged_cc = {}
    seen_names = set()
    for f in accepted:
        remap = {}
        for cid, ctrl in f["controls"].items():
            kind = ctrl["kind"]
            key = ("normal", ctrl["code"]) if kind == "normal" else (kind,)
            if key not in merged_controls:
                merged_controls[key] = dict(ctrl)
            remap[cid] = key

        for ccid, cc in f["course_controls"].items():
            merged_cc[(f["path"], ccid)] = {
                "control": remap[cc["control"]],
                "next": (f["path"], cc["next"]) if cc["next"] else None,
            }

        for course in f["courses"]:
            if course["name"] in seen_names:
                print(f"Warning: duplicate course name '{course['name']}' in {f['path']}; skipping",
                      file=sys.stderr)
                continue
            seen_names.add(course["name"])
            merged_courses.append({
                "name": course["name"],
                "first_cc": (f["path"], course["first_cc"]),
                "label_kind": course["label_kind"],
            })

    return merged_controls, merged_courses, merged_cc, scale, map_bounds, title


def fmt_coord(v):
    return str(round(v, 2))


def leg_length_m(c1, c2, scale):
    dx = (c2["x"] - c1["x"]) * scale / 1000
    dy = (c2["y"] - c1["y"]) * scale / 1000
    return round(math.hypot(dx, dy))


def traverse_course(first_cc, course_controls, controls, scale):
    ordered = []
    ccid = first_cc
    while ccid is not None:
        cc = course_controls[ccid]
        ctrl = controls[cc["control"]]
        ordered.append((cc["control"], ctrl))
        ccid = cc["next"]

    legs = []
    total = 0
    for i in range(len(ordered) - 1):
        d = leg_length_m(ordered[i][1], ordered[i + 1][1], scale)
        legs.append(d)
        total += d

    return ordered, legs, total


def build_iof_xml(controls, courses, course_controls, scale, map_bounds, event_title):
    ns = "http://www.orienteering.org/datastandard/3.0"
    ET.register_namespace("", ns)

    root = ET.Element("CourseData")
    root.set("xmlns", ns)
    root.set("iofVersion", "3.0")
    root.set("createTime", datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    root.set("creator", "ppen_to_iof.py")

    event_el = ET.SubElement(root, "Event")
    name_el = ET.SubElement(event_el, "Name")
    name_el.text = event_title

    rcd = ET.SubElement(root, "RaceCourseData")

    map_el = ET.SubElement(rcd, "Map")
    ET.SubElement(map_el, "Scale").text = str(scale)
    ET.SubElement(map_el, "MapPositionTopLeft",
                  x=fmt_coord(map_bounds["left"]),
                  y=fmt_coord(map_bounds["top"]))
    ET.SubElement(map_el, "MapPositionBottomRight",
                  x=fmt_coord(map_bounds["right"]),
                  y=fmt_coord(map_bounds["bottom"]))

    iof_ids = {}
    start_n = 1
    finish_n = 1
    for cid, ctrl in controls.items():
        if ctrl["kind"] == "start":
            iof_ids[cid] = f"STA{start_n}"
            start_n += 1
        elif ctrl["kind"] == "finish":
            iof_ids[cid] = f"FIN{finish_n}"
            finish_n += 1
        else:
            iof_ids[cid] = ctrl["code"]

    def add_control(cid, ctrl, ctype):
        ctrl_el = ET.SubElement(rcd, "Control")
        ctrl_el.set("type", ctype)
        ET.SubElement(ctrl_el, "Id").text = iof_ids[cid]
        ET.SubElement(ctrl_el, "MapPosition",
                      x=fmt_coord(ctrl["x"]), y=fmt_coord(ctrl["y"]))

    for cid, ctrl in controls.items():
        if ctrl["kind"] == "start":
            add_control(cid, ctrl, "Start")

    seen = set()
    for cid, ctrl in controls.items():
        if ctrl["kind"] != "normal":
            continue
        if ctrl["code"] in seen or ctrl["code"] is None:
            continue
        seen.add(ctrl["code"])
        add_control(cid, ctrl, "Control")

    for cid, ctrl in controls.items():
        if ctrl["kind"] == "finish":
            add_control(cid, ctrl, "Finish")

    for course in courses:
        seq, legs, total = traverse_course(course["first_cc"], course_controls, controls, scale)

        course_el = ET.SubElement(rcd, "Course")
        n = ET.SubElement(course_el, "Name")
        n.text = course["name"]
        ET.SubElement(course_el, "Length").text = str(total)
        ET.SubElement(course_el, "Climb").text = "0"

        control_no = 0
        use_sequence_labels = course.get("label_kind") == "sequence"
        for i, (cid, ctrl) in enumerate(seq):
            cc_el = ET.SubElement(course_el, "CourseControl")
            kind = ctrl["kind"]
            if kind == "start":
                cc_el.set("type", "Start")
            elif kind == "finish":
                cc_el.set("type", "Finish")
            else:
                cc_el.set("type", "Control")
            c = ET.SubElement(cc_el, "Control")
            c.text = iof_ids[cid]
            if kind == "normal":
                control_no += 1
                if use_sequence_labels:
                    mt = ET.SubElement(cc_el, "MapText")
                    mt.text = str(control_no)
            if i > 0:
                ll = ET.SubElement(cc_el, "LegLength")
                ll.text = str(legs[i - 1])

    for course in courses:
        a = ET.SubElement(rcd, "ClassCourseAssignment")
        cn = ET.SubElement(a, "ClassName")
        cn.text = course["name"]
        ccn = ET.SubElement(a, "CourseName")
        ccn.text = course["name"]

    return root


def main():
    parser = argparse.ArgumentParser(description="Convert Purple Pen (.ppen) to IOF 3.0 CourseData XML")
    parser.add_argument("inputs", nargs="+", help="Input .ppen file(s); multiple files are merged into one CourseData")
    parser.add_argument("-o", "--output", help="Output XML file (default: stdout)")
    parser.add_argument("-t", "--title", help="Event title (default: from first ppen file or 'Event')")
    parser.add_argument("--map-bounds",
                        help="Map bounds as 'left top right bottom' in mm (default: ppen print-area)")
    args = parser.parse_args()

    controls, courses, course_controls, scale, map_bounds, ppen_title = merge_ppen(args.inputs)
    if args.map_bounds:
        vals = args.map_bounds.split()
        if len(vals) != 4:
            parser.error("--map-bounds requires four values: left top right bottom")
        left, top, right, bottom = (float(v) for v in vals)
        map_bounds.update(left=left, top=top, right=right, bottom=bottom)

    event_title = args.title or ppen_title or "Event"

    root = build_iof_xml(controls, courses, course_controls, scale, map_bounds, event_title)

    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ")

    if args.output:
        tree.write(args.output, xml_declaration=True, encoding="UTF-8")
        print(f"Written to {args.output}", file=sys.stderr)
    else:
        tree.write(sys.stdout.buffer, xml_declaration=True, encoding="UTF-8")
        print(file=sys.stdout)


if __name__ == "__main__":
    main()
