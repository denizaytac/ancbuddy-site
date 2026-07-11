from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
BG = "#0a0a0c"
SURFACE = "#14151b"
BORDER = "#343640"
TEXT = "#f5f5f7"
MUTED = "#a4a4ad"
ACCENT = "#a78bfa"
GREEN = "#6ee786"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)


def centered(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], text: str, face, fill=TEXT):
    left, top, right, bottom = draw.textbbox((0, 0), text, font=face)
    width, height = right - left, bottom - top
    x = box[0] + (box[2] - box[0] - width) / 2
    y = box[1] + (box[3] - box[1] - height) / 2 - 2
    draw.text((x, y), text, font=face, fill=fill)


def arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], fill=ACCENT):
    draw.line((start, end), fill=fill, width=4)
    x, y = end
    if abs(end[0] - start[0]) >= abs(end[1] - start[1]):
        direction = 1 if end[0] > start[0] else -1
        points = [(x, y), (x - 14 * direction, y - 8), (x - 14 * direction, y + 8)]
    else:
        direction = 1 if end[1] > start[1] else -1
        points = [(x, y), (x - 8, y - 14 * direction), (x + 8, y - 14 * direction)]
    draw.polygon(points, fill=fill)


def interactions():
    image = Image.new("RGB", (1600, 900), BG)
    draw = ImageDraw.Draw(image)
    draw.text((72, 52), "ANCBuddy Growth Agent", font=font(40, True), fill=TEXT)
    draw.text((72, 106), "Autonomous analysis, explicit approval, exact execution", font=font(20), fill=MUTED)

    boxes = {
        "scheduler": (72, 230, 360, 350),
        "service": (500, 190, 850, 390),
        "data": (980, 190, 1310, 390),
        "ceo": (500, 540, 850, 740),
        "external": (980, 540, 1310, 740),
    }
    labels = {
        "scheduler": ("GitHub scheduler", "enqueue only"),
        "service": ("Growth Agent service", "plan · research · draft"),
        "data": ("Supabase", "funnel · actions · audit"),
        "ceo": ("CEO Inbox", "approve · change · reject"),
        "external": ("External adapters", "email · PR · webhook"),
    }
    for key, box in boxes.items():
        draw.rounded_rectangle(box, radius=22, fill=SURFACE, outline=BORDER, width=2)
        title, subtitle = labels[key]
        centered(draw, (box[0], box[1] + 20, box[2], box[1] + 96), title, font(23, True))
        centered(draw, (box[0], box[1] + 88, box[2], box[3] - 12), subtitle, font(16), MUTED)

    arrow(draw, (360, 290), (500, 290))
    arrow(draw, (850, 265), (980, 265))
    arrow(draw, (980, 330), (850, 330), MUTED)
    arrow(draw, (675, 390), (675, 540))
    arrow(draw, (850, 640), (980, 640), GREEN)
    arrow(draw, (1145, 540), (1145, 390), MUTED)

    draw.text((376, 248), "run", font=font(15, True), fill=ACCENT)
    draw.text((872, 220), "state", font=font(15, True), fill=ACCENT)
    draw.text((694, 448), "max 5 decisions", font=font(15, True), fill=ACCENT)
    draw.text((875, 598), "approved snapshot only", font=font(15, True), fill=GREEN)

    gate = (540, 774, 1270, 842)
    draw.rounded_rectangle(gate, radius=18, fill="#17131f", outline=ACCENT, width=2)
    centered(draw, gate, "No approval ID + version + hash match  →  no external effect", font(19, True), ACCENT)
    image.save(DOCS / "agent-interactions.png")


def sequence():
    image = Image.new("RGB", (1600, 1040), BG)
    draw = ImageDraw.Draw(image)
    draw.text((64, 42), "Approval-gated execution sequence", font=font(38, True), fill=TEXT)
    lanes = [(160, "Scheduler"), (470, "Agent"), (800, "Supabase"), (1110, "CEO"), (1420, "Channel")]
    for x, label in lanes:
        centered(draw, (x - 115, 110, x + 115, 170), label, font(19, True))
        draw.line((x, 178, x, 950), fill=BORDER, width=2)

    events = [
        (220, 160, 470, "enqueue daily / weekly", ACCENT),
        (300, 470, 800, "read privacy-safe metrics", MUTED),
        (380, 800, 470, "snapshot + prior feedback", MUTED),
        (460, 470, 800, "save versioned drafts", ACCENT),
        (540, 800, 1110, "show up to five decisions", ACCENT),
        (630, 1110, 800, "approve exact version", GREEN),
        (710, 800, 470, "immutable approval snapshot", GREEN),
        (790, 470, 1420, "execute approved content once", GREEN),
        (870, 1420, 800, "record result + attribution", MUTED),
    ]
    for y, source, target, label, color in events:
        arrow(draw, (source, y), (target, y), color)
        width = draw.textbbox((0, 0), label, font=font(15, True))[2]
        draw.rectangle((min(source, target) + 18, y - 31, min(source, target) + 30 + width, y - 8), fill=BG)
        draw.text((min(source, target) + 24, y - 30), label, font=font(15, True), fill=color)

    draw.rounded_rectangle((445, 905, 1445, 988), radius=18, fill="#17131f", outline=ACCENT, width=2)
    centered(
        draw,
        (445, 905, 1445, 988),
        "Simulation mode stops before the Channel lane while preserving the full audit loop.",
        font(18, True),
        ACCENT,
    )
    image.save(DOCS / "agent-sequence.png")


if __name__ == "__main__":
    DOCS.mkdir(parents=True, exist_ok=True)
    interactions()
    sequence()
    print("Generated agent-interactions.png and agent-sequence.png")
