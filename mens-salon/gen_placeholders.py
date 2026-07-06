#!/usr/bin/env python3
"""Generate warm, on-brand placeholder photos for The Gentry Room men's salon demo.
These stand in until real salon photography is dropped in at the same paths."""
import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "images", "mens-salon")
os.makedirs(OUT, exist_ok=True)

W, H = 1600, 1200

# Brand palette
CHARCOAL = (33, 29, 27)
WALNUT = (91, 56, 44)
COPPER = (183, 116, 71)
AMBER = (217, 162, 87)
CREAM = (248, 239, 227)
INK = (23, 19, 18)

# filename: (color A, color B, accent, angle_deg, label)
SPECS = {
    "hero-lounge.jpg":            (CHARCOAL, WALNUT, AMBER, 28,  "THE LOUNGE"),
    "service-cuts.jpg":           (WALNUT,   COPPER, CREAM, 40,  "HAIRCUTS"),
    "service-beard.jpg":          (CHARCOAL, COPPER, AMBER, 18,  "BEARD WORK"),
    "service-shave.jpg":          (INK,      WALNUT, AMBER, 52,  "HOT TOWEL SHAVE"),
    "service-color.jpg":          (WALNUT,   AMBER,  CREAM, 34,  "COLOUR & GROOMING"),
    "portfolio-fade.jpg":         (CHARCOAL, COPPER, AMBER, 62,  "SKIN FADE"),
    "portfolio-classic.jpg":      (WALNUT,   CHARCOAL, AMBER, 22, "CLASSIC CUT"),
    "portfolio-before-after.jpg": (INK,      COPPER, AMBER, 45,  "TRANSFORMATION"),
    "barber-eli.jpg":             (CHARCOAL, WALNUT, AMBER, 30,  "ELI CROSS"),
    "barber-noah.jpg":            (WALNUT,   COPPER, CREAM, 30,  "NOAH VALE"),
}


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def load_font(size):
    for p in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    ]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def make(name, ca, cb, accent, angle, label):
    # diagonal gradient
    img = Image.new("RGB", (W, H), ca)
    px = img.load()
    rad = math.radians(angle)
    dx, dy = math.cos(rad), math.sin(rad)
    maxd = abs(W * dx) + abs(H * dy)
    for y in range(H):
        for x in range(0, W, 2):
            t = ((x * dx + y * dy) / maxd + 0.25)
            t = min(1.0, max(0.0, t))
            c = lerp(ca, cb, t)
            px[x, y] = c
            if x + 1 < W:
                px[x + 1, y] = c

    draw = ImageDraw.Draw(img, "RGBA")

    # soft diagonal light streaks for texture
    for i in range(-H, W, 120):
        draw.line([(i, 0), (i + H, H)], fill=(255, 255, 255, 8), width=40)

    # warm radial highlight (top-left)
    glow = Image.new("L", (W, H), 0)
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-W * 0.2, -H * 0.35, W * 0.7, H * 0.6], fill=90)
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    accent_layer = Image.new("RGB", (W, H), accent)
    img = Image.composite(accent_layer, img, glow.point(lambda v: int(v * 0.55)))

    draw = ImageDraw.Draw(img, "RGBA")

    # vignette
    vig = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-W * 0.25, -H * 0.25, W * 1.25, H * 1.25], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(220)).point(lambda v: 255 - v)
    dark = Image.new("RGB", (W, H), INK)
    img = Image.composite(dark, img, vig.point(lambda v: int(v * 0.55)))

    draw = ImageDraw.Draw(img, "RGBA")

    # thin accent frame
    draw.rectangle([26, 26, W - 27, H - 27], outline=(255, 255, 255, 40), width=2)

    # centered monogram circle + label
    cx, cy = W // 2, int(H * 0.44)
    r = 108
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 120), width=4)
    mono = load_font(120)
    tb = draw.textbbox((0, 0), "GR", font=mono)
    draw.text((cx - (tb[2] - tb[0]) / 2, cy - (tb[3] - tb[1]) / 2 - tb[1]),
              "GR", font=mono, fill=(255, 255, 255, 235))

    lab = load_font(58)
    lb = draw.textbbox((0, 0), label, font=lab)
    ly = cy + r + 60
    draw.text((cx - (lb[2] - lb[0]) / 2, ly), label, font=lab, fill=(255, 255, 255, 210))

    sub = load_font(30)
    s = "THE GENTRY ROOM"
    sbb = draw.textbbox((0, 0), s, font=sub)
    draw.text((cx - (sbb[2] - sbb[0]) / 2, ly + 78), s, font=sub, fill=(255, 255, 255, 130))

    img.save(os.path.join(OUT, name), "JPEG", quality=82, optimize=True)
    return name


for fn, spec in SPECS.items():
    make(fn, *spec)
    print("wrote", fn)
print("done ->", OUT)
