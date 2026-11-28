"""Make the app icon, adaptive icon, logo and splash: an element tile 'Eg' (Energiegedrag) as in the
periodic table, number 21 (°C, a usual thermostat setting) and unit J (joule). Needs Pillow; uses Roboto
from ../fonts (Apache 2.0). Run from anywhere: python make_icons.py

Colours and texts come from ../../brand.json (see BRANDING.md): the tile runs from the primary colour
(VOLT) to the accent (SPARK) with white text, glowing on the backdrop (MIDNIGHT). Usually run through
apply_brand.py, which also updates app.json.
"""
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent
FONTS = ASSETS / "fonts"
BRAND_FILE = ASSETS.parent / "brand.json"
BRAND = json.loads(BRAND_FILE.read_text(encoding="utf-8"))


def rgb(hex_colour: str) -> tuple:
    h = hex_colour.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


MIDNIGHT = rgb(BRAND["brand"]["backdrop"])
DEEP = rgb(BRAND["brand"]["deep"])
VOLT = rgb(BRAND["brand"]["primary"])
MID = rgb(BRAND["brand"]["mid"])
SPARK = rgb(BRAND["brand"]["accent"])
ICON = BRAND["icon"]
WHITE = (255, 255, 255)
SS = 4  # supersampling


def font(weight: str, size: float) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / f"Roboto-{weight}.ttf"), int(size))


def lerp(a: tuple, b: tuple, t: float) -> tuple:
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def diagonal_gradient(size: int, stops: list[tuple[float, tuple]]) -> Image.Image:
    """A square from top-left to bottom-right through the colour stops (offset, rgb)."""
    small = 256
    img = Image.new("RGB", (small, small))
    px = img.load()
    for y in range(small):
        for x in range(small):
            t = (x + y) / (2 * (small - 1))
            for (o0, c0), (o1, c1) in zip(stops, stops[1:]):
                if o0 <= t <= o1:
                    px[x, y] = lerp(c0, c1, (t - o0) / (o1 - o0))
                    break
    return img.resize((size, size), Image.BICUBIC)


def radial_glow(size: int, centre: tuple[float, float], radius: float, colour: tuple, strength: float) -> Image.Image:
    """RGBA: colour fading from the centre (fractions of size) out to radius (fraction of size)."""
    small = 256
    mask = Image.new("L", (small, small), 0)
    px = mask.load()
    cx, cy, r = centre[0] * small, centre[1] * small, radius * small
    for y in range(small):
        for x in range(small):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / r
            px[x, y] = round(255 * strength * max(0.0, 1 - d) ** 2)
    glow = Image.new("RGBA", (size, size), colour + (0,))
    glow.putalpha(mask.resize((size, size), Image.BICUBIC))
    return glow


def backdrop(w: int, h: int) -> Image.Image:
    """Midnight blue with a deep-blue glow behind the middle and a cyan one in the top right corner."""
    img = Image.new("RGBA", (w, h), MIDNIGHT + (255,))
    side = max(w, h)
    glow = radial_glow(side, (0.5, 0.5), 0.55, DEEP, 0.9).crop(((side - w) // 2, (side - h) // 2,
                                                                 (side - w) // 2 + w, (side - h) // 2 + h))
    img.alpha_composite(glow)
    corner = radial_glow(side, (0.95, 0.02), 0.45, SPARK, 0.18).crop((side - w, 0, side, h))
    img.alpha_composite(corner)
    return img


def tile(img: Image.Image, x: float, y: float, s: float, name: bool = False, glow: bool = True) -> None:
    """An element tile of size s with its top-left corner at (x, y), drawn onto RGBA img."""
    x, y, s = int(x), int(y), int(s)
    radius = int(s * 0.16)
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, s - 1, s - 1), radius=radius, fill=255)

    if glow:  # a cyan halo under the tile
        pad = int(s * 0.35)
        halo = Image.new("L", (s + 2 * pad, s + 2 * pad), 0)
        halo.paste(mask, (pad, pad))
        halo = halo.filter(ImageFilter.GaussianBlur(s * 0.09))
        halo = halo.point(lambda v: int(v * 0.75))
        layer = Image.new("RGBA", halo.size, SPARK + (0,))
        layer.putalpha(halo)
        img.alpha_composite(layer, (x - pad, y - pad + int(s * 0.03)))

    face = diagonal_gradient(s, [(0.0, VOLT), (0.55, MID), (1.0, SPARK)]).convert("RGBA")
    # A soft sheen over the top half, as light on glass.
    sheen = Image.new("L", (s, s), 0)
    ImageDraw.Draw(sheen).ellipse((-s * 0.4, -s * 0.95, s * 1.3, s * 0.42), fill=30)
    sheen = sheen.filter(ImageFilter.GaussianBlur(s * 0.12))
    face = Image.composite(Image.new("RGBA", (s, s), WHITE + (255,)), face, sheen)
    # A thin light edge.
    edge = Image.new("L", (s, s), 0)
    ImageDraw.Draw(edge).rounded_rectangle((0, 0, s - 1, s - 1), radius=radius, outline=90, width=max(2, s // 120))
    face = Image.composite(Image.new("RGBA", (s, s), WHITE + (255,)), face, ImageChops.multiply(edge, mask))

    symbol_y = s * (0.52 if name else 0.57)
    # A soft shadow under the symbol for depth.
    shadow = Image.new("L", (s, s), 0)
    ImageDraw.Draw(shadow).text((s / 2, symbol_y + s * 0.02), ICON["symbol"], font=font("Black", s * 0.50), fill=110,
                                anchor="mm")
    shadow = shadow.filter(ImageFilter.GaussianBlur(s * 0.018))
    face = Image.composite(Image.new("RGBA", (s, s), (6, 30, 110, 255)), face, shadow)

    d = ImageDraw.Draw(face)
    pad = s * 0.1
    d.text((pad, pad * 0.75), ICON["number"], font=font("Bold", s * 0.15), fill=WHITE)
    d.text((s - pad, pad * 0.75), ICON["unit"], font=font("Medium", s * 0.14), fill=(255, 255, 255, 220), anchor="ra")
    d.text((s / 2, symbol_y), ICON["symbol"], font=font("Black", s * 0.50), fill=WHITE, anchor="mm")
    if name:
        d.text((s / 2, s * 0.855), ICON["caption"], font=font("Medium", s * 0.105), fill=(255, 255, 255, 235),
               anchor="mm")

    face.putalpha(mask)
    img.alpha_composite(face, (x, y))


def save(img: Image.Image, size: tuple[int, int], path: Path, mode: str = "RGBA") -> None:
    img.resize(size, Image.LANCZOS).convert(mode).save(path, optimize=True)
    print(path.relative_to(ASSETS.parent), size)


def main() -> None:
    n = 1024 * SS
    # icon: midnight backdrop, tile at 66%
    img = backdrop(n, n)
    s = n * 0.66
    tile(img, (n - s) / 2, (n - s) / 2, s)
    save(img, (1024, 1024), ASSETS / "icon.png", "RGB")

    # adaptive icon foreground: transparent, tile inside the safe zone (66% circle -> 46% square);
    # the background colour is MIDNIGHT (app.json)
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    s = n * 0.46
    tile(img, (n - s) / 2, (n - s) / 2, s)
    save(img, (1024, 1024), ASSETS / "adaptive-icon.png")

    # logo for in the app: the tile with its name, transparent, room for the halo
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    s = n * 0.8
    tile(img, (n - s) / 2, (n - s) / 2, s, name=True)
    save(img, (512, 512), ASSETS / "logo.png")

    # splash: backdrop, tile with name in the middle
    w, h = 1284 * 2, 2778 * 2
    img = backdrop(w, h)
    s = w * 0.42
    tile(img, (w - s) / 2, (h - s) / 2, s, name=True)
    save(img, (1284, 2778), ASSETS / "splash.png", "RGB")


if __name__ == "__main__":
    main()
