"""contact.py - make a contact sheet of rendered frames to check the video by eye.  python contact.py <cut> <every_n_frames> [cols] [max]"""
import sys, pathlib
from PIL import Image
HERE = pathlib.Path(__file__).parent
cut, every = sys.argv[1], int(sys.argv[2]); cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6; mx = int(sys.argv[4]) if len(sys.argv) > 4 else 18
frames = sorted((HERE / "work" / f"frames_{cut}").glob("f*.jpg"))[::every][:mx]
tw, th = 270, 480
rows = (len(frames) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * th), "#000")
for i, f in enumerate(frames):
    sheet.paste(Image.open(f).resize((tw, th), Image.LANCZOS), ((i % cols) * tw, (i // cols) * th))
out = HERE / "work" / f"contact_{cut}.jpg"; sheet.save(out, quality=88); print(out, len(frames), "frames")