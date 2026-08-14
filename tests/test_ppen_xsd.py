#!/usr/bin/env python3
"""Validate ppen_to_iof.py's IOF 3.0 CourseData XML against the official IOF
XSD (vendored in tests/iof-xsd/IOF.xsd).

Requires lxml or xmlschema; the test is skipped when neither is installed.
"""

import os
import sys
import unittest

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO)

import ppen_to_iof  # noqa: E402

PEN_FILES = [
    "Pokaalijahti_hd16.ppen",
    "Pokaalijahti_suorat.ppen",
    "Pokaalijahti_tukireitti.ppen",
    "Pokaalijahti2026_siimari (1).ppen",
]

try:
    from lxml import etree  # noqa: F401
    VALIDATOR = "lxml"
except ImportError:
    try:
        import xmlschema  # noqa: F401
        VALIDATOR = "xmlschema"
    except ImportError:
        VALIDATOR = None


class IofXsdTest(unittest.TestCase):
    def setUp(self):
        self.paths = [os.path.join(REPO, "exampledata", p) for p in PEN_FILES]
        self.xsd_path = os.path.join(REPO, "tests", "iof-xsd", "IOF.xsd")

    def test_xsd_file_present(self):
        self.assertTrue(os.path.isfile(self.xsd_path), "IOF.xsd not vendored")

    def test_real_files_merge(self):
        controls, courses, _cc, _scale, _bounds, _title = ppen_to_iof.merge_ppen(self.paths)
        self.assertGreater(len(courses), 0)
        self.assertGreater(len(controls), 0)

    @unittest.skipUnless(VALIDATOR, "lxml or xmlschema not installed")
    def test_course_data_validates_against_official_xsd(self):
        controls, courses, course_controls, scale, bounds, title = ppen_to_iof.merge_ppen(self.paths)
        root = ppen_to_iof.build_iof_xml(controls, courses, course_controls, scale, bounds, title)
        xml_bytes = ppen_to_iof.ET.tostring(root, encoding="UTF-8", xml_declaration=True)
        if VALIDATOR == "lxml":
            schema = etree.XMLSchema(etree.parse(self.xsd_path))
            schema.assertValid(etree.fromstring(xml_bytes))
        else:
            xmlschema.XMLSchema(self.xsd_path).validate(xml_bytes)


if __name__ == "__main__":
    unittest.main()
