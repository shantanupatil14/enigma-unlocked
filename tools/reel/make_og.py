"""make_og.py - makes og-image.png (1200x630), the picture WhatsApp/LinkedIn show when the site link is shared."""
import io, pathlib, time
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[2]
SETTINGS = {"rotors": ["I", "II", "III"], "reflector": "B", "rings": "AAA", "positions": "AAA", "plugboard": "AM FI NV"}

with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True, args=["--use-angle=d3d11", "--ignore-gpu-blocklist"])
    page = b.new_page(viewport={"width": 1200, "height": 1500}, device_scale_factor=1)
    t0 = int(time.time() * 1000)
    page.clock.install(time=t0)
    page.goto((ROOT / "index.html").as_uri() + "#machine")
    page.clock.pause_at(t0 + 3000)
    page.evaluate("s => { Store.load(s, '', false); Store.setInput('E', true); Inside3D.setSpeed(0.85); Inside3D.playMessage(); }", SETTINGS)
    for _ in range(165): page.clock.run_for(33)          # about 5.4 s into the letter: both amber and blue paths are lit
    stage = Image.open(io.BytesIO(page.locator("#gl").screenshot())).convert("RGB")
    b.close()

W, H = 1200, 630
img = Image.new("RGB", (W, H), "#120a05")
d = ImageDraw.Draw(img)
for y in range(H):                                       # soft warm gradient
    c = int(18 + 22 * (1 - y / H)); d.line([(0, y), (W, y)], fill=(c + 8, c, c - 6))
sw, sh = stage.size
scale = H / sh
stage = stage.resize((int(sw * scale), H), Image.LANCZOS)
crop = stage.crop(((stage.width - 760) // 2, 0, (stage.width + 760) // 2, H))
img.paste(crop, (W - 760, 0))
# fade the left edge of the picture into the background
mask = Image.new("L", crop.size, 255); md = ImageDraw.Draw(mask)
for x in range(160): md.line([(x, 0), (x, H)], fill=int(255 * x / 160))
bg = Image.new("RGB", crop.size, "#150c06"); img.paste(Image.composite(crop, bg, mask), (W - 760, 0))

bold = ImageFont.truetype(r"C:\Windows\Fonts\georgiab.ttf", 66); reg = ImageFont.truetype(r"C:\Windows\Fonts\georgia.ttf", 34); small = ImageFont.truetype(r"C:\Windows\Fonts\georgia.ttf", 26)
d.text((56, 150), "ENIGMA", font=bold, fill="#c9a24d"); d.text((56, 226), "UNLOCKED", font=bold, fill="#c9a24d")
d.text((56, 330), "See how the Enigma machine", font=reg, fill="#efe6cf"); d.text((56, 374), "works, inside a 3D model.", font=reg, fill="#efe6cf")
d.rounded_rectangle((56, 460, 560, 512), radius=10, outline="#7d5f26", width=2)
d.text((76, 470), "Free  ·  plain English  ·  no install", font=small, fill="#bfae8a")
out = ROOT / "og-image.png"; img.save(out, optimize=True); print(out, out.stat().st_size // 1024, "KB")