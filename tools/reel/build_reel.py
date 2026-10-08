"""build_reel.py - makes the Enigma Unlocked reel(s).

    python build_reel.py timing [story|short|both]      speak the narration, measure it, build the timelines
    python build_reel.py render story [--range 20 40]  render frames (optionally only a time range, for previews)
    python build_reel.py encode story [--range 20 40]  join frames and voice into MP4 files
    python build_reel.py all    [story|short|both]     timing + render + encode

Everything is deterministic: the page runs on a fake clock that this script steps 1/30 s at a time, so the
pictures always match the voice. Word timings come from the speech service, so cues land on the spoken word."""
import asyncio, hashlib, json, pathlib, re, subprocess, sys, time, shutil
import aiohttp, socket, edge_tts, imageio_ffmpeg

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parents[1]
WORK = HERE / "work"; OUT = HERE / "out"
WORK.mkdir(exist_ok=True); OUT.mkdir(exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FPS, W, H = 30, 1080, 1920
LEAD, TAIL = 0.25, 1.2            # seconds of picture before the first word and after the last
SCRIPT = json.loads((HERE / "script.json").read_text(encoding="utf-8"))

# ------------------------------------------------------------------ helpers
def norm(w): return re.sub(r"[^a-z0-9']", "", w.lower())

def audio_seconds(path):
    r = subprocess.run([FFMPEG, "-i", str(path)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr)
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])

async def speak(text, path, tries=4):
    """Speak text to mp3 and return the word timings [{text,start,dur}] (seconds). Retries; IPv4 forced."""
    for attempt in range(1, tries + 1):
        try:
            conn = aiohttp.TCPConnector(family=socket.AF_INET)
            c = edge_tts.Communicate(text, SCRIPT["voice"], rate=SCRIPT["rate"], boundary="WordBoundary", connector=conn)
            words = []
            with open(path, "wb") as f:
                async for ch in c.stream():
                    if ch["type"] == "audio": f.write(ch["data"])
                    elif ch["type"] == "WordBoundary": words.append({"text": ch["text"], "start": ch["offset"] / 1e7, "dur": ch["duration"] / 1e7})
            return words
        except Exception as e:
            print(f"    speech attempt {attempt} failed ({type(e).__name__}); retrying", flush=True)
            await asyncio.sleep(2 * attempt)
    raise RuntimeError("could not reach the speech service")

def real_cipher():
    """The machine's real output, computed by the site's own Enigma class in the browser."""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(channel="msedge", headless=True)
        page = b.new_page(); page.goto((ROOT / "index.html").as_uri())
        out = page.evaluate("([s, t]) => new Enigma(s).encrypt(t)", [SCRIPT["settings"], SCRIPT["phrase"]])
        back = page.evaluate("([s, t]) => new Enigma(s).encrypt(t)", [SCRIPT["settings"], out])
        b.close()
    assert back == SCRIPT["phrase"], "round trip failed"
    return out

# ------------------------------------------------------------------ narration + timeline
async def make_audio(cut, cipher):
    segs = []
    for seg in SCRIPT["cuts"][cut]:
        text = seg["text"].replace("{out}", cipher[0])
        key = hashlib.sha1((text + SCRIPT["voice"] + SCRIPT["rate"]).encode()).hexdigest()[:12]
        mp3, meta = WORK / f"{cut}_{seg['id']}.mp3", WORK / f"{cut}_{seg['id']}.json"
        if mp3.exists() and meta.exists() and json.loads(meta.read_text())["key"] == key:
            words = json.loads(meta.read_text())["words"]
        else:
            print(f"  speaking {cut}/{seg['id']} ...", flush=True)
            words = await speak(text, mp3)
            meta.write_text(json.dumps({"key": key, "words": words}))
        segs.append({**seg, "text": text, "mp3": mp3, "words": words, "dur": audio_seconds(mp3)})
    return segs

def build_timeline(cut, segs, cipher):
    events, t = [], LEAD
    for si, seg in enumerate(segs):
        words, d = seg["words"], seg["dur"]
        toks = [norm(w["text"]) for w in words]
        seg["start"] = t
        events.append({"t": t, "kind": "segment", "id": seg["id"], "index": si, "total": len(segs)})

        def when(at, frm=0):
            """time (and word index) of an anchor: 0 = segment start, '@end-N' = N s before the end, else first matching word."""
            if at == 0: return t, frm
            if isinstance(at, str) and at.startswith("@end-"): return t + d - float(at[5:]), frm
            a = norm(at)
            for i in range(frm, len(toks)):
                if toks[i].startswith(a): return t + words[i]["start"], i
            raise ValueError(f"anchor word '{at}' not found in segment {seg['id']}: {seg['text']}")

        # captions: one per sentence, timed by the first word of the sentence
        sentences = []
        for s in (x for x in re.split(r"(?<=[.!?])\s+", seg["text"]) if x.strip()):
            if len(s) <= 58: sentences.append(s); continue
            parts = re.split(r"(?<=,)\s+", s)                      # long sentence: break after commas, keep tiny pieces joined
            merged = []
            for p in parts:
                if merged and len(merged[-1]) < 22: merged[-1] += " " + p
                else: merged.append(p)
            sentences += merged
        idx = 0
        for s in sentences:
            n = len(s.split()); start = t + words[min(idx, len(words) - 1)]["start"] - 0.05
            events.append({"t": max(t, start), "kind": "caption", "text": s}); idx += n
        events.append({"t": t + d + 0.05, "kind": "caption", "text": ""})

        for key in ("shots", "cards", "ops"):
            frm = 0
            for item in seg.get(key, []):
                when_t, frm = when(item["at"], frm)
                if key == "ops" and item.get("op") in ("release", "cam"): when_t = max(t, when_t - SCRIPT.get("lead", 0))   # start a little before the word so the picture is there as it is spoken
                ev = {k: v for k, v in item.items() if k != "at"}
                ev.update({"t": when_t, "kind": {"shots": "shot", "cards": "card", "ops": "op"}[key]})
                if key == "ops" and item["at"] != 0: frm += 1
                events.append(ev)
        t = t + d + seg.get("pad", 0) + SCRIPT["gap"]
    total = t - SCRIPT["gap"] + TAIL
    events.sort(key=lambda e: e["t"])
    return {"cut": cut, "fps": FPS, "total": total, "cipher": cipher, "events": events,
            "segments": [{"id": s["id"], "start": s["start"], "dur": s["dur"]} for s in segs]}

def make_voice_track(cut, segs, total):
    """Place each narration clip at its start time on one audio track."""
    cmd = [FFMPEG, "-y", "-loglevel", "error"]
    for s in segs: cmd += ["-i", str(s["mp3"])]
    filt = ";".join(f"[{i}:a]adelay={int(s['start']*1000)}|{int(s['start']*1000)}[a{i}]" for i, s in enumerate(segs))
    filt += ";" + "".join(f"[a{i}]" for i in range(len(segs))) + f"amix=inputs={len(segs)}:normalize=0:dropout_transition=0,apad=whole_dur={total:.3f}[out]"
    out = WORK / f"{cut}_voice.wav"
    subprocess.run(cmd + ["-filter_complex", filt, "-map", "[out]", "-t", f"{total:.3f}", "-ar", "44100", "-ac", "1", str(out)], check=True)
    return out

async def timing(cuts, cipher):
    print(f"Phrase {SCRIPT['phrase']} -> {cipher}  (first letter E becomes {cipher[0]})\n")
    for cut in cuts:
        segs = await make_audio(cut, cipher)
        tl = build_timeline(cut, segs, cipher)
        make_voice_track(cut, segs, tl["total"])
        (WORK / f"timeline_{cut}.json").write_text(json.dumps(tl, indent=1))
        print(f"== {cut} cut ==")
        for s in tl["segments"]: print(f"  {s['id']:13s} starts {s['start']:6.1f}s   speech {s['dur']:5.1f}s")
        print(f"  TOTAL video length: {tl['total']:.1f} s  ({int(tl['total']*FPS)} frames), {len(tl['events'])} cues\n")

# ------------------------------------------------------------------ rendering
def render(cut, rng=None):
    from playwright.sync_api import sync_playwright
    tl = json.loads((WORK / f"timeline_{cut}.json").read_text())
    frames = WORK / f"frames_{cut}"
    if frames.exists(): shutil.rmtree(frames)
    frames.mkdir()
    total = int(tl["total"] * FPS)
    lo, hi = (int(rng[0] * FPS), int(rng[1] * FPS)) if rng else (0, total)
    events, log, errors = list(tl["events"]), [], []
    t0 = time.time()
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True, args=["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"])
        page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
        t_start = int(time.time() * 1000)
        page.clock.install(time=t_start)
        page.goto((HERE / "reel.html").as_uri())
        page.clock.pause_at(t_start + 3000)          # freeze: from now on time moves ONLY when we call run_for (fully deterministic)
        page.evaluate("cfg => Reel.init(cfg)", {"settings": SCRIPT["settings"], "phrase": SCRIPT["phrase"], "display": SCRIPT["display"], "cipher": tl["cipher"], "total": tl["total"]})
        page.clock.run_for(300)
        scale, acc, saved = 1.0, 0.0, 0
        for f in range(total):
            t = f / FPS
            while events and events[0]["t"] <= t:
                ev = events.pop(0)
                if ev["kind"] == "segment": scale = 1.0
                if ev.get("timescale"): scale = float(ev["timescale"])
                page.evaluate("ev => Reel.apply(ev)", ev)
            page.evaluate("t => Reel.tick(t)", t)
            acc += 1000.0 / FPS * scale
            step = int(acc); acc -= step
            if step: page.clock.run_for(step)
            if lo <= f < hi:
                page.screenshot(path=str(frames / f"f{f - lo:05d}.jpg"), type="jpeg", quality=90); saved += 1
            if f % 150 == 0: print(f"  frame {f}/{total}  ({time.time()-t0:.0f}s elapsed)", flush=True)
        log = page.evaluate("Reel.log")
        browser.close()
    (WORK / f"renderlog_{cut}.json").write_text(json.dumps({"log": log, "errors": errors}, indent=1))
    print(f"rendered {saved} frames in {time.time()-t0:.0f}s; page errors: {len(errors)}")
    return saved

# ------------------------------------------------------------------ encoding
def encode(cut, rng=None):
    tl = json.loads((WORK / f"timeline_{cut}.json").read_text())
    voice = WORK / f"{cut}_voice.wav"
    frames = WORK / f"frames_{cut}"
    ss = ["-ss", f"{rng[0]:.3f}", "-t", f"{rng[1]-rng[0]:.3f}"] if rng else []
    suffix = "_preview" if rng else ""
    loud = "loudnorm=I=-16:TP=-1.5:LRA=11"
    base = [FFMPEG, "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(frames / "f%05d.jpg"), *ss, "-i", str(voice)]
    hq = OUT / f"enigma-unlocked-{cut}-hq{suffix}.mp4"
    subprocess.run(base + ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-vf", "scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-r", str(FPS), "-af", loud,
                           "-c:a", "aac", "-ar", "48000", "-b:a", "128k", "-shortest", "-movflags", "+faststart", str(hq)], check=True)
    wa = OUT / f"enigma-unlocked-{cut}-whatsapp{suffix}.mp4"
    dur = (rng[1] - rng[0]) if rng else tl["total"]
    kbps = int(min(1500, (14.2 * 8192 / dur) - 72))        # keep the file under about 14 MB
    subprocess.run(base + ["-c:v", "libx264", "-preset", "slow", "-b:v", f"{kbps}k", "-maxrate", f"{int(kbps*1.25)}k", "-bufsize", f"{kbps*2}k",
                           "-vf", "scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-r", str(FPS), "-af", loud, "-c:a", "aac", "-ar", "48000", "-b:a", "64k", "-shortest", "-movflags", "+faststart", str(wa)], check=True)
    for f in (hq, wa): print(f"  {f.name}: {f.stat().st_size/1048576:.1f} MB")

# ------------------------------------------------------------------ command line
if __name__ == "__main__":
    args = sys.argv[1:]
    cmd = args[0] if args else "timing"
    which = args[1] if len(args) > 1 and not args[1].startswith("--") else "both"
    cuts = ["story", "short"] if which == "both" else [which]
    rng = None
    if "--range" in args: i = args.index("--range"); rng = (float(args[i + 1]), float(args[i + 2]))
    if cmd in ("timing", "all"): asyncio.run(timing(cuts, real_cipher()))   # the browser call must happen outside the async loop
    if cmd in ("render", "all"):
        for c in cuts: render(c, rng)
    if cmd in ("encode", "all"):
        for c in cuts: encode(c, rng)