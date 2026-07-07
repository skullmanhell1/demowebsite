#!/usr/bin/env python3
"""Generate warm, on-brand placeholder photos for the Ember & Olive food & drink demo.
Swap in real food photography at the same paths later."""
import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "images", "food-drink")
os.makedirs(OUT, exist_ok=True)

W, H = 1600, 1200

# Brand palette
ESPRESSO = (58, 32, 23)
BURNT = (143, 63, 34)
TERRACOTTA = (200, 95, 52)
TOMATO = (223, 112, 66)
OLIVE = (104, 112, 68)
HONEY = (231, 171, 72)
CREAM = (255, 248, 238)
CHAR = (29, 23, 19)

# filename: (color A, color B, accent, angle_deg, label)
SPECS = {
    "hero-restaurant.jpg":     (ESPRESSO,   TERRACOTTA, HONEY,  28, "THE DINING ROOM"),
    "starter-burrata.jpg":     (OLIVE,      HONEY,      CREAM,  40, "BURRATA"),
    "main-pasta.jpg":          (BURNT,      TERRACOTTA, HONEY,  22, "PAPPARDELLE RAGU"),
    "main-salmon.jpg":         (TERRACOTTA, HONEY,      CREAM,  34, "GRILLED SALMON"),
    "drink-cocktail.jpg":      (BURNT,      TOMATO,     HONEY,  52, "SPRITZ HOUR"),
    "dessert-tart.jpg":        (CHAR,       BURNT,      HONEY,  45, "CHOCOLATE TART"),
    "interior-ambiance.jpg":   (ESPRESSO,   BURNT,      HONEY,  18, "WARM & INVITING"),
    "chef-story.jpg":          (CHAR,       ESPRESSO,   HONEY,  30, "CHEF-LED KITCHEN"),
    "specials-flatlay.jpg":    (OLIVE,      BURNT,      HONEY,  62, "DAILY SPECIALS"),
    "food-truck.jpg":          (BURNT,      OLIVE,      HONEY,  34, "STREET KITCHEN"),
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
    img = Image.composite(accent_layer, img, glow.point(lambda v: int(v * 0.55)))

    vig = Image.new("L", (W, H), 0)
    ImageDraw.Draw(vig).ellipse([-W * 0.25, -H * 0.25, W * 1.25, H * 1.25], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(220)).point(lambda v: 255 - v)
    dark = Image.new("RGB", (W, H), CHAR)
    img = Image.composite(dark, img, vig.point(lambda v: int(v * 0.55)))

    draw = ImageDraw.Draw(img, "RGBA")
    draw.rectangle([26, 26, W - 27, H - 27], outline=(255, 255, 255, 40), width=2)

    cx, cy = W // 2, int(H * 0.44)
    r = 108
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 120), width=4)
    mono = load_font(110)
    tb = draw.textbbox((0, 0), "Eo", font=mono)
    draw.text((cx - (tb[2] - tb[0]) / 2, cy - (tb[3] - tb[1]) / 2 - tb[1]),
              "Eo", font=mono, fill=(255, 255, 255, 235))

    lab = load_font(56)
    lb = draw.textbbox((0, 0), label, font=lab)
    ly = cy + r + 60
    draw.text((cx - (lb[2] - lb[0]) / 2, ly), label, font=lab, fill=(255, 255, 255, 210))

    sub = load_font(30)
    s = "EMBER & OLIVE"
    sbb = draw.textbbox((0, 0), s, font=sub)
    draw.text((cx - (sbb[2] - sbb[0]) / 2, ly + 74), s, font=sub, fill=(255, 255, 255, 130))

    img.save(os.path.join(OUT, name), "JPEG", quality=82, optimize=True)
    return name


for fn, spec in SPECS.items():
    make(fn, *spec)
    print("wrote", fn)
print("done ->", OUT)
