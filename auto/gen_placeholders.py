#!/usr/bin/env python3
"""Generate clean, on-brand placeholder photos for the Redline AutoWorks demo.
Swap in real shop/vehicle photography at the same paths later."""
import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "images", "auto-repair")
os.makedirs(OUT, exist_ok=True)

W, H = 1600, 1200

# Brand palette
NAVY = (11, 35, 65)
BLUE = (21, 89, 166)
BLUE2 = (36, 120, 212)
RED = (214, 58, 49)
RED2 = (240, 88, 72)
AMBER = (242, 177, 63)
GRAPH = (32, 40, 51)
ICE = (238, 246, 255)
INK = (17, 25, 39)

# filename: (color A, color B, accent, angle_deg, label)
SPECS = {
    "hero-shop.jpg":              (NAVY,  BLUE,   RED,   28, "CERTIFIED SHOP"),
    "service-oil.jpg":            (NAVY,  BLUE,   AMBER, 40, "OIL CHANGE"),
    "service-brakes.jpg":         (GRAPH, RED,    AMBER, 34, "BRAKES"),
    "service-diagnostics.jpg":    (NAVY,  BLUE2,  RED,   22, "DIAGNOSTICS"),
    "service-ac.jpg":             (BLUE,  BLUE2,  ICE,   45, "A/C SERVICE"),
    "service-transmission.jpg":   (NAVY,  GRAPH,  BLUE,  52, "TRANSMISSION"),
    "service-tires.jpg":          (GRAPH, NAVY,   RED,   30, "TIRES"),
    "shop-interior.jpg":          (NAVY,  BLUE,   BLUE2, 18, "SHOP INTERIOR"),
    "team-mechanics.jpg":         (NAVY,  BLUE,   RED,   30, "OUR TECHNICIANS"),
    "fleet-service.jpg":          (GRAPH, BLUE,   RED2,  26, "FLEET SERVICE"),
}


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def load_font(size):
    for p in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSerif-Bold.ttf",
    ]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def make(name, ca, cb, accent, angle, label):
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
    for i in range(-H, W, 120):
        draw.line([(i, 0), (i + H, H)], fill=(255, 255, 255, 8), width=40)

    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse([-W * 0.2, -H * 0.35, W * 0.7, H * 0.6], fill=90)
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    accent_layer = Image.new("RGB", (W, H), accent)
    img = Image.composite(accent_layer, img, glow.point(lambda v: int(v * 0.5)))

    vig = Image.new("L", (W, H), 0)
    ImageDraw.Draw(vig).ellipse([-W * 0.25, -H * 0.25, W * 1.25, H * 1.25], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(220)).point(lambda v: 255 - v)
    dark = Image.new("RGB", (W, H), INK)
    img = Image.composite(dark, img, vig.point(lambda v: int(v * 0.55)))

    draw = ImageDraw.Draw(img, "RGBA")
    draw.rectangle([26, 26, W - 27, H - 27], outline=(255, 255, 255, 40), width=2)

    cx, cy = W // 2, int(H * 0.44)
    r = 108
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 120), width=4)
    mono = load_font(104)
    tb = draw.textbbox((0, 0), "Ra", font=mono)
    draw.text((cx - (tb[2] - tb[0]) / 2, cy - (tb[3] - tb[1]) / 2 - tb[1]),
              "Ra", font=mono, fill=(255, 255, 255, 235))

    lab = load_font(54)
    lb = draw.textbbox((0, 0), label, font=lab)
    ly = cy + r + 60
    draw.text((cx - (lb[2] - lb[0]) / 2, ly), label, font=lab, fill=(255, 255, 255, 210))

    sub = load_font(30)
    s = "REDLINE"
    sbb = draw.textbbox((0, 0), s, font=sub)
    draw.text((cx - (sbb[2] - sbb[0]) / 2, ly + 72), s, font=sub, fill=(255, 255, 255, 130))

    img.save(os.path.join(OUT, name), "JPEG", quality=82, optimize=True)
    return name


for fn, spec in SPECS.items():
    make(fn, *spec)
    print("wrote", fn)
print("done ->", OUT)
