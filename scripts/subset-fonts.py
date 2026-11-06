#!/usr/bin/env python3
"""
Build the display serif the site ships: Newsreader cut down to what the page
uses.

    python3 scripts/subset-fonts.py

The @fontsource-variable/newsreader Latin file is 132 KB, and it sits on the
critical path: the hero title waits for it before typing. The site only sets
Newsreader at weights 300 to 400 and at 28px and up, in English and Malay, so
this keeps:

  wght   300-400   (h1/h2 are 300, program names 400)
  opsz   28-72     (smallest serif text is 30px; opsz tops out at 72)
  glyphs ASCII plus typographic quotes, dashes, ellipsis and middle dot

That is about 38 KB. Anything outside the set falls back to the next font in
--serif. Rerun after adding serif text in another script or a lighter weight.

Needs fonttools with brotli (pip install fonttools brotli).
"""

import io
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "node_modules/@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2"
OUT = ROOT / "src/fonts/newsreader-display.woff2"

AXES = {"wght": (300, 400), "opsz": (28, 72)}
UNICODES = [*range(0x20, 0x7F), 0xA0, 0xB7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026]
FEATURES = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk"]


def main() -> None:
    font = instancer.instantiateVariableFont(TTFont(SRC), AXES)
    options = subset.Options()
    options.layout_features = FEATURES
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=UNICODES)
    subsetter.subset(font)
    font.flavor = "woff2"
    buf = io.BytesIO()
    font.save(buf)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(buf.getvalue())
    print(f"{OUT.relative_to(ROOT)}: {len(buf.getvalue()) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
