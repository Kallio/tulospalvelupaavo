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
            "page_width": int(pa.get("page-width", "827")),
            "page_height": int(pa.get("page-height", "1169")),
        }
    else:
        map_bounds = {"left": 0, "top": 600, "right": 200, "bottom": 0,
                       "page_width": 827, "page_height": 1169}

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
        courses.append({"name": name, "first_cc": first_cc})

    course_controls = {}
    for cc in root.findall("course-control"):
        ccid = cc.get("id")
        ctrl_id = cc.get("control")
        next_el = cc.find("next")
        next_cc = next_el.get("course-control") if next_el is not None else None
        course_controls[ccid] = {"control": ctrl_id, "next": next_cc}

    return controls, courses, course_controls, scale, map_bounds


def mm_to_px(x, y, bounds):
    map_w = bounds["right"] - bounds["left"]
    map_h = bounds["top"] - bounds["bottom"]
    px = (x - bounds["left"]) / map_w * bounds["page_width"]
    py = (bounds["top"] - y) / map_h * bounds["page_height"]
    return round(px, 1), round(py, 1)


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
        ordered.append(ctrl)
        ccid = cc["next"]

    legs = []
    total = 0
    for i in range(len(ordered) - 1):
        d = leg_length_m(ordered[i], ordered[i + 1], scale)
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
    ET.SubElement(map_el, "MapPositionTopLeft", x="0", y="0", unit="px")
    ET.SubElement(map_el, "MapPositionBottomRight",
                  x=str(map_bounds["page_width"]),
                  y=str(map_bounds["page_height"]),
                  unit="px")

    seen = set()
    for ctrl in controls.values():
        if ctrl["code"] in seen or ctrl["code"] is None:
            continue
        seen.add(ctrl["code"])
        ctrl_el = ET.SubElement(rcd, "Control")
        ET.SubElement(ctrl_el, "Id").text = ctrl["code"]
        px, py = mm_to_px(ctrl["x"], ctrl["y"], map_bounds)
        ET.SubElement(ctrl_el, "MapPosition", x=str(px), y=str(py), unit="px")

    for course in courses:
        seq, legs, total = traverse_course(course["first_cc"], course_controls, controls, scale)

        course_el = ET.SubElement(rcd, "Course")
        n = ET.SubElement(course_el, "Name")
        n.text = course["name"]

        for i, ctrl in enumerate(seq):
            cc_el = ET.SubElement(course_el, "CourseControl")
            if ctrl["kind"] == "start":
                cc_el.set("type", "Start")
            elif ctrl["kind"] == "finish":
                cc_el.set("type", "Finish")
            else:
                cc_el.set("type", "Control")
            c = ET.SubElement(cc_el, "Control")
            if ctrl["code"]:
                c.text = ctrl["code"]
            elif ctrl["kind"] == "start":
                c.text = "S1"
            elif ctrl["kind"] == "finish":
                c.text = "F1"
            if i < len(legs):
                ll = ET.SubElement(cc_el, "LegLength")
                ll.text = str(legs[i])

        ET.SubElement(course_el, "Length").text = str(total)
        ET.SubElement(course_el, "Climb").text = "0"

    for course in courses:
        a = ET.SubElement(rcd, "ClassCourseAssignment")
        cn = ET.SubElement(a, "ClassName")
        cn.text = course["name"]
        ccn = ET.SubElement(a, "CourseName")
        ccn.text = course["name"]

    return root


def main():
    parser = argparse.ArgumentParser(description="Convert Purple Pen (.ppen) to IOF 3.0 CourseData XML")
    parser.add_argument("input", help="Input .ppen file")
    parser.add_argument("-o", "--output", help="Output XML file (default: stdout)")
    parser.add_argument("-t", "--title", help="Event title (default: from ppen or 'Event')")
    args = parser.parse_args()

    controls, courses, course_controls, scale, map_bounds = parse_ppen(args.input)

    event_title = args.title
    if not event_title:
        tree = ET.parse(args.input)
        title_el = tree.getroot().find(".//event/title")
        event_title = title_el.text if title_el is not None else "Event"

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
