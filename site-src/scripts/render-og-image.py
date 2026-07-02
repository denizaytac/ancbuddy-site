from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


WIDTH = 1200
HEIGHT = 630

SCRIPT_DIR = Path(__file__).resolve().parent
SITE_ROOT = SCRIPT_DIR.parent
PUBLIC_DIR = SITE_ROOT / "public"

BUDDY_PATH = PUBLIC_DIR / "buddy-hero.png"
LOGO_PATH = PUBLIC_DIR / "logo.png"
OUTPUT_PATH = PUBLIC_DIR / "og-image-v2.png"

FONT_REGULAR = "/System/Library/Fonts/SFNS.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_MONO = "/System/Library/Fonts/SFNSMono.ttf"


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = hex_color.lstrip("#")
    return (
        int(value[0:2], 16),
        int(value[2:4], 16),
        int(value[4:6], 16),
        alpha,
    )


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def gradient_background() -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), rgba("#09090b"))
    pixels = image.load()
    left = (8, 8, 11)
    right = (46, 25, 91)
    bottom = (6, 6, 9)

    for y in range(HEIGHT):
        fy = y / (HEIGHT - 1)
        for x in range(WIDTH):
            fx = x / (WIDTH - 1)
            r = int(left[0] * (1 - fx) + right[0] * fx)
            g = int(left[1] * (1 - fx) + right[1] * fx)
            b = int(left[2] * (1 - fx) + right[2] * fx)
            r = int(r * (1 - fy * 0.25) + bottom[0] * fy * 0.25)
            g = int(g * (1 - fy * 0.25) + bottom[1] * fy * 0.25)
            b = int(b * (1 - fy * 0.25) + bottom[2] * fy * 0.25)
            pixels[x, y] = (r, g, b, 255)

    return image


def add_glow(base: Image.Image) -> None:
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.ellipse((500, -210, 1370, 740), fill=rgba("#7c3aed", 95))
    draw.ellipse((80, -160, 650, 430), fill=rgba("#a78bfa", 36))
    draw.ellipse((580, 120, 1180, 760), fill=rgba("#c4b5fd", 42))
    base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(72)))


def add_grid(base: Image.Image) -> None:
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for x in range(0, WIDTH, 48):
        draw.line((x, 0, x, HEIGHT), fill=rgba("#ffffff", 14), width=1)
    for y in range(0, HEIGHT, 48):
        draw.line((0, y, WIDTH, y), fill=rgba("#ffffff", 12), width=1)
    base.alpha_composite(overlay)


def paste_shadowed(base: Image.Image, image: Image.Image, position: tuple[int, int]) -> None:
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 150), position, image)
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    base.alpha_composite(shadow)
    base.alpha_composite(image, position)


def draw_rounded_glass(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    radius: int,
    fill: tuple[int, int, int, int],
    outline: tuple[int, int, int, int],
    width: int = 1,
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_text(
    draw: ImageDraw.ImageDraw,
    position: tuple[int, int],
    text: str,
    text_font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int, int],
    anchor: str | None = None,
) -> None:
    x, y = position
    draw.text((x + 2, y + 3), text, font=text_font, fill=rgba("#000000", 72), anchor=anchor)
    draw.text(position, text, font=text_font, fill=fill, anchor=anchor)


def render() -> None:
    canvas = gradient_background()
    add_glow(canvas)
    add_grid(canvas)

    draw = ImageDraw.Draw(canvas)

    panel = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    panel_draw = ImageDraw.Draw(panel)
    draw_rounded_glass(
        panel_draw,
        (755, 116, 1090, 440),
        28,
        rgba("#181821", 114),
        rgba("#ffffff", 38),
    )
    panel_draw.rounded_rectangle((790, 161, 1055, 218), radius=16, fill=rgba("#7c3aed", 52))
    for index, label in enumerate(["Quiet", "Aware", "Immersion"]):
        y = 176 + index * 78
        panel_draw.rounded_rectangle((812, y, 842, y + 30), radius=9, fill=rgba("#a78bfa", 195 if index == 0 else 55))
        panel_draw.text((858, y - 3), label, font=font(FONT_REGULAR, 26), fill=rgba("#ffffff", 120))
    canvas.alpha_composite(panel.filter(ImageFilter.GaussianBlur(0.2)))

    buddy = Image.open(BUDDY_PATH).convert("RGBA")
    buddy = buddy.crop(buddy.getbbox())
    buddy_height = 550
    buddy_width = int(buddy.width * buddy_height / buddy.height)
    buddy = buddy.resize((buddy_width, buddy_height), Image.Resampling.LANCZOS)
    paste_shadowed(canvas, buddy, (660, 54))

    logo = Image.open(LOGO_PATH).convert("RGBA").resize((42, 42), Image.Resampling.LANCZOS)
    draw_rounded_glass(
        draw,
        (150, 82, 425, 146),
        32,
        rgba("#15151c", 190),
        rgba("#a78bfa", 118),
        width=2,
    )
    canvas.alpha_composite(logo, (168, 93))
    draw.text((224, 97), "ANCBuddy", font=font(FONT_BOLD, 34), fill=rgba("#ffffff"))

    draw_text(draw, (150, 205), "Bose QC Ultra", font(FONT_BOLD, 70), rgba("#ffffff"))
    draw_text(draw, (150, 282), "control for Mac", font(FONT_BOLD, 70), rgba("#ffffff"))
    draw_text(draw, (150, 384), "Noise modes | Battery | AI Auto-EQ", font(FONT_REGULAR, 30), rgba("#dedbea", 235))

    draw_text(draw, (150, 497), "macOS 12+ | $9.99 once", font(FONT_REGULAR, 27), rgba("#dedbea", 225))
    draw_text(draw, (150, 552), "ancbuddy.com", font(FONT_REGULAR, 28), rgba("#c4b5fd", 245))

    canvas.convert("RGB").save(OUTPUT_PATH, optimize=True)
    print(f"Wrote {OUTPUT_PATH.relative_to(SITE_ROOT)} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    render()
