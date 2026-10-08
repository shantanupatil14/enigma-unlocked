// reel.js - the "director" for the video page. build_reel.py calls Reel.apply(event) when a cue is due and
// Reel.tick(t) every frame. Everything here is driven by JavaScript timers only (no CSS animation), because the
// video is rendered on a fake clock that build_reel.py steps 1/30 s at a time.

const Reel = (() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SCALE = 1.15, TOP = 46;                         // character size and height: same as the website's scene player
  const log = [];                                       // notable moments with video time, used to check sync after rendering
  const S = { cfg: null, room: null, cast: {}, layer: null, pending: 0, t: 0, hookStart: 0, cards: [], lastCaption: "" };

  // Camera shots for the 3D machine. theta/phi/dist orbit around the point (tx, ty, tz).
  const CAMS = {
    wide:   { theta: 0.5,  phi: 1.15, dist: 20.5, tx: 0.3,  ty: 0.3, tz: -0.5 },
    wide2:  { theta: -0.3, phi: 1.1,  dist: 19,   tx: 0,    ty: 0.3, tz: -0.5 },
    plug:   { theta: 1.0,  phi: 1.15, dist: 12,   tx: 5.5,  ty: 0,   tz: 0 },
    rotorR: { theta: 0.15, phi: 1.2,  dist: 10,   tx: 3.6,  ty: 0.4, tz: 0 },
    dials:  { theta: 0.5,  phi: 0.95, dist: 14,   tx: 0,    ty: 1.4, tz: 0 },
    rotors: { theta: 0.35, phi: 1.18, dist: 17,   tx: 0,    ty: 0.2, tz: 0 },
    mirror: { theta: 0.8,  phi: 1.2,  dist: 10.5, tx: -6.2, ty: 0.3, tz: 0 },
    back:   { theta: 0.3,  phi: 1.15, dist: 17,   tx: -1,   ty: 0.3, tz: 0 },
    lamps:  { theta: 0.2,  phi: 1.0,  dist: 12.5, tx: 0.8,  ty: 2.2, tz: -3 },
  };

  // ---- fades, done with requestAnimationFrame so they follow the fake clock
  const running = new Map();
  function setOpacity(el, v) { el._op = v; el.style.opacity = String(v); }
  function fade(el, to, ms = 300) {
    const from = el._op === undefined ? 0 : el._op, start = performance.now();
    if (running.has(el)) cancelAnimationFrame(running.get(el));
    const step = () => {
      const k = ms <= 0 ? 1 : Math.min(1, Math.max(0, (performance.now() - start) / ms));
      setOpacity(el, from + (to - from) * k);
      if (k < 1) running.set(el, requestAnimationFrame(step)); else running.delete(el);
    };
    step();
  }

  // ---- layers: the 3D machine, the sketch scene, the hook letters, the end card
  function layers() { return { "3d": $("gl"), scene: $("scene"), hook: $("hook"), endcard: $("endcard") }; }
  function showLayer(name, ms = 350) {
    const L = layers();
    for (const [k, el] of Object.entries(L)) fade(el, k === name ? 1 : 0, ms);
    $("stage").classList.toggle("no3d", name !== "3d");
    fade($("panel"), name === "3d" ? 1 : 0, ms);
    S.layer = name;
  }

  // ---- the sketch scene (same drawing code and moods as the website's story)
  function buildScene() {
    $("scene").innerHTML = `<svg viewBox="0 0 540 450" preserveAspectRatio="xMidYMid slice">${Art.defs}
      <rect id="bg" x="-600" y="-300" width="1800" height="1100" fill="url(#paper)"/><g id="rb"></g>
      <g id="chars"><g class="char" data-name="anna">${Art.anna()}</g><g class="char" data-name="tom">${Art.tom()}</g></g>
      <g id="rf"></g><g class="fxlayer">${Art.effects}</g><rect id="vg" pointer-events="none" fill="url(#vig)"/></svg>`;
  }
  function applyScene(shot) {
    const svg = $("scene").firstElementChild;
    if (shot.room !== S.room) { const r = Art.rooms[shot.room](); svg.querySelector("#rb").innerHTML = r.back; svg.querySelector("#rf").innerHTML = r.front; S.room = shot.room; }
    const vb = shot.vb || [0, 0, 540, 450];
    svg.setAttribute("viewBox", vb.join(" "));
    const vg = svg.querySelector("#vg"); vg.setAttribute("x", vb[0]); vg.setAttribute("y", vb[1]); vg.setAttribute("width", vb[2]); vg.setAttribute("height", vb[3]);
    for (const [name, c] of Object.entries(shot.cast || {})) S.cast[name] = { ...(S.cast[name] || { show: false, x: 200, look: "r", mood: "neutral" }), ...c };
    for (const el of svg.querySelectorAll(".char")) {
      const c = S.cast[el.dataset.name] || { show: false, x: 200, look: "r", mood: "neutral" };
      el.style.transform = `translate(${c.x}px, ${TOP}px) scale(${SCALE})`;
      el.setAttribute("class", `char look-${c.look || "r"} mood-${c.mood || "neutral"} ${c.show ? "" : "hidden"}`);
    }
    svg.setAttribute("class", (shot.fx || []).map((f) => "on-" + f).join(" "));
    const label = $("scenelabel");
    if (shot.label) { label.textContent = shot.label; fade(label, 1, 300); } else fade(label, 0, 200);
    fade($("dim"), shot.dim ? 1 : 0, 300);
    const anyChar = Object.values(S.cast).some((c) => c.show);
    $("footer").textContent = anyChar ? "Anna and Tom are fictional characters" : "";
  }

  // ---- paper cards (timeline facts)
  function addCard(c) {
    const host = $("cards");
    const film = c.style === "film";
    host.style.top = film ? "0" : ""; host.style.bottom = film ? "0" : "34px"; host.style.justifyContent = film ? "center" : "flex-end";
    const el = document.createElement("div");
    el.className = "card" + (film ? " film" : "");
    el.innerHTML = `<b>${esc(c.title)}</b><span>${esc(c.text)}</span>`;
    host.appendChild(el); S.cards.push(el); setOpacity(el, 0); fade(el, 1, 350);
  }
  function clearCards() { for (const el of S.cards) { fade(el, 0, 250); el._kill = performance.now() + 300; } }

  // ---- the hook: the machine's real scrambled output, letter by letter
  function buildHook() {
    const c = S.cfg.cipher, rows = [];
    for (let i = 0; i < c.length; i += 5) rows.push([...c.slice(i, i + 5)].map((l) => `<span class="hl" style="visibility:hidden">${l}</span>`).join(""));
    $("hookletters").innerHTML = rows.join("<br>");
  }

  // ---- machine control
  function fly(name, ms = 1100) { if (name && CAMS[name]) Inside3D.fly(CAMS[name], ms); }
  function op(o) {
    const cfg = S.cfg;
    if (o.op === "input") { Store.setInput(o.text, true); Inside3D.setStepMode(true); Inside3D.setSpeed(0.85); S.pending = 0; Inside3D.playMessage(); fly(o.cam, 800); log.push({ t: S.t, e: "input " + o.text }); }
    else if (o.op === "release") { S.pending += o.n; fly(o.cam); log.push({ t: S.t, e: "release " + o.n }); }
    else if (o.op === "cam") { fly(o.cam); }
    else if (o.op === "montage" || o.op === "decode") {
      Inside3D.stopPlayback();
      Store.setInput(o.op === "montage" ? cfg.phrase : cfg.cipher, true);
      Inside3D.setStepMode(false); Inside3D.setSpeed(0.05); Inside3D.playMessage();
      fly(o.cam, 4500); log.push({ t: S.t, e: o.op });
    }
  }

  // ---- public API used by build_reel.py
  function init(cfg) {
    S.cfg = cfg;
    buildScene(); buildHook();
    Store.load(cfg.settings, "", false);
    Inside3D.show();
    Inside3D.setXray(true);
    for (const el of Object.values(layers())) setOpacity(el, 0);
    setOpacity($("panel"), 0); setOpacity($("scenelabel"), 0); setOpacity($("dim"), 0);
    $("stage").classList.add("no3d");
  }

  function apply(ev) {
    S.t = ev.t;
    if (ev.kind === "segment") { clearCards(); log.push({ t: ev.t, e: "segment " + ev.id }); }
    else if (ev.kind === "caption") { $("caption").textContent = ev.text; }
    else if (ev.kind === "card") { addCard(ev); }
    else if (ev.kind === "op") { op(ev); }
    else if (ev.kind === "shot") {
      if (ev.type === "scene") { applyScene(ev); showLayer("scene"); }
      else if (ev.type === "hook") { S.hookStart = ev.t; $("footer").textContent = ""; showLayer("hook"); }
      else if (ev.type === "machine3d") { showLayer("3d"); $("footer").textContent = ""; fade($("scenelabel"), 0, 200); fade($("dim"), 0, 200); fly(ev.cam, 900); }
      else if (ev.type === "endcard") { showLayer("endcard", 500); $("footer").textContent = ""; $("caption").style.opacity = "1"; }
    }
  }

  function tick(t) {
    S.t = t;
    $("barfill").style.width = Math.min(100, (t / S.cfg.total) * 100) + "%";
    // let the machine run the stages the narration has reached (the machine waits for "Next" between stages)
    const next = $("in-next");
    if (S.pending > 0 && !next.disabled) { next.click(); S.pending--; }
    // hook letters appear one by one
    if (S.layer === "hook") {
      const n = Math.floor((t - S.hookStart) / 0.12);
      document.querySelectorAll("#hookletters .hl").forEach((el, i) => { el.style.visibility = i < n ? "visible" : "hidden"; });
    }
    // remove faded-out cards
    S.cards = S.cards.filter((el) => { if (el._kill && performance.now() >= el._kill) { el.remove(); return false; } return true; });
    // log each machine stage caption with its video time (to verify sync with the narration)
    const cap = $("in-caption").textContent;
    if (cap !== S.lastCaption) { S.lastCaption = cap; if (cap) log.push({ t, e: "stage: " + cap }); }
  }

  return { init, apply, tick, log, CAMS };
})();