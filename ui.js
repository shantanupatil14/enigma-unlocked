// ui.js - the Simple view: everything you see and click on the classic machine page.
// All the machine's settings and message live in store.js (shared with the Inside view).
// This file only draws them and passes clicks back to the store.

const KEY_ROWS = ["QWERTZUIOP", "ASDFGHJKL", "PYXCVBNM"]; // the real machine's keyboard layout
const SIDES = ["Left", "Middle", "Right"];
const PLUG_COLOURS = ["#e57373", "#64b5f6", "#81c784", "#ffd54f", "#ba68c8", "#4dd0e1", "#ff8a65", "#a1887f", "#f06292", "#aed581"];
const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const state = Store.state; // shortcut: read-only use in this file, changes go through Store actions

// ---------- Build the static parts of the page ----------
const letterOptions = [...ALPHABET].map((l) => `<option>${l}</option>`).join("");

function buildRotorSettings() {
  // The same rotor controls appear in both views; they all read from and write to the Store.
  const html = SIDES.map((side, i) => `
    <div class="rs"><b>${side} rotor</b>
      <label>Type <select data-rotor="${i}">${Object.keys(ROTORS).map((r) => `<option>${r}</option>`).join("")}</select></label>
      <label>Starts at <select data-pos="${i}">${letterOptions}</select></label>
      <label class="full-only">Ring <select data-ring="${i}">${letterOptions}</select></label>
    </div>`).join("");
  $("rotor-settings").innerHTML = html;
  $("in-rotor-settings").innerHTML = html;
  $("windows").innerHTML = SIDES.map((side, i) =>
    `<div class="win-wrap"><div class="win" id="win${i}"><span>A</span></div>${side}</div>`).join("");
}

function buildKeyboards() {
  const make = (cls, tag, extra) => KEY_ROWS.map((row) =>
    `<div class="row">${[...row].map((l) => `<${tag} class="${cls}" data-letter="${l}" ${extra}>${l}</${tag}>`).join("")}</div>`).join("");
  $("lamps").innerHTML = make("lamp", "div", 'aria-hidden="true"');
  $("keys").innerHTML = make("keycap", "button", 'type="button"');
  $("plugs").innerHTML = make("plug", "button", 'type="button"');
}

// ---------- Drawing the screen from the state ----------
let lampTimer = null;
let pathTimers = [];

function syncControls() {
  document.querySelectorAll("[data-rotor]").forEach((s) => (s.value = state.rotors[s.dataset.rotor]));
  document.querySelectorAll("[data-pos]").forEach((s) => (s.value = state.positions[s.dataset.pos]));
  document.querySelectorAll("[data-ring]").forEach((s) => (s.value = state.rings[s.dataset.ring]));
  document.querySelectorAll(".reflector-select").forEach((s) => (s.value = state.reflector));
  if ($("input").value !== state.input) $("input").value = state.input;
}

function renderCounter() {
  const k = state.plugPairs.length;
  const total = 60n * 17576n * Store.plugCombos(k); // rotor orders x start positions x cable choices
  const sci = Number(total).toExponential(2).replace("e+", " × 10^");
  $("keycount").textContent = total < 1000000000n ? total.toLocaleString() : sci;
  $("keynote").textContent = k === 0
    ? "That is 60 rotor orders × 17,576 start positions. Add cables and watch it explode."
    : `${k} cable${k > 1 ? "s" : ""}: 60 rotor orders × 17,576 start positions × ${Store.plugCombos(k).toLocaleString()} cable choices.`;
}

function renderPlugs() {
  document.querySelectorAll(".plug").forEach((el) => {
    const letter = el.dataset.letter;
    const idx = state.plugPairs.findIndex((p) => p.includes(letter));
    const partner = idx >= 0 ? state.plugPairs[idx].replace(letter, "") : "";
    el.className = "plug" + (idx >= 0 ? " paired" : "") + (state.pending === letter ? " pending" : "");
    el.style.background = idx >= 0 ? PLUG_COLOURS[idx] : "";
    el.innerHTML = letter + (partner ? `<small>${partner}</small>` : "");
    el.setAttribute("aria-label", idx >= 0 ? `${letter}, cabled to ${partner}` : `${letter}, no cable`);
  });
  $("pairs").textContent = state.pending
    ? `${state.pending} selected. Now click the letter to connect it to.`
    : state.plugPairs.length ? "Cables: " + state.plugPairs.map((p) => `${p[0]}↔${p[1]}`).join("   ") : "No cables yet.";
  renderCounter();
}

function groupFive(text) {
  return $("group5").checked ? text.replace(/(.{5})/g, "$1 ").trim() : text;
}

// Plain-English sentence for each step of the letter's path.
// (Also used by the Inside view, so it hangs off window.)
function explainStep(path, j, positions) {
  const prev = path[j - 1] && path[j - 1].letter, cur = path[j] && path[j].letter;
  if (j === 0) return `You pressed ${cur}. Before anything else, the rotors tick forward, and the windows now read ${positions}.`;
  if (j === 1) return prev === cur ? `The plugboard has no cable on ${prev}, so it passes straight through.` : `A cable swaps ${prev} for ${cur}.`;
  if (j <= 4) return `The ${SIDES[4 - j].toLowerCase()} rotor scrambles ${prev} into ${cur}.`;
  if (j === 5) return `The mirror bounces ${prev} back as ${cur}.`;
  if (j <= 8) return `On the way back, the ${SIDES[j - 6].toLowerCase()} rotor scrambles ${prev} into ${cur}.`;
  if (j === 9) return prev === cur ? `On the way out the plugboard has no cable on ${prev}, so it passes straight through.` : `On the way out, a cable swaps ${prev} for ${cur}.`;
  return `The lamp for ${cur} lights up. Your ${path[0].letter} became ${cur}.`;
}
window.explainStep = explainStep;

function showPath(result) {
  pathTimers.forEach(clearTimeout);
  pathTimers = [];
  if (!result) {
    $("chain").innerHTML = "";
    $("caption").textContent = "Press a key to see its journey through the machine.";
    return;
  }
  // Ten stages from the machine, plus the final lamp.
  const path = [...result.path, { stage: "Lamp", letter: result.output }];
  const titles = ["Key", "Plugboard", "Right rotor", "Middle rotor", "Left rotor", "Mirror", "Left rotor back", "Middle rotor back", "Right rotor back", "Plugboard out", "Lamp"];
  $("chain").innerHTML = path.map((p, j) => `<div class="card" data-j="${j}"><small>${titles[j]}</small><b>${p.letter}</b></div>`).join("");
  const cards = [...document.querySelectorAll(".card")];
  const focus = (j) => {
    cards.forEach((c, k) => { c.classList.toggle("on", k <= j); c.classList.toggle("now", k === j); });
    $("caption").textContent = explainStep(path, j, result.positions);
  };
  cards.forEach((c, j) => c.addEventListener("click", () => focus(j)));
  if (reducedMotion) { focus(path.length - 1); return; }
  path.forEach((_, j) => pathTimers.push(setTimeout(() => focus(j), j * 260)));
}

function lightLamp(letter) {
  document.querySelectorAll(".lamp.lit").forEach((l) => l.classList.remove("lit"));
  const lamp = document.querySelector(`.lamp[data-letter="${letter}"]`);
  if (lamp) lamp.classList.add("lit");
  $("live").textContent = letter;
  clearTimeout(lampTimer);
  lampTimer = setTimeout(() => lamp && lamp.classList.remove("lit"), 1100);
}

let lastWindows = "AAA";
function render(animateLast) {
  syncControls();
  const snap = Store.snapshot();
  // Rotor windows show where the rotors are right now (after the whole message so far).
  [...snap.positions].forEach((letter, i) => {
    const w = $("win" + i);
    w.firstElementChild.textContent = letter;
    if (letter !== lastWindows[i]) {
      w.classList.remove("tick"); void w.offsetWidth; w.classList.add("tick");
    }
  });
  lastWindows = snap.positions;

  $("output").textContent = groupFive(snap.out);
  if (animateLast && snap.last) {
    lightLamp(snap.last.output);
    if ($("showpath").checked) showPath(snap.last);
  }
  if (!snap.last) showPath(null);
  $("path-panel").style.display = $("showpath").checked ? "" : "none";
}

// ---------- Reacting to the user (every change goes through the Store) ----------
function wireEvents() {
  // Changing rotor type, start position, ring, reflector.
  for (const id of ["rotor-settings", "in-rotor-settings"]) {
    $(id).addEventListener("change", (e) => {
      const t = e.target.dataset, v = e.target.value;
      if (t.rotor !== undefined) Store.setRotor(Number(t.rotor), v);
      else if (t.pos !== undefined) Store.setPosition(Number(t.pos), v);
      else if (t.ring !== undefined) Store.setRing(Number(t.ring), v);
    });
  }
  document.querySelectorAll(".reflector-select").forEach((s) =>
    s.addEventListener("change", (e) => Store.setReflector(e.target.value)));

  // On-screen keys.
  $("keys").addEventListener("click", (e) => {
    const b = e.target.closest("[data-letter]");
    if (b) Store.addLetter(b.dataset.letter);
  });

  // Physical keyboard (ignored while typing in a box or menu).
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!isMachineVisible()) return;
    if (/^(TEXTAREA|INPUT|SELECT)$/.test(document.activeElement.tagName)) return;
    if (/^[a-zA-Z]$/.test(e.key)) {
      const letter = e.key.toUpperCase();
      document.querySelectorAll(`.keycap[data-letter="${letter}"]`).forEach((cap) => cap.classList.add("down"));
      if (!e.repeat) Store.addLetter(letter);
    } else if (e.key === "Backspace") {
      Store.backspace();
    }
  });
  document.addEventListener("keyup", () => {
    document.querySelectorAll(".keycap.down").forEach((k) => k.classList.remove("down"));
  });

  // Typing or pasting in the message box.
  $("input").addEventListener("input", (e) => Store.setInput(e.target.value));

  // Plugboard clicks.
  $("plugs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-letter]");
    if (!b) return;
    if (Store.togglePlug(b.dataset.letter) === "limit") {
      renderPlugs(); // clears the "selected" highlight
      $("pairs").textContent = "The real machine used at most 10 cables.";
    }
  });

  // Buttons and toggles.
  $("group5").addEventListener("change", () => render(false));
  $("showpath").addEventListener("change", () => render(false));
  $("clear").addEventListener("click", () => Store.clearInput());
  $("copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("output").textContent); $("copy").textContent = "Copied!"; }
    catch (err) { $("copy").textContent = "Select the text to copy"; }
    setTimeout(() => ($("copy").textContent = "Copy output"), 1500);
  });
  document.querySelectorAll(".load-test").forEach((b) => b.addEventListener("click", () =>
    Store.load({ rotors: ["I", "II", "III"], reflector: "B", rings: "AAA", positions: "AAA", plugboard: "" }, "AAAAA")));

  // Beginner / Full mode (the same two buttons appear in both views).
  const setMode = (full) => {
    document.body.classList.toggle("full", full);
    document.querySelectorAll("[data-mode]").forEach((b) =>
      b.setAttribute("aria-pressed", String((b.dataset.mode === "full") === full)));
  };
  document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode === "full")));

  // Tabs.
  $("nav").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) showTab(b.dataset.tab);
  });
}

// Is a machine view on screen right now? (Physical keys only work then.)
function isMachineVisible() {
  return !$("tab-machine").hidden;
}

function showTab(name) {
  document.querySelectorAll("main > section").forEach((s) => (s.hidden = s.id !== "tab-" + name));
  document.querySelectorAll("#nav button").forEach((b) =>
    b.dataset.tab === name ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  try { history.replaceState(null, "", "#" + name); } catch (e) { /* file:// pages can refuse; the tab still works */ }
  if (name === "machine" && !$("view-inside").hidden) Inside3D.show(); // the 3D canvas needs a resize when it reappears
}

// Switch between the 3D Inside view and the Simple view (same machine behind both).
function showView(name) {
  const inside = name === "inside";
  $("view-inside").hidden = !inside;
  $("view-simple").hidden = inside;
  $("vb-inside").setAttribute("aria-pressed", String(inside));
  $("vb-simple").setAttribute("aria-pressed", String(!inside));
  if (inside && !$("tab-machine").hidden) Inside3D.show();   // do not start the 3D scene until the Machine tab is actually open
}
$("vb-inside").addEventListener("click", () => showView("inside"));
$("vb-simple").addEventListener("click", () => showView("simple"));

// Open the tab named in the address (#learn, #machine ...), or the Story by default.
function start() {
  const wanted = (location.hash || "").slice(1);
  showView("inside");
  showTab(["story", "learn", "machine", "library", "about"].includes(wanted) ? wanted : "story");
}

window.EnigmaUI = { load: Store.load, showTab, showView, start };

// ---------- Start up ----------
buildRotorSettings();
buildKeyboards();
wireEvents();
Store.subscribe(({ animate, plugs }) => {
  if (plugs) renderPlugs();
  render(animate);
});
renderPlugs();
render(false);
