#!/usr/bin/env python3
"""
Build the display serif the site ships: Anthropic Serif Display Light from the
Claude Community event kit, cut down to what the page uses.

    python3 scripts/subset-fonts.py <kit-fonts-dir>

<kit-fonts-dir> is the event kit's "03 Font files" folder; it must contain
AnthropicSerifDisplay-Light-Static.otf. The font is an Anthropic brand asset
(see TRADEMARKS.md): forks for other cities build it from their own kit.

The kit has the Light roman only, so the page sets no serif italics. The
subset keeps ASCII plus typographic quotes, dashes, ellipsis and middle dot;
anything else falls back to the next font in --serif. Rerun after adding
serif text in another script.

Needs fonttools with brotli (pip install fonttools brotli).
"""

import io
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SRC_NAME = "AnthropicSerifDisplay-Light-Static.otf"
OUT = ROOT / "src/fonts/anthropic-serif-display-light.woff2"

UNICODES = [*range(0x20, 0x7F), 0xA0, 0xB7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026]
FEATURES = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk"]


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1]).expanduser() / SRC_NAME
    if not src.is_file():
        sys.exit(f"missing {src}")
    font = TTFont(src)
    options = subset.Options()
    options.layout_features = FEATURES
    options.notdef_outline = True
    options.name_IDs = ["*"]  # keep the copyright and licence records
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
