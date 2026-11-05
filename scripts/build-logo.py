#!/usr/bin/env python3
"""
Build the Claude Community KL logo set as self-contained SVGs.

All text is converted to outlines from the brand fonts, so the files render
identically everywhere and the fonts themselves are never shipped.

    python3 scripts/build-logo.py <fonts-dir> [out-dir]

<fonts-dir> must contain label-sans.otf (Anthropic Sans Display Semibold) and
name-serif.otf (Anthropic Serif Display Light) from the city-community-assets
skill. Output defaults to public/brand/logo.

Files:
  symbol.svg          twin-tower mark, ink, transparent
  symbol-tile.svg     mark on a clay tile (favicon / avatar)
  badge.svg           circular badge, full colour
  badge-ink.svg       circular badge, one colour (ink)
  lockup.svg          Claude spark on clay + wordmark, for light backgrounds
  lockup-ivory.svg    Claude spark on clay + wordmark, for dark backgrounds
  spark.svg           the Claude spark alone, clay
  ../og.png           1200x630 link preview
  ../../favicon.ico   towers tile for browsers that request /favicon.ico

The spark comes from brand-src/claude-spark.svg, traced from the official
Claude Community event deck.
"""
import math
import os
import re
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

CLAY = "#D97757"
INK = "#141413"
IVORY = "#FAF9F5"


def rgb(hex_colour):
    return tuple(int(hex_colour[i : i + 2], 16) for i in (1, 3, 5))


def num(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s


# ---------------------------------------------------------------- type


class Face:
    def __init__(self, path):
        self.path = path
        self.font = TTFont(path)
        self.glyphs = self.font.getGlyphSet()
        self.cmap = self.font.getBestCmap()
        self.upm = self.font["head"].unitsPerEm
        self.cap = self.font["OS/2"].sCapHeight / self.upm  # cap height in em

    def size_for_cap(self, cap_px):
        return cap_px / self.cap

    def advance(self, ch, size, tracking=0.0):
        g = self.cmap[ord(ch)]
        return self.glyphs[g].width / self.upm * size + tracking * size

    def width(self, text, size, tracking=0.0):
        # Tracking sits between glyphs, not after the last one.
        return sum(self.advance(c, size, tracking) for c in text) - tracking * size

    def glyph_path(self, ch, transform):
        """Outline of one glyph. `transform` maps font units to SVG space."""
        pen = SVGPathPen(self.glyphs, ntos=num)
        self.glyphs[self.cmap[ord(ch)]].draw(TransformPen(pen, transform))
        return pen.getCommands()

    def line(self, text, size, x, baseline, tracking=0.0):
        s = size / self.upm
        out, cx = [], x
        for ch in text:
            if ch != " ":
                out.append(self.glyph_path(ch, (s, 0, 0, -s, cx, baseline)))
            cx += self.advance(ch, size, tracking)
        return " ".join(out)

    def arc(self, text, size, cx, cy, r, center_deg, tracking=0.0, inside=False):
        """
        Set `text` on a circle centred at `center_deg` (SVG angles: 0 = east,
        90 = south). Outside text (top) reads clockwise with letters pointing
        away from the centre; inside text (bottom) reads counter-clockwise with
        letters pointing toward the centre. `r` is the baseline radius.
        """
        s = size / self.upm
        total = self.width(text, size, tracking)
        direction = -1 if inside else 1
        pos = -total / 2
        out = []
        for ch in text:
            adv = self.advance(ch, size, tracking)
            glyph_w = adv - tracking * size
            mid = pos + glyph_w / 2
            theta = math.radians(center_deg) + direction * mid / r
            if ch != " ":
                rot = theta + (math.pi / 2 if not inside else -math.pi / 2)
                c, si = math.cos(rot), math.sin(rot)
                px, py = cx + r * math.cos(theta), cy + r * math.sin(theta)
                # glyph-local (x right, y up), x shifted so the glyph is centred
                # on its arc position, then rotated and moved onto the circle.
                ox = -glyph_w / 2
                t = (
                    c * s,
                    si * s,
                    si * s,
                    -c * s,
                    px + c * ox,
                    py + si * ox,
                )
                out.append(self.glyph_path(ch, t))
            pos += adv
        return " ".join(out)


# ---------------------------------------------------------------- mark

# Petronas Twin Towers in elevation, on a 100-unit grid. Each tower steps
# back four times and ends in a spire; the skybridge and its inverted-V
# support sit between them. `base` lets the badge run the towers past its
# clip circle so they read as rising out of the ground.


def tower_path(cx, base):
    # Left side up the setbacks, spire, right side back down.
    return (
        f"M{num(cx - 9)} {num(base)} V44 H{num(cx - 7)} V32 H{num(cx - 5)} V22 H{num(cx - 3)} V14 H{num(cx - 1.5)} "
        f"L{num(cx)} 2 L{num(cx + 1.5)} 14 H{num(cx + 3)} V22 H{num(cx + 5)} V32 H{num(cx + 7)} V44 H{num(cx + 9)} "
        f"V{num(base)} Z"
    )


def mark_paths(base=90):
    bridge = "M43 52 H57 V56 H43 Z"
    legs = "M47.6 56 H52.4 L57 64.4 V68.6 L50 58.6 L43 68.6 V64.4 Z"
    return " ".join([tower_path(34, base), tower_path(66, base), bridge, legs])


# ---------------------------------------------------------------- files


def svg(w, h, body, title):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {num(w)} {num(h)}" role="img" aria-label="{title}">'
        f"<title>{title}</title>{body}</svg>\n"
    )


TITLE = "Claude Community Kuala Lumpur"


def symbol():
    return svg(100, 92, f'<path fill="{INK}" d="{mark_paths()}"/>', TITLE)


def frame(x, y, size, border):
    """Ink square with a clay square inset by `border`."""
    inner = size - 2 * border
    return (
        f'<rect x="{num(x)}" y="{num(y)}" width="{num(size)}" height="{num(size)}" fill="{INK}"/>'
        f'<rect x="{num(x + border)}" y="{num(y + border)}" width="{num(inner)}" height="{num(inner)}" fill="{CLAY}"/>'
    )


def tile_layout(size, border):
    """Towers placement inside a tile: (inner, scale, x offset, y offset)."""
    inner = size - 2 * border
    k = inner / 100 * 0.94
    return inner, k, size / 2 - 50 * k, border + inner * 0.08 - 2 * k


def tile(size=120, border=6, clip_id="tile"):
    """Clay square, ink frame, towers rising from the bottom edge."""
    inner, k, tx, ty = tile_layout(size, border)
    return (
        f'<clipPath id="{clip_id}"><rect x="{num(border)}" y="{num(border)}" '
        f'width="{num(inner)}" height="{num(inner)}"/></clipPath>'
        + frame(0, 0, size, border)
        + f'<g clip-path="url(#{clip_id})"><path fill="{INK}" transform="translate({num(tx)} {num(ty)}) scale({num(k)})" '
        f'd="{mark_paths(base=140)}"/></g>'
    )


SPARK_SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "brand-src", "claude-spark.svg")


def load_spark():
    """The traced spark: viewBox (x, y, size), its group transform as an affine, and path data."""
    src = open(SPARK_SRC).read()
    vx, vy, vw, _ = (float(v) for v in re.search(r'viewBox="([^"]+)"', src).group(1).split())
    t = re.search(r'<g transform="([^"]+)"', src).group(1)
    tx, ty = (float(v) for v in re.search(r"translate\(([^)]+)\)", t).group(1).split(","))
    sx, sy = (float(v) for v in re.search(r"scale\(([^)]+)\)", t).group(1).split(","))
    d = re.search(r'<path[^>]* d="([^"]+)"', src).group(1)
    return (vx, vy, vw), (sx, 0, 0, sy, tx, ty), d


def spark_matrix(x, y, size, spark, fill=0.62):
    """Affine that fits the spark at `fill` of a square, centred."""
    (vx, vy, vw), (a, b, c, d, e, f), _ = spark
    k = size * fill / vw
    ox = x + size / 2 - (vx + vw / 2) * k
    oy = y + size / 2 - (vy + vw / 2) * k
    return (a * k, b * k, c * k, d * k, e * k + ox, f * k + oy)


def spark_tile(spark, x=0, y=0, size=120):
    """Clay square with the official Claude spark in ivory, no frame."""
    m = " ".join(f"{v:.5f}" for v in spark_matrix(x, y, size, spark))
    return (
        f'<rect x="{num(x)}" y="{num(y)}" width="{num(size)}" height="{num(size)}" fill="{CLAY}"/>'
        f'<path fill="{IVORY}" transform="matrix({m})" d="{spark[2]}"/>'
    )


def spark_mark(spark, fill=CLAY):
    """The spark alone on a 100-unit square, for inline use (e.g. the marquee)."""
    m = " ".join(f"{v:.5f}" for v in spark_matrix(0, 0, 100, spark, fill=1.0))
    return svg(100, 100, f'<path fill="{fill}" transform="matrix({m})" d="{spark[2]}"/>', "Claude")


def symbol_tile():
    return svg(120, 120, tile(), TITLE)


def badge(sans, mono=False):
    S, C = 512, 256
    ring_r, inner_r = 248, 170
    cap = 28
    size = sans.size_for_cap(cap)
    r_top = 196  # baseline of the top arc; letters grow outward to r_top + cap
    r_bottom = r_top + cap  # baseline of the bottom arc; letters grow inward
    band_mid = r_top + cap / 2
    tracking = 0.14

    top = sans.arc("CLAUDE COMMUNITY", size, C, C, r_top, -90, tracking)
    bottom = sans.arc("KUALA LUMPUR", size, C, C, r_bottom, 90, tracking, inside=True)

    k = 3.1
    tx, ty = C - 50 * k, C - inner_r + 24 - 2 * k
    towers = f'<path transform="translate({num(tx)} {num(ty)}) scale({k})" d="{mark_paths(base=120)}"/>'
    dots = "".join(
        f'<circle cx="{num(C + band_mid * math.cos(a))}" cy="{num(C + band_mid * math.sin(a))}" r="7"/>'
        for a in (0, math.pi)
    )

    if mono:
        body = (
            f'<g fill="{INK}">'
            f'<circle cx="{C}" cy="{C}" r="246" fill="none" stroke="{INK}" stroke-width="12"/>'
            f'<path d="{top} {bottom}"/>{dots}'
            f'<circle cx="{C}" cy="{C}" r="{inner_r}" fill="none" stroke="{INK}" stroke-width="6"/>'
            f'<clipPath id="inner"><circle cx="{C}" cy="{C}" r="{inner_r - 3}"/></clipPath>'
            f'<g clip-path="url(#inner)">{towers}</g></g>'
        )
    else:
        body = (
            f'<circle cx="{C}" cy="{C}" r="252" fill="{INK}"/>'
            f'<circle cx="{C}" cy="{C}" r="{ring_r - 8}" fill="{CLAY}"/>'
            f'<path fill="{IVORY}" d="{top} {bottom}"/>'
            f'<g fill="{IVORY}">{dots}</g>'
            f'<circle cx="{C}" cy="{C}" r="{inner_r + 3}" fill="{INK}"/>'
            f'<circle cx="{C}" cy="{C}" r="{inner_r - 3}" fill="{IVORY}"/>'
            f'<clipPath id="inner"><circle cx="{C}" cy="{C}" r="{inner_r - 3}"/></clipPath>'
            f'<g clip-path="url(#inner)" fill="{INK}">{towers}</g>'
        )
    return svg(S, S, body, TITLE)


def lockup(sans, serif, spark, ink=INK):
    H = 120
    gap = 28
    line1_size = sans.size_for_cap(24)
    line2_size = serif.size_for_cap(54)
    tracking = 0.12
    x0 = H + gap
    l1 = sans.line("CLAUDE COMMUNITY", line1_size, x0, 36, tracking)
    l2 = serif.line("Kuala Lumpur", line2_size, x0 - 2, 102)
    w = x0 + max(sans.width("CLAUDE COMMUNITY", line1_size, tracking), serif.width("Kuala Lumpur", line2_size)) + 4
    body = spark_tile(spark) + f'<path fill="{ink}" d="{l1} {l2}"/>'
    return svg(w, H, body, TITLE)


# ---------------------------------------------------------------- share image


def path_polys(d, m):
    """
    Flatten an SVG path (M/L/H/V/C/Z, absolute or relative) into polygons.
    `m` is an affine (a, b, c, d, e, f) applied to every point.
    """
    toks = re.findall(r"[MLHVCZmlhvcz]|-?\d*\.?\d+(?:e-?\d+)?", d)
    a, b, c, dd, e, f = m
    tf = lambda x, y: (a * x + c * y + e, b * x + dd * y + f)
    polys, cur = [], []
    x = y = sx = sy = 0.0
    cmd = None
    i = 0

    def nums(n):
        nonlocal i
        out = [float(t) for t in toks[i : i + n]]
        i += n
        return out

    while i < len(toks):
        if re.fullmatch(r"[A-Za-z]", toks[i]):
            cmd = toks[i]
            i += 1
            if cmd in "Zz":
                if cur:
                    polys.append(cur)
                cur, x, y = [], sx, sy
                continue
        rel = cmd.islower()
        C = cmd.upper()
        if C == "M":
            nx, ny = nums(2)
            x, y = (x + nx, y + ny) if rel else (nx, ny)
            if cur:
                polys.append(cur)
            cur, sx, sy = [tf(x, y)], x, y
            cmd = "l" if rel else "L"
        elif C == "L":
            nx, ny = nums(2)
            x, y = (x + nx, y + ny) if rel else (nx, ny)
            cur.append(tf(x, y))
        elif C == "H":
            (nx,) = nums(1)
            x = x + nx if rel else nx
            cur.append(tf(x, y))
        elif C == "V":
            (ny,) = nums(1)
            y = y + ny if rel else ny
            cur.append(tf(x, y))
        elif C == "C":
            x1, y1, x2, y2, nx, ny = nums(6)
            if rel:
                x1, y1, x2, y2, nx, ny = x + x1, y + y1, x + x2, y + y2, x + nx, y + ny
            for k in range(1, 13):
                t = k / 12
                u = 1 - t
                px = u**3 * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t**3 * nx
                py = u**3 * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t**3 * ny
                cur.append(tf(px, py))
            x, y = nx, ny
    if cur:
        polys.append(cur)
    return polys


def og_image(sans, serif, spark, out_path):
    """1200x630 link preview, drawn at 2x and downsampled. Text is sized from
    the same font metrics as the SVG lockup (Face.size_for_cap)."""
    from PIL import Image, ImageDraw, ImageFont

    S = 2
    W, H = 1200 * S, 630 * S
    clay, ink, ivory = rgb(CLAY), rgb(INK), rgb(IVORY)
    im = Image.new("RGB", (W, H), clay)
    dr = ImageDraw.Draw(im, "RGBA")

    for gx in range(0, W, 40 * S):
        dr.line([(gx, 0), (gx, H)], fill=(*ink, 20), width=S)
    for gy in range(0, H, 40 * S):
        dr.line([(0, gy), (W, gy)], fill=(*ink, 20), width=S)

    def font_for_cap(face, cap):
        return ImageFont.truetype(face.path, round(face.size_for_cap(cap) * S))

    def tracked(text, xy, font, fill, tracking=0.0):
        x, y = xy
        for ch in text:
            dr.text((x, y), ch, font=font, fill=fill, anchor="ls")
            x += font.getlength(ch) + tracking * font.size

    def tracked_width(text, font, tracking=0.0):
        return sum(font.getlength(c) for c in text) + tracking * font.size * (len(text) - 1)

    # spark (on the clay background it needs no tile) + kicker
    tx, ty, ts = 64 * S, 96 * S, 76 * S
    for poly in path_polys(spark[2], spark_matrix(tx, ty, ts, spark, fill=0.8)):
        dr.polygon(poly, fill=ivory)
    kicker = font_for_cap(sans, 22)
    tracked("CLAUDE COMMUNITY", (tx + ts + 22 * S, ty + ts / 2 + 11 * S), kicker, ink, 0.12)

    # city name, fitted to the left column
    cap = 118
    while True:
        name_font = font_for_cap(serif, cap)
        if name_font.getlength("Kuala Lumpur") <= 720 * S or cap < 60:
            break
        cap -= 2
    dr.text((60 * S, 344 * S), "Kuala Lumpur", font=name_font, fill=ink, anchor="ls")

    # tagline chip
    chip = font_for_cap(sans, 17)
    label = "Build. Ship. Lepak."
    cw = tracked_width(label, chip, 0.04)
    cx0, cy0 = 64 * S, 382 * S
    dr.rectangle([cx0, cy0, cx0 + cw + 28 * S, cy0 + 44 * S], fill=ink)
    tracked(label, (cx0 + 14 * S, cy0 + 30 * S), chip, ivory, 0.04)

    # sun + twin towers standing on the ground line
    ground = 560 * S
    sun = (1000 * S, 150 * S, 44 * S)
    dr.ellipse([sun[0] - sun[2], sun[1] - sun[2], sun[0] + sun[2], sun[1] + sun[2]], fill=ivory, outline=ink, width=6 * S)
    kt = (ground - 70 * S) / 88
    for poly in path_polys(mark_paths(base=90), (kt, 0, 0, kt, 1000 * S - 50 * kt, ground - 90 * kt)):
        dr.polygon(poly, fill=ivory, outline=ink, width=6 * S)

    # ground + strip
    dr.rectangle([0, ground - 3 * S, W, H], fill=ink)
    base = ground + 44 * S
    domain = font_for_cap(sans, 17)
    tracked("CLAUDEKL.COM", (64 * S, base), domain, ivory, 0.12)
    small = font_for_cap(sans, 13)
    programs = "MEETUP \u00b7 COWORK \u00b7 CLAUDE CODE \u00b7 CONVERSATIONS"
    tracked(programs, (W - 64 * S - tracked_width(programs, small, 0.12), base), small, clay, 0.12)

    im.resize((1200, 630), Image.LANCZOS).save(out_path, optimize=True)


def favicon_ico(out_path):
    """The towers tile as a 16/32/48px .ico for browsers that ask for /favicon.ico.
    Same layout as tile(); the bottom frame bar is drawn last to clip the towers."""
    from PIL import Image, ImageDraw

    size = 480  # draw big, let Pillow downsample per icon size
    border = size * 6 / 120
    _, k, tx, ty = tile_layout(size, border)
    im = Image.new("RGB", (size, size), rgb(INK))
    dr = ImageDraw.Draw(im)
    dr.rectangle([border, border, size - border, size - border], fill=rgb(CLAY))
    for poly in path_polys(mark_paths(base=140), (k, 0, 0, k, tx, ty)):
        dr.polygon(poly, fill=rgb(INK))
    dr.rectangle([0, size - border, size, size], fill=rgb(INK))
    im.save(out_path, sizes=[(16, 16), (32, 32), (48, 48)])

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    fonts = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join("public", "brand", "logo")
    os.makedirs(out, exist_ok=True)
    sans = Face(os.path.join(fonts, "label-sans.otf"))
    serif = Face(os.path.join(fonts, "name-serif.otf"))

    spark = load_spark()
    files = {
        "symbol.svg": symbol(),
        "symbol-tile.svg": symbol_tile(),
        "badge.svg": badge(sans),
        "badge-ink.svg": badge(sans, mono=True),
        "spark.svg": spark_mark(spark),
        "lockup.svg": lockup(sans, serif, spark),
        "lockup-ivory.svg": lockup(sans, serif, spark, ink=IVORY),
    }
    og_path = os.path.join(out, "..", "og.png")
    og_image(sans, serif, spark, og_path)
    print(f"  wrote {os.path.normpath(og_path)}  (1200x630)")
    ico_path = os.path.join(out, "..", "..", "favicon.ico")
    favicon_ico(ico_path)
    print(f"  wrote {os.path.normpath(ico_path)}")
    for name, content in files.items():
        with open(os.path.join(out, name), "w") as f:
            f.write(content)
        print(f"  wrote {os.path.join(out, name)}  ({len(content) // 1024 or 1} KB)")


if __name__ == "__main__":
    main()
