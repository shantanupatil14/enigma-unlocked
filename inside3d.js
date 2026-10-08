// inside3d.js - the 3D "Inside view": the WHOLE machine, animated letter by letter.
// Uses three.js (saved locally in vendor/). It reads the shared machine from store.js.
//
// Layout along the X axis (left to right):  reflector | left rotor | middle rotor | right rotor | plugboard
// The signal goes in at the plugboard (right), through the three rotors, bounces off the reflector (left),
// comes back through the rotors, out through the plugboard again, and lights a lamp.
//
// How the 3D maps to the real maths (the same numbers as enigma.js):
//  * Contact "slot" k sits at angle k * STEP around the axle (STEP = 1/26 of a turn). Slot A is at the top.
//  * The wire inside a rotor runs from pin j on its right face to pad ROTORS[name].wiring[j] on its left face.
//  * A rotor is turned by  -offset * STEP  (offset = window letter - ring setting), so the pin that meets
//    fixed slot c is pin (c + offset), exactly like _rotorPass() in enigma.js.

const Inside3D = (() => {
  const STEP = (Math.PI * 2) / 26;
  const R_FACE = 1.75;                 // radius of the circle of rotor contacts
  const HALF = 0.8;                    // half the thickness of a rotor core
  const R_CORE = 2.3, R_RING = 2.9;    // rotor core and letter ring radii
  const R_SOCK = 2.7, R_PLATE = 3.45;  // plugboard socket circle and plate radius
  const ROTOR_X = [-3.6, 0, 3.6];      // left, middle, right (same order as Store.state.rotors)
  const REFL_X = -7.4, PLUG_X = 7.4;
  const byId = (id) => document.getElementById(id);
  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FWD = "fwd", BACK = "back";    // amber going in, blue coming back

  let ready = false, failed = false;
  let renderer, scene, camera, stage, canvas;
  const rot = [];                      // the three rotors: { spinner, ringGroup, wires, pins, pads, notch, spin, built }
  let refl = null;                     // reflector: { group, pads, arcs, name }
  let plug = null;                     // plugboard: { sockets, hits, cables }
  const lamps = {};                    // letter -> { glass, mat }
  let lampLight, bead, beadLight;
  const fades = [];                    // materials that turn see-through in X-ray mode
  let wiresGroup;                      // (unused container kept for X-ray toggling of extras)
  let xray = true, speed = 1;
  let wireOpacity = 0.6;               // X-ray wires are see-through; dimmer still while a signal is travelling
  let dirty = true, running = false;
  const tweens = [];
  const cam = { theta: 0.5, phi: 1.15, dist: 20.5, tx: 0.3, ty: 0.3, tz: -0.5 };

  // player state
  let activeCtx = { dead: true };      // each playback has its own ctx; ctx.dead = true cancels it, even mid-stage
  let playing = false, paused = false, stepMode = false;
  let gateResolve = null;              // resolves when the user presses Next / Resume
  let trail = [];                      // glowing tubes of the letter being shown
  let glowing = [];                    // meshes whose material was swapped to a glow material
  let lampOn = null;
  const verify = { on: false, bad: [] };

  // ---------- helpers ----------
  const wrap13 = (n) => { n = ((n % 26) + 26) % 26; return n > 13 ? n - 26 : n; };
  const circlePoint = (k, r, x) => new THREE.Vector3(x, r * Math.cos(k * STEP), r * Math.sin(k * STEP));
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const L = (n) => ALPHABET[((n % 26) + 26) % 26];
  const pinTip = (r, k) => circlePoint(k, R_FACE, ROTOR_X[r] + HALF + 0.2);
  const padTip = (r, k) => circlePoint(k, R_FACE, ROTOR_X[r] - HALF - 0.06);
  const reflContact = (k) => circlePoint(k, R_FACE, REFL_X + 0.62);
  const socketPos = (k) => circlePoint(k, R_SOCK, PLUG_X + 0.2);
  const invertNums = (wiring) => { const a = new Array(26); for (let i = 0; i < 26; i++) a[toNum(wiring[i])] = i; return a; };
  const speedFactor = () => (prefersReduced ? 0.03 : speed);

  // ---------- animation loop (runs only while something moves) ----------
  function loop() { if (!running) { running = true; requestAnimationFrame(frame); } }
  function touch() { dirty = true; loop(); }
  function frame() {
    const now = performance.now();   // same clock the tweens started on (identical to the frame time in a normal browser)
    for (const t of tweens.slice()) {
      // Clamp to 0..1: an animation started mid-frame can see a "now" that is a hair earlier than its start time.
      const k = Math.min(1, Math.max(0, (now - t.start) / t.ms));
      t.fn(k);
      if (k >= 1) { tweens.splice(tweens.indexOf(t), 1); t.res(); }
    }
    render();
    if (tweens.length || dirty) requestAnimationFrame(frame); else running = false;
  }
  function render() {
    if (!renderer) return;
    for (const r of rot) r.spinner.rotation.x = r.spin;
    renderer.render(scene, camera);
    placeLabels();
    dirty = false;
  }
  // Little name tags over the parts, so a newcomer knows what each piece is.
  const tags = [];
  let showLabels = true;
  function buildLabels() {
    const defs = [
      // [text, x, y, z, below?]  most tags sit on the base in front of the machine; the lamps tag sits above its board
      ["Reflector (the mirror)", REFL_X, -3.3, 1.7, true], ["Left rotor", ROTOR_X[0], -3.3, 1.7, true], ["Middle rotor", ROTOR_X[1], -3.3, 1.7, true],
      ["Right rotor", ROTOR_X[2], -3.3, 1.7, true], ["Plugboard", PLUG_X, 4.1, 0, false], ["Lamps", 0.8, 4.3, -5.6, false],
    ];
    for (const [text, x, y, z, below] of defs) {
      const el = document.createElement("div"); el.className = "tag"; el.textContent = text; stage.appendChild(el);
      tags.push({ el, below, pos: new THREE.Vector3(x, y, z) });
    }
  }
  function placeLabels() {
    const w = stage.clientWidth, h = stage.clientHeight, v = new THREE.Vector3();
    for (const t of tags) {
      v.copy(t.pos).project(camera);
      const hide = !showLabels || v.z > 1;
      t.el.classList.toggle("off", hide);
      if (!hide) t.el.style.transform = `translate(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%, ${t.below ? "0%" : "-100%"})`;
    }
  }

  // A timed animation scaled by the speed setting. Resolves when done. (Stage animations only.)
  function anim(ms, fn, ctx) {
    if (ctx && ctx.dead) return Promise.resolve();
    return new Promise((res) => { tweens.push({ start: performance.now(), ms: Math.max(1, ms * speedFactor()), fn: fn || (() => {}), res }); loop(); });
  }
  // A timed animation NOT scaled by speed (camera moves).
  function tweenRaw(ms, fn) {
    return new Promise((res) => { tweens.push({ start: performance.now(), ms, fn, res }); loop(); });
  }
  function finishAllTweens() { for (const t of tweens.splice(0)) { t.fn(1); t.res(); } }

  // ---------- materials ----------
  const steelMat = () => new THREE.MeshStandardMaterial({ color: 0xc4c9cf, metalness: 1, roughness: 0.25, envMapIntensity: 1.6 });
  function metal(color, rough, xrayOpacity) {
    const m = new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: rough, envMapIntensity: 1.6 });
    if (xrayOpacity !== undefined) fades.push({ m, xrayOpacity });
    return m;
  }
  function dark(color, rough, xrayOpacity) {
    const m = new THREE.MeshStandardMaterial({ color, metalness: 0.15, roughness: rough });
    if (xrayOpacity !== undefined) fades.push({ m, xrayOpacity });
    return m;
  }
  const glowMat = { [FWD]: new THREE.MeshBasicMaterial({ color: 0xffc04d, toneMapped: false }), [BACK]: new THREE.MeshBasicMaterial({ color: 0x57e0f0, toneMapped: false }) };
  function setWireOpacity(v) {
    wireOpacity = v;
    for (const r of rot) for (const w of r.wires.children) w.material.opacity = v;
    if (refl) for (const w of refl.arcs.children) w.material.opacity = v;
    touch();
  }
  const haloMat = {
    [FWD]: new THREE.MeshBasicMaterial({ color: 0xff9a1f, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    [BACK]: new THREE.MeshBasicMaterial({ color: 0x2bb6d8, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  };
  function applyXray() {
    for (const f of fades) { f.m.transparent = xray; f.m.opacity = xray ? f.xrayOpacity : 1; f.m.depthWrite = !xray; f.m.needsUpdate = true; }
    for (const r of rot) r.wires.visible = xray;
    if (refl) refl.arcs.visible = xray;
    touch();
  }

  // The thumbwheel ring: black with the 26 letters engraved around it (drawn on a canvas, no image files).
  function ringTexture() {
    const W = 2048, H = 128;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#14100c"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(255,255,255,0.07)";
    for (let x = 0; x < W; x += 7) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 14); g.moveTo(x, H - 14); g.lineTo(x, H); g.stroke(); }
    g.fillStyle = "#f1e3b8"; g.font = "bold 70px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
    for (let k = 0; k < 26; k++) {
      const u = (((0.25 - k / 26) % 1) + 1) % 1; // where letter k sits around the cylinder
      // Rotated a quarter turn so each letter stands upright when you look at the rotor from the front.
      g.save(); g.translate(u * W, H / 2); g.rotate(Math.PI / 2); g.fillText(ALPHABET[k], 0, 0); g.restore();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  // A flat annulus (the plugboard plate) with the 26 letters printed at their slot angles.
  function plateTexture() {
    const S = 1024, c = document.createElement("canvas"); c.width = c.height = S;
    const g = c.getContext("2d");
    g.fillStyle = "#1a1510"; g.fillRect(0, 0, S, S);
    g.fillStyle = "#e8d8a8"; g.font = "bold 50px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
    const rLabel = 3.12;   // letters sit just outside the sockets
    for (let k = 0; k < 26; k++) {
      const cx = S / 2 - (rLabel * Math.sin(k * STEP) * S) / (2 * R_PLATE);
      const cy = S / 2 - (rLabel * Math.cos(k * STEP) * S) / (2 * R_PLATE);
      g.fillText(L(k), cx, cy);
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
  }

  function letterTexture(letter) {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#f1e3b8"; g.font = "bold 44px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(letter, 32, 34);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
  }

  // A cylinder lying along the X axis (the axle direction).
  function xCylinder(rTop, rBottom, length, segs, material, open) {
    const g = new THREE.CylinderGeometry(rTop, rBottom, length, segs, 1, !!open);
    g.rotateZ(Math.PI / 2);
    return new THREE.Mesh(g, material);
  }

  // The ratchet wheel (the serrated gear you can see on a real rotor).
  function gearGeometry(rOuter, rRoot, rHole, teeth, thick) {
    const shape = new THREE.Shape();
    const d = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const a = i * d;
      const pts = [[rRoot, a], [rOuter, a + d * 0.88], [rRoot, a + d * 0.93]];
      for (const [r, ang] of pts) (i === 0 && r === rRoot && ang === a ? shape.moveTo : shape.lineTo).call(shape, r * Math.cos(ang), r * Math.sin(ang));
    }
    const hole = new THREE.Path(); hole.absarc(0, 0, rHole, 0, Math.PI * 2, true); shape.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 4 });
    g.rotateY(Math.PI / 2);
    return g;
  }

  // ---------- building the machine ----------
  function buildLightsAndEnvironment() {
    // Soft studio-style reflections so the metal looks like metal (a few glowing boxes, no image files).
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x120b06);
    const panel = (w, h, x, y, z, c) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(5) }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    };
    panel(8, 4, 0, 9, 4, 0xffe2b0); panel(5, 5, 9, 3, -3, 0xffc880); panel(5, 4, -9, 2, 5, 0xb8c8ff); panel(10, 2, 0, -3, 9, 0xffd9a0);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.03).texture;
    pm.dispose();
    scene.add(new THREE.HemisphereLight(0xffe9c4, 0x2a1a0e, 0.9));
    const key = new THREE.DirectionalLight(0xffe2b0, 3.0); key.position.set(6, 10, 8); scene.add(key);
    const fill = new THREE.DirectionalLight(0xbfd0ff, 1.0); fill.position.set(-7, 3, 9); scene.add(fill);
  }

  function buildBase() {
    // A wooden base and a steel axle that all the wheels sit on.
    const wood = new THREE.Mesh(new THREE.BoxGeometry(20.2, 0.5, 9), new THREE.MeshStandardMaterial({ color: 0x140c06, roughness: 0.9, metalness: 0, envMapIntensity: 0.2 }));
    wood.position.set(0, -3.75, -1.6); scene.add(wood);
    const bar = (w, d, x, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), metal(0xc9a24d, 0.35)); b.position.set(x, -3.47, z); scene.add(b); };
    bar(20.4, 0.12, 0, -1.6 - 4.5); bar(20.4, 0.12, 0, -1.6 + 4.5); bar(0.12, 9, -10.1, -1.6); bar(0.12, 9, 10.1, -1.6);
    const axle = xCylinder(0.13, 0.13, 17.2, 16, metal(0xb9bec4, 0.3));
    axle.position.set(0, 0, 0); scene.add(axle);
    // two small supports under the axle ends
    for (const x of [REFL_X - 0.2, PLUG_X + 0.2]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 0.7), metal(0x8a8f96, 0.4)); post.position.set(x, -1.8, 0); scene.add(post);
    }
  }

  function buildRotorShell(r, ringMat) {
    const spinner = new THREE.Group();
    const ringGroup = new THREE.Group();
    const wires = new THREE.Group();
    spinner.add(ringGroup, wires);
    spinner.position.x = ROTOR_X[r];
    scene.add(spinner);

    spinner.add(xCylinder(R_CORE, R_CORE, HALF * 2, 96, dark(0x1c1611, 0.5, 0.1)));
    for (const x of [HALF + 0.02, -HALF - 0.02]) {
      const plate = xCylinder(R_CORE, R_CORE, 0.05, 96, metal(0xc9a24d, 0.35, 0.18));
      plate.position.x = x; spinner.add(plate);
    }
    // ratchet wheel on the right side
    const gear = new THREE.Mesh(gearGeometry(2.62, 2.4, 1.95, 26, 0.2), metal(0xb9bec4, 0.35, 0.25));
    gear.position.x = 0.32; spinner.add(gear);

    const pinGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.2, 12); pinGeo.rotateZ(Math.PI / 2);
    const padGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16); padGeo.rotateZ(Math.PI / 2);
    const steel = steelMat(), brass = metal(0xd8b25a, 0.25);
    const pins = [], pads = [];
    for (let k = 0; k < 26; k++) {
      const pin = new THREE.Mesh(pinGeo, steel); pin.position.copy(circlePoint(k, R_FACE, HALF + 0.13));
      const pad = new THREE.Mesh(padGeo, brass); pad.position.copy(circlePoint(k, R_FACE, -HALF - 0.05));
      pin.userData.orig = steel; pad.userData.orig = brass;
      spinner.add(pin, pad); pins.push(pin); pads.push(pad);
    }

    // Letter ring (its own group so the ring setting can turn it against the wiring).
    const ringW = 0.9;
    const outer = xCylinder(R_RING, R_RING, ringW, 104, ringMat, true);
    const inner = xCylinder(R_RING - 0.15, R_RING - 0.15, ringW, 104, dark(0x14100c, 0.6, 0.3), true);
    inner.material.side = THREE.BackSide;
    ringGroup.add(outer, inner);
    for (const s of [1, -1]) {
      const cap = new THREE.Mesh(new THREE.RingGeometry(R_RING - 0.15, R_RING, 104), dark(0x14100c, 0.5, 0.3));
      cap.material.side = THREE.DoubleSide; cap.rotation.y = Math.PI / 2; cap.position.x = (s * ringW) / 2;
      ringGroup.add(cap);
    }
    ringGroup.position.x = -0.35;
    const notch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.26), metal(0xc9a24d, 0.3));
    ringGroup.add(notch);

    // Fixed pointer above the rotor: the letter under it is the "window" letter.
    const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 4), metal(0xc9a24d, 0.3));
    pointer.position.set(ROTOR_X[r], R_RING + 0.45, 0); pointer.rotation.z = Math.PI; scene.add(pointer);

    rot[r] = { spinner, ringGroup, wires, pins, pads, notch, spin: 0, built: { name: null, ring: null } };
  }

  // A wire inside a rotor, from pin i on the right face to pad o on the left face (in the rotor's own frame).
  function wireCurve(i, o) {
    const d = wrap13(o - i);
    const bump = 0.55 + 0.35 * (((i * 7) % 13) / 13);
    return new THREE.CatmullRomCurve3([
      circlePoint(i, R_FACE, HALF + 0.22),
      circlePoint(i, R_FACE * 0.92, HALF - 0.05),
      circlePoint(i + d * 0.35, R_FACE * bump, HALF * 0.45),
      circlePoint(i + d * 0.65, R_FACE * bump, -HALF * 0.45),
      circlePoint(i + d, R_FACE * 0.92, -HALF + 0.05),
      circlePoint(i + d, R_FACE, -HALF - 0.06),
    ], false, "catmullrom", 0.4);
  }

  // The wires, ring offset and notch depend on the rotor type and ring setting.
  function buildRotorWires(r, name, ring) {
    const R = rot[r];
    for (const c of [...R.wires.children]) { R.wires.remove(c); c.geometry.dispose(); c.material.dispose(); }
    const wiring = ROTORS[name].wiring;
    for (let i = 0; i < 26; i++) {
      R.wires.add(new THREE.Mesh(
        new THREE.TubeGeometry(wireCurve(i, toNum(wiring[i])), 40, 0.018, 6, false),
        new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(((i * 47) % 360) / 360, 0.55, 0.55), metalness: 0.3, roughness: 0.5, transparent: true, opacity: wireOpacity, depthWrite: false })));
    }
    R.ringGroup.rotation.x = -toNum(ring) * STEP;              // ring setting: ring turned against the wiring
    const notchAt = toNum(ROTORS[name].notch) * STEP;          // the notch sits at its letter on the ring
    R.notch.position.set(0, (R_RING + 0.02) * Math.cos(notchAt), (R_RING + 0.02) * Math.sin(notchAt));
    R.notch.rotation.x = notchAt;
    R.wires.visible = xray;
    R.built = { name, ring };
  }

  // The reflector's wires: 13 arcs pairing the letters up.
  function reflectorCurve(a, b) {
    const d = wrap13(b - a);
    const midR = R_FACE * (0.12 + 0.55 * (1 - Math.abs(d) / 13));
    return new THREE.CatmullRomCurve3([
      circlePoint(a, R_FACE, REFL_X + 0.62),
      circlePoint(a, R_FACE * 0.8, REFL_X + 0.3),
      circlePoint(a + d / 2, midR, REFL_X - 0.05),
      circlePoint(b, R_FACE * 0.8, REFL_X + 0.3),
      circlePoint(b, R_FACE, REFL_X + 0.62),
    ], false, "catmullrom", 0.5);
  }
  function buildReflector(name) {
    if (!refl) {
      const group = new THREE.Group(); scene.add(group);
      group.add(Object.assign(xCylinder(R_CORE, R_CORE, 1.1, 96, dark(0x1c1611, 0.5, 0.1)), {}));
      group.children[0].position.x = REFL_X;
      const face = xCylinder(R_CORE, R_CORE, 0.05, 96, metal(0xc9a24d, 0.35, 0.18)); face.position.x = REFL_X + 0.57; group.add(face);
      const cap = xCylinder(R_CORE * 0.55, R_CORE * 0.55, 0.5, 48, metal(0xb9bec4, 0.3, 0.25)); cap.position.x = REFL_X - 0.75; group.add(cap);
      const padGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16); padGeo.rotateZ(Math.PI / 2);
      const brass = metal(0xd8b25a, 0.25), pads = [];
      for (let k = 0; k < 26; k++) {
        const pad = new THREE.Mesh(padGeo, brass); pad.position.copy(circlePoint(k, R_FACE, REFL_X + 0.6)); pad.userData.orig = brass;
        group.add(pad); pads.push(pad);
      }
      refl = { group, pads, arcs: new THREE.Group(), name: null };
      group.add(refl.arcs);
    }
    for (const c of [...refl.arcs.children]) { refl.arcs.remove(c); c.geometry.dispose(); c.material.dispose(); }
    const table = REFLECTORS[name];
    for (let a = 0; a < 26; a++) {
      const b = toNum(table[a]);
      if (a < b) refl.arcs.add(new THREE.Mesh(new THREE.TubeGeometry(reflectorCurve(a, b), 30, 0.018, 6, false),
        new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(((a * 31) % 360) / 360, 0.5, 0.6), metalness: 0.3, roughness: 0.5, transparent: true, opacity: wireOpacity, depthWrite: false })));
    }
    refl.arcs.visible = xray;
    refl.name = name;
  }

  // The plugboard: a round plate at the right end with 26 labelled sockets; cables are drawn between them.
  function buildPlugboard() {
    const plate = new THREE.Mesh(new THREE.RingGeometry(2.15, R_PLATE, 104), new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.6, metalness: 0.2 }));
    plate.rotation.y = Math.PI / 2; plate.position.x = PLUG_X + 0.16; scene.add(plate);
    const body = xCylinder(R_PLATE, R_PLATE, 0.3, 104, dark(0x241a10, 0.6, 0.35), true); body.position.x = PLUG_X; scene.add(body);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R_PLATE, 0.07, 10, 104), metal(0xc9a24d, 0.3)); rim.rotation.y = Math.PI / 2; rim.position.x = PLUG_X + 0.16; scene.add(rim);
    const sockets = [], hits = [];
    const holeGeo = new THREE.TorusGeometry(0.2, 0.045, 8, 20); holeGeo.rotateY(Math.PI / 2);
    const dotGeo = new THREE.SphereGeometry(0.13, 14, 10);
    const brass = metal(0xd8b25a, 0.3);
    for (let k = 0; k < 26; k++) {
      const ring = new THREE.Mesh(holeGeo, brass); ring.position.copy(socketPos(k)); scene.add(ring);
      const dot = new THREE.Mesh(dotGeo, new THREE.MeshStandardMaterial({ color: 0x0a0705, roughness: 0.8 })); dot.position.copy(socketPos(k)); dot.userData.orig = dot.material; scene.add(dot);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.position.copy(socketPos(k)); hit.userData.letter = L(k); scene.add(hit);
      sockets.push(dot); hits.push(hit);
    }
    plug = { sockets, hits, cables: new THREE.Group() };
    scene.add(plug.cables);
  }
  function cableCurve(a, b) {
    const pa = socketPos(a), pb = socketPos(b);
    const mid = pa.clone().add(pb).multiplyScalar(0.5);
    const chord = pa.distanceTo(pb);
    return new THREE.QuadraticBezierCurve3(pa, new THREE.Vector3(mid.x + 1.0 + chord * 0.22, mid.y, mid.z), pb);
  }
  function buildCables() {
    for (const c of [...plug.cables.children]) { plug.cables.remove(c); c.geometry && c.geometry.dispose(); }
    Store.state.plugPairs.forEach((p, idx) => {
      const colour = new THREE.Color(PLUG_COLOURS[idx % PLUG_COLOURS.length]);
      const mat = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.5, metalness: 0.1 });
      plug.cables.add(new THREE.Mesh(new THREE.TubeGeometry(cableCurve(toNum(p[0]), toNum(p[1])), 30, 0.07, 8, false), mat));
      for (const ch of p) {
        const head = xCylinder(0.15, 0.15, 0.3, 14, mat); head.position.copy(socketPos(toNum(ch))); head.position.x += 0.1; plug.cables.add(head);
      }
    });
    // a socket waiting for its partner glows
    plug.sockets.forEach((s, k) => { s.material = s.userData.orig; });
    if (Store.state.pending) { const s = plug.sockets[toNum(Store.state.pending)]; s.material = glowMat[FWD]; }
    touch();
  }

  // The lamp board: three rows of lamps like the real machine, standing at the back.
  function buildLamps() {
    const board = new THREE.Group();
    board.position.set(0.8, 1.9, -5.6); board.rotation.x = -0.28; scene.add(board);
    board.add(new THREE.Mesh(new THREE.BoxGeometry(9.6, 3.3, 0.2), dark(0x17120d, 0.6)));
    const trim = new THREE.Mesh(new THREE.BoxGeometry(9.8, 3.5, 0.12), metal(0xc9a24d, 0.35)); trim.position.z = -0.1; board.add(trim);
    const glassGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 20); glassGeo.rotateX(Math.PI / 2);
    const labelGeo = new THREE.PlaneGeometry(0.46, 0.46);
    KEY_ROWS.forEach((row, ri) => {
      [...row].forEach((letter, ci) => {
        const x = (ci - (row.length - 1) / 2) * 0.86, y = 0.95 - ri * 1.0;
        const mat = new THREE.MeshStandardMaterial({ color: 0x4a3f2c, roughness: 0.3, metalness: 0.1, emissive: 0x000000 });
        const glass = new THREE.Mesh(glassGeo, mat); glass.position.set(x, y, 0.12); board.add(glass);
        const label = new THREE.Mesh(labelGeo, new THREE.MeshBasicMaterial({ map: letterTexture(letter), transparent: true }));
        label.position.set(x, y, 0.19); board.add(label);
        lamps[letter] = { glass, mat };
      });
    });
    lampLight = new THREE.PointLight(0xffb830, 0, 8); scene.add(lampLight);
    board.updateMatrixWorld(true);
  }

  function buildMachine() {
    buildLightsAndEnvironment();
    buildBase();
    const tex = ringTexture();
    const ringMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5 });
    fades.push({ m: ringMat, xrayOpacity: 0.3 });
    for (let r = 0; r < 3; r++) buildRotorShell(r, ringMat);
    buildReflector(Store.state.reflector);
    buildPlugboard();
    buildLamps();
    // the travelling bead
    bead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c0, toneMapped: false }));
    beadLight = new THREE.PointLight(0xffb830, 0, 7);
    bead.visible = false; scene.add(bead, beadLight);
    wiresGroup = new THREE.Group();
  }

  // Bring the 3D scene in line with the current settings (rotor types, rings, reflector, cables).
  function syncStatic(plugsChanged) {
    const s = Store.state;
    for (let r = 0; r < 3; r++) if (rot[r].built.name !== s.rotors[r] || rot[r].built.ring !== s.rings[r]) buildRotorWires(r, s.rotors[r], s.rings[r]);
    if (refl.name !== s.reflector) buildReflector(s.reflector);
    if (plugsChanged || !plug.built) { buildCables(); plug.built = true; }
    applyXray();
  }

  // ---------- glow and trail ----------
  function setGlow(mesh, kind, ctx) {
    if (!mesh || (ctx && ctx.dead)) return;
    mesh.material = glowMat[kind];
    glowing.push(mesh);
    touch();
  }
  function clearTrail() {
    for (const t of trail) { scene.remove(t); t.geometry.dispose(); }
    trail = [];
    for (const m of glowing) m.material = m.userData.orig;
    glowing = [];
    if (lampOn) { lamps[lampOn].mat.emissive.set(0x000000); lamps[lampOn].mat.color.set(0x4a3f2c); lampOn = null; }
    lampLight.intensity = 0; bead.visible = false; beadLight.intensity = 0;
    if (plug) plug.sockets.forEach((s) => { s.material = s.userData.orig; });
    if (plug && Store.state.pending) plug.sockets[toNum(Store.state.pending)].material = glowMat[FWD];
    touch();
  }

  // Send the glowing signal along a curve. The tube fills in behind the travelling bead.
  async function pulse(curve, kind, ms, ctx) {
    if (ctx && ctx.dead) return;
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 70, 0.07, 8, false), glowMat[kind]);
    const halo = new THREE.Mesh(new THREE.TubeGeometry(curve, 70, 0.17, 8, false), haloMat[kind]);
    scene.add(tube, halo); trail.push(tube, halo);
    const total = tube.geometry.index.count;
    tube.geometry.setDrawRange(0, 0); halo.geometry.setDrawRange(0, 0);
    bead.visible = true; beadLight.intensity = 3;
    beadLight.color.set(kind === FWD ? 0xffb830 : 0x57e0f0);
    const p = new THREE.Vector3();
    await anim(ms, (k) => {
      const n = Math.floor((k * total) / 3) * 3;
      tube.geometry.setDrawRange(0, n); halo.geometry.setDrawRange(0, n);
      curve.getPoint(k, p); bead.position.copy(p); beadLight.position.copy(p);
    }, ctx);
    bead.visible = false; beadLight.intensity = 0;
  }
  const line = (a, b) => new THREE.LineCurve3(a.clone(), b.clone());

  // The curve of one wire inside rotor r, in world space (the rotor is where it is right now).
  function rotorWire(r, i, forward) {
    const R = rot[r];
    R.spinner.rotation.x = R.spin; R.spinner.updateMatrixWorld(true);
    const wiring = ROTORS[Store.state.rotors[r]].wiring;
    const pts = wireCurve(i, toNum(wiring[i])).getPoints(40).map((p) => R.spinner.localToWorld(p.clone()));
    if (!forward) pts.reverse();
    return pts;
  }
  const slotOf = (v) => ((Math.round(Math.atan2(v.z, v.y) / STEP) % 26) + 26) % 26;
  function check(name, got, want) { if (verify.on && got !== want) verify.bad.push(`${name}: got slot ${got}, wanted ${want}`); }

  // ---------- the stages of one letter ----------
  function tickText(step) {
    const s = Store.state;
    const side = ["left", "middle", "right"];
    const moved = [0, 1, 2].map((r) => step.before[r] !== step.after[r]);
    const parts = [];
    parts.push(`The right rotor ticks forward from ${step.before[2]} to ${step.after[2]}.`);
    if (moved[1]) {
      parts.push(moved[0]
        ? `The middle rotor was sitting on its notch, so it ticks too (${step.before[1]} to ${step.after[1]}) and drags the left rotor with it (${step.before[0]} to ${step.after[0]}): the "double step".`
        : `The right rotor was on its notch, so it also nudges the middle rotor from ${step.before[1]} to ${step.after[1]}. The left rotor stays at ${step.after[0]}.`);
    } else {
      parts.push(`The middle rotor stays at ${step.after[1]} and the left rotor stays at ${step.after[0]}.`);
    }
    return parts.join(" ");
  }

  async function tickRotors(step, ctx) {
    const s = Store.state;
    const jobs = [];
    for (let r = 0; r < 3; r++) {
      const offB = mod26(toNum(step.before[r]) - toNum(s.rings[r])), offA = mod26(toNum(step.after[r]) - toNum(s.rings[r]));
      const d = wrap13(offA - offB);
      if (d !== 0) {
        const from = rot[r].spin, to = from - d * STEP;
        jobs.push(anim(450, (k) => { rot[r].spin = from + (to - from) * ease(k); }, ctx));
      }
    }
    await Promise.all(jobs.length ? jobs : [anim(200, null, ctx)]);
    if (!ctx.dead) updateWins(step.after);
  }

  // Build the list of stages for one letter. Each stage = { text, run }.
  function buildStages(step, ctx) {
    const G = (m, k) => setGlow(m, k, ctx), P = (c, k, ms) => pulse(c, k, ms, ctx), A = (ms, fn) => anim(ms, fn, ctx);
    const s = Store.state, p = step.res.path.map((x) => toNum(x.letter));   // p[0] key ... p[9] output
    const off = [0, 1, 2].map((r) => mod26(toNum(step.after[r]) - toNum(s.rings[r])));
    const wiring = [0, 1, 2].map((r) => ROTORS[s.rotors[r]].wiring);
    const inv = wiring.map(invertNums);
    const SIDE = ["left", "middle", "right"];
    const stages = [];
    const add = (text, run) => stages.push({ text, run });

    add(`You press the key ${L(p[0])}.`, async () => {
      G(plug.sockets[p[0]], FWD);
      document.querySelectorAll(`.keycap[data-letter="${L(p[0])}"]`).forEach((k) => { k.classList.add("down"); setTimeout(() => k.classList.remove("down"), 350); });
      await A(300);
    });
    add(tickText(step), () => tickRotors(step, ctx));

    // plugboard on the way in
    if (p[1] !== p[0]) add(`The plugboard has a cable between ${L(p[0])} and ${L(p[1])}, so the signal is swapped: ${L(p[0])} becomes ${L(p[1])}.`, async () => {
      await P(cableCurve(p[0], p[1]), FWD, 450); G(plug.sockets[p[1]], FWD);
    });
    else add(`There is no cable on ${L(p[0])}, so the signal passes straight through the plugboard.`, () => A(250));

    // helper for one forward or backward rotor pass
    const rotorStage = (r, cin, cout, forward) => async () => {
      const j = forward ? (cin + off[r]) % 26 : inv[r][(cin + off[r]) % 26];   // which wire inside the rotor carries it
      const pts = rotorWire(r, j, forward);
      check(`rotor ${r} ${forward ? "fwd" : "back"} start`, slotOf(pts[0]), cin);
      check(`rotor ${r} ${forward ? "fwd" : "back"} end`, slotOf(pts[pts.length - 1]), cout);
      G(forward ? rot[r].pins[j] : rot[r].pads[(cin + off[r]) % 26], forward ? FWD : BACK);
      await P(new THREE.CatmullRomCurve3(pts), forward ? FWD : BACK, 550);
      G(forward ? rot[r].pads[(cout + off[r]) % 26] : rot[r].pins[inv[r][(cin + off[r]) % 26]], forward ? FWD : BACK);
    };
    const hop = (a, b, kind, ms, glowMesh) => async () => { await P(line(a, b), kind, ms); if (glowMesh) G(glowMesh, kind); };
    const pinIdx = (r, c) => (c + off[r]) % 26;     // pin sitting at fixed slot c
    const padIdx = (r, c) => (c + off[r]) % 26;     // pad sitting at fixed slot c

    add(`The signal leaves the plugboard as ${L(p[1])} and enters the right rotor.`, hop(socketPos(p[1]), pinTip(2, p[1]), FWD, 220, rot[2].pins[pinIdx(2, p[1])]));
    add(`The right rotor scrambles ${L(p[1])} into ${L(p[2])}: inside, a wire joins those two contacts.`, rotorStage(2, p[1], p[2], true));
    add(`${L(p[2])} passes to the middle rotor.`, hop(padTip(2, p[2]), pinTip(1, p[2]), FWD, 200, rot[1].pins[pinIdx(1, p[2])]));
    add(`The middle rotor scrambles ${L(p[2])} into ${L(p[3])}.`, rotorStage(1, p[2], p[3], true));
    add(`${L(p[3])} passes to the left rotor.`, hop(padTip(1, p[3]), pinTip(0, p[3]), FWD, 200, rot[0].pins[pinIdx(0, p[3])]));
    add(`The left rotor scrambles ${L(p[3])} into ${L(p[4])}.`, rotorStage(0, p[3], p[4], true));
    add(`${L(p[4])} reaches the reflector.`, hop(padTip(0, p[4]), reflContact(p[4]), FWD, 220, refl.pads[p[4]]));
    add(`The reflector bounces ${L(p[4])} back as ${L(p[5])}. It pairs letters up, so the signal must return along a different path.`, async () => {
      await P(reflectorCurve(p[4], p[5]), FWD, 550); G(refl.pads[p[5]], BACK);
    });
    add(`${L(p[5])} goes back into the left rotor.`, hop(reflContact(p[5]), padTip(0, p[5]), BACK, 220, rot[0].pads[padIdx(0, p[5])]));
    add(`On the way back, the left rotor scrambles ${L(p[5])} into ${L(p[6])}.`, rotorStage(0, p[5], p[6], false));
    add(`${L(p[6])} goes back into the middle rotor.`, hop(pinTip(0, p[6]), padTip(1, p[6]), BACK, 200, rot[1].pads[padIdx(1, p[6])]));
    add(`The middle rotor scrambles ${L(p[6])} into ${L(p[7])}.`, rotorStage(1, p[6], p[7], false));
    add(`${L(p[7])} goes back into the right rotor.`, hop(pinTip(1, p[7]), padTip(2, p[7]), BACK, 200, rot[2].pads[padIdx(2, p[7])]));
    add(`The right rotor scrambles ${L(p[7])} into ${L(p[8])}.`, rotorStage(2, p[7], p[8], false));
    add(`${L(p[8])} heads back to the plugboard.`, hop(pinTip(2, p[8]), socketPos(p[8]), BACK, 220, plug.sockets[p[8]]));

    // plugboard on the way out
    if (p[9] !== p[8]) add(`The plugboard swaps ${L(p[8])} for ${L(p[9])} on the way out.`, async () => {
      await P(cableCurve(p[8], p[9]), BACK, 450); G(plug.sockets[p[9]], BACK);
    });
    else add(`No cable on ${L(p[8])}, so it passes straight through.`, () => A(250));

    add(`The lamp ${L(p[9])} lights up. Your ${L(p[0])} became ${L(p[9])}.`, async () => {
      const lamp = lamps[L(p[9])];
      const end = new THREE.Vector3(); lamp.glass.getWorldPosition(end);
      const start = socketPos(p[9]);
      const curve = new THREE.CubicBezierCurve3(start, start.clone().add(new THREE.Vector3(1.5, 2.5, 0)), end.clone().add(new THREE.Vector3(0.5, 1.5, 2.2)), end);
      await P(curve, BACK, 600);
      if (ctx.dead) return;
      lamp.mat.emissive.set(0xffb830); lamp.mat.color.set(0xffe9a0); lampOn = L(p[9]);
      lampLight.position.copy(end).add(new THREE.Vector3(0, 0, 1)); lampLight.intensity = 3;
      touch();
      await A(300);
    });
    return stages;
  }

  // ---------- the player ----------
  // Each playback has its own ctx. Setting ctx.dead = true cancels it, even in the middle of a stage.
  function newCtx() { activeCtx.dead = true; activeCtx = { dead: false }; return activeCtx; }

  async function gate(ctx) {
    // Pause and step-by-step both wait here, between stages.
    while (!ctx.dead && (paused || stepMode)) {
      const wasStep = stepMode && !paused;
      await new Promise((res) => { gateResolve = res; setButtons(); });
      gateResolve = null;
      setButtons();                // the Next button is only usable while the player is actually waiting
      if (wasStep) break;          // Next was pressed: run exactly one stage
    }
  }

  async function playLetter(step, ctx) {
    clearTrail();
    setWireOpacity(0.18);
    for (const st of buildStages(step, ctx)) {
      if (ctx.dead) return false;
      setCaption(st.text);
      await gate(ctx);
      if (ctx.dead) return false;
      await st.run();
    }
    return !ctx.dead;
  }

  async function playSteps(steps, ctx) {
    playing = true; paused = false; setButtons();
    for (let i = 0; i < steps.length; i++) {
      renderTape(steps, i, false);
      if (!(await playLetter(steps[i], ctx))) return false;
      renderTape(steps, i, true);
    }
    playing = false; setButtons(); setWireOpacity(0.6);
    return true;
  }

  function stopPlayback() {
    activeCtx.dead = true;
    if (gateResolve) { const g = gateResolve; gateResolve = null; g(); }
    finishAllTweens();
    playing = false; paused = false;
    clearTrail(); setWireOpacity(0.6);
    setButtons();
  }

  // Play the whole message from the start.
  async function playMessage() {
    if (!ready) return false;
    stopPlayback();
    const tr = Store.trace();
    if (!tr.steps.length) { setCaption("Type a name or any letters in the box first, then press Encrypt it."); renderTape(tr.steps, -1, true); return false; }
    snapPositions(tr.start);
    const done = await playSteps(tr.steps, newCtx());
    if (done) setCaption(`Done. ${tr.steps.map((x) => x.key).join("")} came out as ${tr.out}. To decrypt, press "Send the output back in", then Encrypt it again.`);
    return done;
  }

  // Animate only the letter that was just typed.
  async function playLast(snap) {
    stopPlayback();
    snapPositions(snap.before);
    const step = { key: snap.last.path[0].letter, res: snap.last, before: snap.before, after: snap.positions };
    const ctx = newCtx();
    playing = true; setButtons();
    const ok = await playLetter(step, ctx);
    if (!ctx.dead) { playing = false; setButtons(); setWireOpacity(0.6); }
    return ok;
  }
  // ---------- keeping the page controls in line ----------
  function setCaption(text) { byId("in-caption").textContent = text; }

  function snapPositions(positions) {
    const s = Store.state;
    for (let r = 0; r < 3; r++) {
      const target = -mod26(toNum(positions[r]) - toNum(s.rings[r])) * STEP;
      rot[r].spin = target + Math.round((rot[r].spin - target) / (Math.PI * 2)) * Math.PI * 2; // nearest equivalent angle
    }
    updateWins(positions);
    touch();
  }
  function updateWins(positions) {
    document.querySelectorAll("#in-wins .win").forEach((w, i) => {
      const t = w.firstElementChild;
      if (t.textContent !== positions[i]) { t.textContent = positions[i]; w.classList.remove("tick"); void w.offsetWidth; w.classList.add("tick"); }
    });
  }

  // The typed letters and what came out, as two rows of little tiles.
  function renderTape(steps, current, currentDone) {
    const el = byId("in-tape");
    if (!steps.length) { el.innerHTML = ""; return; }
    const tile = (cls, ch) => `<span class="ch ${cls}">${ch}</span>`;
    let top = "", bottom = "";
    steps.forEach((st, i) => {
      const state = current < 0 || i < current || (i === current && currentDone) ? "" : i === current ? "now" : "todo";
      const shown = state === "" || (i === current && currentDone);
      top += tile(i === current && !currentDone ? "now" : state === "todo" ? "todo" : "", st.key);
      bottom += tile(`out ${shown ? "" : "todo"}${i === current && currentDone ? " now" : ""}`, shown ? st.res.output : "·");
    });
    el.innerHTML = `<div class="tr"><span class="lab">You typed</span>${top}</div><div class="tr"><span class="lab">Comes out</span>${bottom}</div>`;
  }
  function renderTapeFinal() {
    const tr = Store.trace();
    renderTape(tr.steps, -1, true);
    return tr;
  }

  function setButtons() {
    byId("in-pause").disabled = !playing || stepMode;
    byId("in-pause").textContent = paused ? "▶ Resume" : "⏸ Pause";
    byId("in-next").disabled = !(playing && stepMode && gateResolve);
    byId("in-step").setAttribute("aria-pressed", String(stepMode));
  }

  // Called whenever the shared machine changes (settings, typed text, or a key press).
  function onChange(animate, plugs) {
    if (!ready) return;
    syncStatic(plugs);
    syncControls();
    const snap = Store.snapshot();
    if (animate && snap.last) { renderTapeFinal(); playLast(snap); return; }
    stopPlayback();
    snapPositions(snap.positions);
    renderTapeFinal();
  }

  // Keep the inputs in this view showing the shared state.
  function syncControls() {
    const s = Store.state;
    const msg = byId("in-message");
    if (document.activeElement !== msg && msg.value !== s.input) msg.value = s.input;
    const cables = byId("in-cables");
    if (document.activeElement !== cables) cables.value = s.plugPairs.join(" ");
  }

  // ---------- camera and mouse/touch ----------
  const target = new THREE.Vector3();
  function applyCam() {
    const s = Math.sin(cam.phi);
    target.set(cam.tx, cam.ty, cam.tz);
    // On a narrow stage (phones) pull the camera back so the whole machine still fits across the width.
    const d = cam.dist * Math.max(1, 1.78 / camera.aspect);
    camera.position.set(target.x + d * s * Math.sin(cam.theta), target.y + d * Math.cos(cam.phi), target.z + d * s * Math.cos(cam.theta));
    camera.lookAt(target);
    touch();
  }
  function flyTo(v, ms = 700) {
    const a = { ...cam };
    if (prefersReduced) { Object.assign(cam, v); applyCam(); return; }
    tweenRaw(ms, (k) => { const e = ease(k); for (const key of Object.keys(v)) cam[key] = a[key] + (v[key] - a[key]) * e; applyCam(); });
  }
  const PRESETS = {
    whole: { theta: 0.5, phi: 1.15, dist: 20.5, tx: 0.3, ty: 0.3, tz: -0.5 },
    letters: { theta: 0.12, phi: 1.3, dist: 23, tx: 0, ty: 0, tz: 0 },
    face: { theta: Math.PI / 2, phi: Math.PI / 2, dist: 13, tx: 3.6, ty: 0, tz: 0 },
    top: { theta: 0.2, phi: 0.25, dist: 24, tx: 0, ty: 0, tz: 0 },
  };

  function wireMouse() {
    const pts = new Map();
    let pinch = 0, moved = 0, startX = 0, startY = 0;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, e); canvas.style.cursor = "grabbing"; moved = 0; startX = e.clientX; startY = e.clientY; });
    canvas.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId);
      pts.set(e.pointerId, e);
      moved += Math.abs(e.clientX - prev.clientX) + Math.abs(e.clientY - prev.clientY);
      if (pts.size === 1) {
        cam.theta -= (e.clientX - prev.clientX) * 0.008;
        cam.phi = Math.min(Math.PI - 0.1, Math.max(0.1, cam.phi - (e.clientY - prev.clientY) * 0.008));
        applyCam();
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        if (pinch) { cam.dist = Math.min(40, Math.max(7, cam.dist * (pinch / d))); applyCam(); }
        pinch = d;
      }
    });
    const up = (e) => {
      // a tap (not a drag) on a plugboard socket plugs or unplugs it
      if (e.type === "pointerup" && moved < 6 && pts.size === 1) {
        const rect = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(plug.hits, false)[0];
        if (hit && Store.togglePlug(hit.object.userData.letter) === "limit") byId("in-cables-msg").textContent = "The real machine used at most 10 cables.";
      }
      pts.delete(e.pointerId); pinch = 0; canvas.style.cursor = "grab";
    };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      cam.dist = Math.min(40, Math.max(7, cam.dist * (1 + e.deltaY * 0.001)));
      applyCam();
    }, { passive: false });
  }

  // ---------- page controls ----------
  function wireControls() {
    byId("labels-btn").addEventListener("click", (e) => { showLabels = !showLabels; e.currentTarget.setAttribute("aria-pressed", String(showLabels)); touch(); });
    byId("xray").addEventListener("click", (e) => { xray = !xray; e.currentTarget.setAttribute("aria-pressed", String(xray)); applyXray(); });
    byId("speed").addEventListener("change", (e) => { speed = Number(e.target.value); });
    document.querySelectorAll("[data-cam]").forEach((b) => b.addEventListener("click", () => flyTo(PRESETS[b.dataset.cam])));

    // message bar
    byId("in-message").addEventListener("input", (e) => Store.setInput(e.target.value, true));
    byId("in-message").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); playMessage(); } });
    byId("in-play").addEventListener("click", () => playMessage());
    byId("in-pause").addEventListener("click", () => {
      paused = !paused;
      if (!paused && gateResolve) { const g = gateResolve; gateResolve = null; g(); }
      setButtons();
    });
    byId("in-step").addEventListener("click", () => {
      stepMode = !stepMode;
      if (!stepMode && gateResolve) { const g = gateResolve; gateResolve = null; g(); }
      setButtons();
    });
    byId("in-next").addEventListener("click", () => { if (gateResolve) { const g = gateResolve; gateResolve = null; g(); } });
    byId("in-restart").addEventListener("click", () => { stopPlayback(); snapPositions(Store.state.positions); renderTape(Store.trace().steps, 0, false); setCaption("Dials set back to their start. Press Encrypt it to watch again."); });
    byId("in-back").addEventListener("click", () => {
      const tr = Store.trace();
      if (!tr.out) return;
      Store.setInput(tr.out, true);
      stopPlayback(); snapPositions(Store.state.positions);
      setCaption("The scrambled text is now the input. Press Encrypt it: with the same settings, the original comes back.");
    });

    // cables typed as text
    byId("in-cables").addEventListener("change", (e) => {
      const problem = Store.setPlugs(e.target.value);
      byId("in-cables-msg").textContent = problem || "Pairs of letters swapped by the plugboard. You can also click the sockets on the 3D plugboard.";
      if (problem) e.target.setCustomValidity(problem); else e.target.setCustomValidity("");
    });

    // dial readouts (rotor windows)
    byId("in-wins").innerHTML = SIDES.map((side) => `<div class="win-wrap"><div class="win"><span>A</span></div>${side}</div>`).join("");

    // on-screen keys for touch screens (same look as the Simple view)
    byId("in-keys").innerHTML = KEY_ROWS.map((r) => `<div class="row">${[...r].map((l) => `<button type="button" class="keycap" data-letter="${l}">${l}</button>`).join("")}</div>`).join("");
    byId("in-keys").addEventListener("click", (e) => { const b = e.target.closest("[data-letter]"); if (b) Store.addLetter(b.dataset.letter); });
  }

  function resize() {
    if (!ready) return;
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    applyCam();
  }

  function fail(reason) {
    failed = true;
    stage.innerHTML = `<p class="placeholder" style="padding:1.5rem">Your browser cannot show the 3D view${reason ? " (" + reason + ")" : ""}. The Simple view works everywhere.</p>`;
    if (window.EnigmaUI) window.EnigmaUI.showView("simple");
  }

  // Start the 3D scene the first time the Inside view is shown.
  function init() {
    if (ready || failed) return;
    stage = byId("stage"); canvas = byId("gl");
    try {
      if (!window.THREE) throw new Error("three.js missing");
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) { return fail(e.message); }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 200);
    buildMachine(); buildLabels();
    wireControls(); wireMouse();
    ready = true;
    const s = Store.state;
    for (let r = 0; r < 3; r++) buildRotorWires(r, s.rotors[r], s.rings[r]);
    syncStatic(true);
    applyCam();
    new ResizeObserver(resize).observe(stage);
    Store.subscribe(({ animate, plugs }) => onChange(animate, plugs));
    resize();
    onChange(false, true);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) touch(); });
  }

  // Called when the Inside view becomes visible.
  function show() { init(); if (ready) { resize(); touch(); } }

  return {
    show, resize, playMessage, stopPlayback,
    isReady: () => ready,
    finishAll: () => finishAllTweens(),
    renderNow: () => { if (ready) render(); },
    setXray: (v) => { xray = v; if (ready) { byId("xray").setAttribute("aria-pressed", String(v)); applyXray(); } },
    setSpeed: (v) => { speed = v; },
    setStepMode: (v) => { stepMode = v; setButtons(); },
    verify: (on) => { verify.on = on; verify.bad = []; },
    problems: () => verify.bad.slice(),
    holdTrail: () => {},
    camera: (name) => { Object.assign(cam, PRESETS[name]); applyCam(); },
    // Smooth camera move to a preset name or to {theta, phi, dist, tx, ty, tz} (used by the video director in tools/reel).
    fly: (v, ms) => flyTo(typeof v === "string" ? PRESETS[v] : v, ms),
    isPlaying: () => playing,
    // Test helper: finish every pending animation step right now, again and again, until playback ends.
    // (Lets automated tests check the logic without waiting for real animation frames.)
    drain: async (maxRounds = 20000) => {
      for (let i = 0; i < maxRounds && (playing || tweens.length); i++) { finishAllTweens(); await new Promise((r) => setTimeout(r, 0)); }
    },
  };
})();
