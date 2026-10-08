// store.js - the ONE shared machine: settings + typed message + the actions that change them.
// Every view (the Simple view, the 3D Inside view, later the lessons) reads from here and
// listens for changes, so they always show the same machine.
// The screen is worked out from two things only: the settings and the typed message.

const Store = (() => {
  const state = {
    rotors: ["I", "II", "III"], reflector: "B", rings: "AAA", positions: "AAA",
    plugPairs: [], pending: null, input: "",
  };
  const listeners = [];

  // Tell every view something changed.
  //   animate: a letter was just typed, so show its journey
  //   plugs:   the cables changed, so redraw them
  function emit(animate = false, plugs = false) {
    listeners.forEach((fn) => fn({ animate, plugs }));
  }

  function makeMachine() {
    return new Enigma({
      rotors: state.rotors, reflector: state.reflector, rings: state.rings,
      positions: state.positions, plugboard: state.plugPairs.join(" "),
    });
  }

  // Run the whole message through a fresh machine.
  // Returns the output text, the last letter's full result, and the rotor windows
  // before and after that last letter (so a view can animate the tick).
  function snapshot() {
    const m = makeMachine();
    let out = "", last = null, before = m.getPositions();
    for (const ch of state.input.toUpperCase()) {
      if (!ALPHABET.includes(ch)) continue;
      before = m.getPositions();
      last = m.encryptLetter(ch);
      out += last.output;
    }
    return { out, last, before: last ? before : m.getPositions(), positions: m.getPositions() };
  }

  // Count the ways to choose k cable pairs out of 26 letters (exact, using BigInt).
  function plugCombos(k) {
    let top = 1n, bottom = 1n;
    for (let i = 0; i < 2 * k; i++) top *= BigInt(26 - i);
    for (let i = 1; i <= k; i++) bottom *= BigInt(i) * 2n;
    return top / bottom;
  }

  // Every letter of the message, one by one: the key, the full path it took, and the rotor windows
  // before and after. This is what the Inside view plays back as an animation.
  function trace() {
    const m = makeMachine();
    const steps = [];
    let out = "";
    for (const ch of state.input.toUpperCase()) {
      if (!ALPHABET.includes(ch)) continue;
      const before = m.getPositions();
      const res = m.encryptLetter(ch);
      steps.push({ key: ch, res, before, after: m.getPositions() });
      out += res.output;
    }
    return { steps, start: state.positions, out };
  }

  const setChar = (text, i, letter) => text.slice(0, i) + letter + text.slice(i + 1);

  return {
    state, makeMachine, snapshot, trace, plugCombos,
    subscribe: (fn) => listeners.push(fn),
    refresh: () => emit(false, true),

    // --- Typing ---
    addLetter(letter) { state.input += letter; emit(true); },
    backspace() { state.input = state.input.slice(0, -1); emit(true); },
    // silent = true: the text changed but no key was "pressed" (e.g. typing a name into the message bar)
    setInput(text, silent = false) { const grew = text.length > state.input.length; state.input = text; emit(grew && !silent); },
    clearInput() { state.input = ""; emit(false); },

    // --- Settings ---
    setRotor(i, name) {
      const other = state.rotors.indexOf(name);
      if (other >= 0) state.rotors[other] = state.rotors[i]; // the real machine can't use one rotor twice, so swap
      state.rotors[i] = name;
      emit(false);
    },
    setPosition(i, letter) { state.positions = setChar(state.positions, i, letter); emit(false); },
    setRing(i, letter) { state.rings = setChar(state.rings, i, letter); emit(false); },
    setReflector(name) { state.reflector = name; emit(false); },

    // --- Plugboard: click a letter, then its partner. Click a cabled letter to unplug it.
    // Returns "limit" if the 10-cable maximum was hit, otherwise "ok".
    togglePlug(l) {
      const existing = state.plugPairs.findIndex((p) => p.includes(l));
      if (existing >= 0) { state.plugPairs.splice(existing, 1); state.pending = null; }
      else if (state.pending === null) state.pending = l;
      else if (state.pending === l) state.pending = null;
      else if (state.plugPairs.length >= 10) { state.pending = null; return "limit"; }
      else { state.plugPairs.push(state.pending + l); state.pending = null; }
      emit(false, true);
      return "ok";
    },

    // Set all cables from text such as "AM FI NV". Returns "" if fine, otherwise a plain-English problem.
    setPlugs(text) {
      const pairs = text.toUpperCase().split(/[\s,]+/).filter(Boolean);
      const seen = new Set();
      if (pairs.length > 10) return "The real machine used at most 10 cables.";
      for (const p of pairs) {
        if (!/^[A-Z]{2}$/.test(p) || p[0] === p[1]) return `"${p}" is not a pair of two different letters.`;
        for (const l of p) {
          if (seen.has(l)) return `The letter ${l} is used twice. Each letter fits only one cable.`;
          seen.add(l);
        }
      }
      state.plugPairs = pairs;
      state.pending = null;
      emit(false, true);
      return "";
    },

    // Load a full set of settings and a message (the Code Library uses this).
    // animate: show just the last letter's journey (default when there is a message)
    load(settings, message, animate = Boolean(message)) {
      state.rotors = settings.rotors.slice();
      state.reflector = settings.reflector;
      state.rings = settings.rings;
      state.positions = settings.positions;
      state.plugPairs = (settings.plugboard || "").split(/\s+/).filter(Boolean);
      state.pending = null;
      state.input = message || "";
      emit(animate, true);
    },
  };
})();
