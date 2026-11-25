"""Make the app icon, adaptive icon and splash: an element tile 'Eg' (Energiegedrag) as in the
periodic table, number 21 (°C, a usual thermostat setting). Needs Pillow; uses Roboto from
../fonts (Apache 2.0). Run from anywhere: python make_icons.py

Colours (also in src/lib/theme.ts): NAVY background, AMBER tile, NAVY text.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent
FONTS = ASSETS / "fonts"
NAVY = "#12304F"
AMBER = "#F2A541"
WHITE = "#FFFFFF"
SS = 4  # supersampling


def font(weight: str, size: float) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / f"Roboto-{weight}.ttf"), int(size))


def tile(draw: ImageDraw.ImageDraw, x: float, y: float, s: float, name: bool = False) -> None:
    """An element tile of size s with its top-left corner at (x, y)."""
    draw.rounded_rectangle((x, y, x + s, y + s), radius=s * 0.09, fill=AMBER)
    pad = s * 0.09
    draw.text((x + pad, y + pad * 0.8), "21", font=font("Bold", s * 0.15), fill=NAVY)
    draw.text((x + s - pad, y + pad * 0.8), "J", font=font("Medium", s * 0.13), fill=NAVY, anchor="ra")
    symbol_y = y + s * (0.52 if name else 0.56)
    draw.text((x + s / 2, symbol_y), "Eg", font=font("Bold", s * 0.50), fill=NAVY, anchor="mm")
    if name:
        draw.text((x + s / 2, y + s * 0.86), "Energiegedrag", font=font("Medium", s * 0.105),
                  fill=NAVY, anchor="mm")


def save(img: Image.Image, size: tuple[int, int], path: Path) -> None:
    img.resize(size, Image.LANCZOS).save(path, optimize=True)
    print(path.relative_to(ASSETS.parent), size)


def main() -> None:
    n = 1024 * SS
    # icon: navy square, tile at 72%
    img = Image.new("RGB", (n, n), NAVY)
    s = n * 0.72
    tile(ImageDraw.Draw(img), (n - s) / 2, (n - s) / 2, s)
    save(img, (1024, 1024), ASSETS / "icon.png")

    # adaptive icon foreground: transparent, tile inside the safe zone (66% circle -> 46% square)
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    s = n * 0.46
    tile(ImageDraw.Draw(img), (n - s) / 2, (n - s) / 2, s)
    save(img, (1024, 1024), ASSETS / "adaptive-icon.png")

    # logo for in the app: the tile with its name, transparent
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    tile(ImageDraw.Draw(img), 0, 0, n, name=True)
    save(img, (512, 512), ASSETS / "logo.png")

    # splash: navy, tile with name in the middle
    w, h = 1284 * 2, 2778 * 2
    img = Image.new("RGB", (w, h), NAVY)
    s = w * 0.42
    tile(ImageDraw.Draw(img), (w - s) / 2, (h - s) / 2, s, name=True)
    save(img, (1284, 2778), ASSETS / "splash.png")


if __name__ == "__main__":
    main()
