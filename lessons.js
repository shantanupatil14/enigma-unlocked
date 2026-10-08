// lessons.js - the Learn tab: seven short chapters, each opening with a sketch scene and ending with something to try.
// The text follows the approved lesson draft. The widgets use the same Enigma class as the machine, so what they
// show is what the real machine does.

const Lessons = (() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const L = (n) => ALPHABET[((n % 26) + 26) % 26];
  const STANDARD = { rotors: ["I", "II", "III"], reflector: "B", rings: "AAA", positions: "AAA", plugboard: "" };
  const QWERTY = "QWERTYUIOPASDFGHJKLZXCVBNM";           // the fixed swap code from Chapter 1: A->Q, B->W, C->E ...
  const clean = (t) => t.toUpperCase().replace(/[^A-Z]/g, "");
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const five = (t) => t.replace(/(.{5})/g, "$1 ").trim();

  // ---------------------------------------------------------------- widgets
  function widgetBigPicture(box) {
    const parts = [
      ["Key", "You press a letter on the keyboard."],
      ["Plugboard", "Optional cables swap some pairs of letters."],
      ["Three wheels", "The letter goes through the right, middle and left wheels, being scrambled each time."],
      ["Mirror", "A fixed plate bounces the signal back."],
      ["Wheels again", "The signal returns through the three wheels by a different path."],
      ["Plugboard", "The cables swap the letter a second time."],
      ["Lamp", "A different letter lights up. That is the scrambled letter."],
    ];
    box.innerHTML = `<div class="chain2">${parts.map((p, i) => `<button type="button" class="link" data-i="${i}">${i + 1}. ${p[0]}</button>`).join('<span class="arr">→</span>')}</div>
      <p class="linkinfo" aria-live="polite">Click any step to read what happens there.</p>`;
    box.addEventListener("click", (e) => {
      const b = e.target.closest(".link"); if (!b) return;
      box.querySelectorAll(".link").forEach((x) => x.classList.toggle("on", x === b));
      $(".linkinfo", box).textContent = parts[Number(b.dataset.i)][1];
    });
  }

  function widgetFrequency(box) {
    const SAMPLE = "THE EVENING WAS QUIET AND THE RADIO ROOM WAS WARM. ANNA CHECKED THE CLOCK, THEN TYPED THE MESSAGE THAT HAD TO REACH THE OTHER SIDE OF THE SEA BEFORE MORNING. SHE KNEW THAT SOMEONE, SOMEWHERE, WAS LISTENING TO EVERY SIGNAL. EVERY LETTER THAT LEFT HER MACHINE HAD TO LOOK LIKE NOTHING AT ALL. HER FRIEND WOULD BE WAITING, READY TO TURN THE NONSENSE BACK INTO WORDS. THE WHOLE PLAN DEPENDED ON ONE THING, THAT NOBODY ELSE COULD EVER READ IT.";
    let mode = "swap";
    box.innerHTML = `
      <label for="w1-text"><b>Type or paste a message in English</b></label>
      <textarea id="w1-text" spellcheck="false" rows="5">${esc(SAMPLE)}</textarea>
      <div class="seg" role="group" aria-label="Which code">
        <button type="button" data-mode="swap" aria-pressed="true">Fixed swap code</button><button type="button" data-mode="enigma" aria-pressed="false">Enigma</button>
      </div>
      <div class="w-out"><div class="lib-label">Scrambled text</div><div class="lib-cipher" id="w1-cipher"></div></div>
      <div class="lib-label">How often each scrambled letter appears</div>
      <div class="bars2" id="w1-bars" aria-hidden="true"></div>
      <p class="w-note" id="w1-note" aria-live="polite"></p>`;
    const draw = () => {
      const plain = clean($("#w1-text", box).value);
      const cipher = mode === "swap" ? [...plain].map((c) => QWERTY[toNum(c)]).join("") : new Enigma(STANDARD).encrypt(plain);
      $("#w1-cipher", box).textContent = five(cipher) || "(type something above)";
      const counts = new Array(26).fill(0);
      for (const c of cipher) counts[toNum(c)]++;
      const max = Math.max(1, ...counts);
      $("#w1-bars", box).innerHTML = counts.map((n, i) => `<div class="bar2"><div class="b" style="height:${(n / max) * 100}%" ${n === max && n > 0 ? 'data-top="1"' : ""}></div><span>${L(i)}</span></div>`).join("");
      const top = counts.indexOf(max);
      const note = $("#w1-note", box);
      if (!cipher) { note.textContent = ""; return; }
      if (mode === "swap") {
        const plainCounts = new Array(26).fill(0); for (const c of plain) plainCounts[toNum(c)]++;
        const isE = plainCounts.indexOf(Math.max(...plainCounts)) === 4;
        note.textContent = `The tallest bar is ${L(top)}. In English the most common letter is E, so a codebreaker guesses ${L(top)} stands for E.` + (isE ? " And here that guess is right: the swap code just gave itself away." : " (Your message is short; with more text the tallest bar is almost always E.)");
      } else {
        note.textContent = "With Enigma the bars are nearly level: no letter stands out, so counting letters tells a codebreaker almost nothing.";
      }
    };
    box.addEventListener("input", draw);
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mode]"); if (!b) return;
      mode = b.dataset.mode;
      box.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      draw();
    });
    draw();
  }

  // One rotor drawn as a sorting box: 26 slots in on the left, 26 slots out on the right.
  function widgetRotor(box, withTick) {
    let name = "I", c = 0, off = 0, log = [];
    const Y = (k) => 18 + k * 15.2;
    const out = (k) => ((toNum(ROTORS[name].wiring[(k + off) % 26]) - off) % 26 + 26) % 26;
    box.innerHTML = `
      <div class="w-row"><label>Rotor type <select class="rsel">${Object.keys(ROTORS).map((r) => `<option>${r}</option>`).join("")}</select></label>
        ${withTick ? '<button type="button" class="btn big tick">Tick the box one notch</button><button type="button" class="btn reset">Reset</button>' : ""}</div>
      <div class="w-split"><svg class="rotorpic" viewBox="0 0 360 420" role="img" aria-label="A rotor drawn as a sorting box"></svg><div class="w-side"></div></div>`;
    const svg = $(".rotorpic", box), side = $(".w-side", box);
    const render = () => {
      let lines = "", labels = "";
      for (let k = 0; k < 26; k++) {
        const sel = k === c;
        lines += `<line x1="86" y1="${Y(k)}" x2="274" y2="${Y(out(k))}" stroke="${sel ? "#ffb830" : "#7d6c4c"}" stroke-width="${sel ? 3.2 : 1}" opacity="${sel ? 1 : 0.5}"/>`;
        labels += `<text x="70" y="${Y(k) + 5}" text-anchor="end" class="sl ${sel ? "sel" : ""}" data-c="${k}">${L(k)}</text><text x="290" y="${Y(k) + 5}" class="sr2 ${k === out(c) ? "sel" : ""}">${L(k)}</text>`;
      }
      svg.innerHTML = `<rect x="86" y="6" width="188" height="408" rx="10" fill="#1a120b" stroke="#7d5f26" stroke-width="2"/>` + lines + labels +
        `<text x="70" y="414" text-anchor="end" class="cap">in</text><text x="290" y="414" class="cap">out</text>`;
      side.innerHTML = `<p class="big">${L(c)} → ${L(out(c))}</p><p>${withTick ? `The box has ticked <b>${off}</b> time${off === 1 ? "" : "s"}.` : `Rotor ${name} turns ${L(c)} into ${L(out(c))}, every time.`}</p>` +
        (withTick ? `<ul class="ticklog">${log.slice(-6).map((t) => `<li>${t}</li>`).join("")}</ul>
          <p class="w-note">With the full machine (rotors I, II, III, all dials on A) pressing A five times gives: <b>${new Enigma(STANDARD).encrypt("AAAAA").split("").join(" ")}</b>. Five different letters.</p>` : `<p class="hint">Click a letter on the left to follow it through the box. Try a different rotor: each has its own scramble.</p>`);
    };
    svg.addEventListener("click", (e) => { const t = e.target.closest("[data-c]"); if (t) { c = Number(t.dataset.c); render(); } });
    $(".rsel", box).addEventListener("change", (e) => { name = e.target.value; off = 0; log = []; render(); });
    if (withTick) {
      $(".tick", box).addEventListener("click", () => { off = (off + 1) % 26; log.push(`Press ${log.length + 1}: ${L(c)} comes out as ${L(out(c))}`); render(); });
      $(".reset", box).addEventListener("click", () => { off = 0; log = []; render(); });
    }
    render();
  }

  function widgetOdometer(box) {
    let m, presses, notes;
    const reset = (pos = "AAA") => { m = new Enigma({ positions: pos }); presses = 0; notes = []; };
    reset();
    box.innerHTML = `
      <div class="windows" id="w4-wins"></div>
      <div class="w-row"><button type="button" class="btn big" data-n="1">Press a key</button><button type="button" class="btn" data-n="10">Press 10 keys</button>
        <button type="button" class="btn" data-n="26">Press 26 keys</button><button type="button" class="btn reset">Reset</button><button type="button" class="btn dbl">Show the double step</button></div>
      <p class="w-note" id="w4-info" aria-live="polite"></p><ul class="ticklog" id="w4-log"></ul>`;
    const show = (msg) => {
      $("#w4-wins", box).innerHTML = ["Left", "Middle", "Right"].map((s, i) => `<div class="win-wrap"><div class="win"><span>${m.getPositions()[i]}</span></div>${s}</div>`).join("");
      $("#w4-info", box).textContent = msg || `Key presses so far: ${presses}. Only the right wheel moves every time. Keep pressing and watch the others.`;
      $("#w4-log", box).innerHTML = notes.slice(-6).map((n) => `<li>${n}</li>`).join("");
    };
    const press = (n) => {
      for (let i = 0; i < n; i++) {
        const before = m.getPositions(); m.step(); presses++;
        const after = m.getPositions();
        if (after[1] !== before[1]) notes.push(`Press ${presses}: the right wheel finished a lap and nudged the middle wheel (${before[1]} to ${after[1]}).`);
        if (after[0] !== before[0]) notes.push(`Press ${presses}: the left wheel ticked too (${before[0]} to ${after[0]}).`);
      }
      show();
    };
    box.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.n) press(Number(b.dataset.n));
      if (b.classList.contains("reset")) { reset(); show(); }
      if (b.classList.contains("dbl")) {
        reset("ADU"); const seq = [m.getPositions()];
        for (let i = 0; i < 4; i++) { m.step(); seq.push(m.getPositions()); presses++; }
        notes = ["Start on ADU, then press four keys: " + seq.join(" → ")];
        show("Look at the middle wheel: D, then E, then F. It ticked twice in a row. The real machine does exactly this (the nerd box below explains why).");
      }
    });
    show();
  }

  function widgetMirror(box) {
    const pairs = [];
    for (let i = 0; i < 26; i++) { const j = toNum(REFLECTORS.B[i]); if (i < j) pairs.push(`${L(i)}↔${L(j)}`); }
    box.innerHTML = `
      <label for="w5-text"><b>Type any letters</b></label>
      <input type="text" id="w5-text" value="SECRETMESSAGE" maxlength="40" spellcheck="false" autocomplete="off">
      <div class="w-row"><button type="button" class="btn big" id="w5-back">Send the output back in</button></div>
      <div class="w-out"><div class="lib-label">What comes out (same settings every time)</div><div class="lib-cipher" id="w5-out"></div></div>
      <p class="w-note" id="w5-note" aria-live="polite"></p>
      <details><summary>The mirror's fixed pairs</summary><p class="pairs2">${pairs.join("  ")}</p></details>`;
    const inp = $("#w5-text", box);
    const run = () => {
      const plain = clean(inp.value);
      const cipher = new Enigma(STANDARD).encrypt(plain);
      $("#w5-out", box).textContent = five(cipher) || "(type something)";
      const same = [...plain].filter((c, i) => c === cipher[i]).length;
      $("#w5-note", box).textContent = plain ? `Letters that came out as themselves: ${same}. (It can never happen.)` : "";
    };
    inp.addEventListener("input", run);
    $("#w5-back", box).addEventListener("click", () => {
      const cipher = new Enigma(STANDARD).encrypt(clean(inp.value));
      inp.value = cipher; run();
      const back = new Enigma(STANDARD).encrypt(cipher);
      $("#w5-note", box).textContent = `The scrambled text went back through a fresh machine with the same settings, and came out as: ${back}. Encrypting and decrypting are the same thing.`;
      $("#w5-out", box).textContent = five(back);
    });
    run();
  }

  function widgetPlugboard(box) {
    box.innerHTML = `
      <div class="w-row"><label>Cables <input type="text" id="w6a-cables" value="HW" maxlength="40" spellcheck="false" autocomplete="off"></label>
        <label>Message <input type="text" id="w6a-text" value="HELLOWORLD" maxlength="40" spellcheck="false" autocomplete="off"></label></div>
      <p class="hint">Cables are pairs of letters, like <code>HW</code> or <code>AM FI NV</code>. Same rotors and dials both times.</p>
      <div class="lib-label">Without cables</div><div class="lib-cipher" id="w6a-a"></div>
      <div class="lib-label">With your cables</div><div class="lib-cipher" id="w6a-b"></div>
      <p class="w-note" id="w6a-note" aria-live="polite"></p>`;
    const run = () => {
      const plain = clean($("#w6a-text", box).value), note = $("#w6a-note", box);
      const a = new Enigma(STANDARD).encrypt(plain);
      let b;
      try { b = new Enigma({ ...STANDARD, plugboard: $("#w6a-cables", box).value }).encrypt(plain); }
      catch (e) { note.textContent = "Cables problem: " + e.message; return; }
      $("#w6a-a", box).textContent = five(a);
      $("#w6a-b", box).innerHTML = [...b].map((c, i) => `<span class="${c !== a[i] ? "chg" : ""}">${c}</span>`).join("").replace(/((?:<span[^>]*>.<\/span>){5})/g, "$1 ");
      const diff = [...b].filter((c, i) => c !== a[i]).length;
      note.textContent = `${diff} of ${plain.length} letters changed (shown in amber). Only letters that touch a cabled letter, going in or coming out, are affected. With ten cables almost everything changes.`;
    };
    box.addEventListener("input", run);
    run();
  }

  function widgetKey(box) {
    box.innerHTML = `
      <div class="card2"><b>Today's recipe card</b>
        <ol><li>Wheels: <b>I, II, III</b> (left to right)</li><li>Start letters: <b>A, A, A</b></li><li>Cables: <b id="w6b-c">none</b></li></ol></div>
      <label class="w-row">Cables plugged in: <input type="range" id="w6b-k" min="0" max="10" value="0"> <b id="w6b-kv">0</b></label>
      <p class="big2">Possible cards: <strong id="w6b-total"></strong></p>
      <p class="w-note" id="w6b-time" aria-live="polite"></p>`;
    const names = ["none", "AB", "AB CD", "AB CD EF", "AB CD EF GH", "AB CD EF GH IJ", "…six cables", "…seven cables", "…eight cables", "…nine cables", "…ten cables"];
    const run = () => {
      const k = Number($("#w6b-k", box).value);
      const total = 60n * 17576n * Store.plugCombos(k);
      $("#w6b-kv", box).textContent = k; $("#w6b-c", box).textContent = names[k];
      $("#w6b-total", box).textContent = total < 1000000000n ? total.toLocaleString() : Number(total).toExponential(2).replace("e+", " × 10^");
      const secs = Number(total) / 8e9;     // everyone on Earth (about 8 billion) trying one card per second
      const units = [[31557600, "years"], [86400, "days"], [3600, "hours"], [60, "minutes"], [1, "seconds"]];
      const [u, label] = units.find(([s]) => secs >= s) || [1, "seconds"];
      $("#w6b-time", box).textContent = `If all 8 billion people on Earth each tried one card per second, it would take about ${Math.max(1, Math.round(secs / u)).toLocaleString()} ${label}.` + (k === 10 ? " Huge, but not unbreakable: Tom looks for shortcuts, not brute force." : " Add more cables and watch it grow.");
    };
    box.addEventListener("input", run);
    run();
  }

  // ---------------------------------------------------------------- chapters
  const CHAPTERS = [
    { id: "ch0", label: "Big picture", title: "Chapter 0: The big picture", scene: "ch0",
      analogy: "Think of one letter going on a short trip through the machine and coming out as a different letter.",
      ideas: ["You press a key.", "The signal travels through the plugboard, three wheels, a mirror, back through the wheels and the plugboard.", "A lamp lights. That lamp's letter is the scrambled letter."],
      widget: widgetBigPicture, tryHint: "The whole machine in seven steps.",
      machine: { label: "Watch one letter travel through the real machine (3D)", settings: STANDARD, message: "S" },
      oneline: "A letter goes in, gets scrambled several times over, and a different letter lights up.",
      mattered: "Every chapter that follows explains one piece of this line, in order." },

    { id: "ch1", label: "1 Secret code", title: "Chapter 1: Why a simple secret code fails", scene: "ch1",
      analogy: "It is like a newspaper cryptogram puzzle. You have probably solved one.",
      ideas: ["A substitution cipher swaps each letter for another, always the same one.", "In English some letters are common (E most of all). A codebreaker counts which scrambled letter appears most. That is probably E.", "Once E is known, T, A and the rest fall in turn, and the whole message unravels."],
      extra: "<p><b>The fix Anna needs:</b> a swap list that changes after every letter, so the most common letter in the message never stays the same one. Counting would tell Tom nothing.</p>",
      widget: widgetFrequency, tryHint: "Scramble a message with a fixed swap, see the letter counts give it away, then switch to Enigma.",
      oneline: "A code that never changes can be cracked by counting letters.",
      mattered: "This is exactly the weakness Enigma was built to remove." },

    { id: "ch2", label: "2 Scrambling box", title: "Chapter 2: The scrambling box", scene: "ch2",
      analogy: "Picture a sorting box with 26 slots on the left (A to Z) and 26 slots on the right. Drop a letter in a slot on the left and it always comes out at one fixed, different slot on the right. Nobody can see inside; they only see what goes in and what comes out.",
      ideas: ["A rotor is a scrambling box: each letter that goes in comes out of a fixed slot on the other side, nearly always as a different letter.", "The scramble is fixed. This one box (the army called it Rotor I) turns A into E, every time.", "There are several boxes with different scrambles. Anna picks three of five for the day."],
      widget: (b) => widgetRotor(b, false), tryHint: "Click a letter to follow it through. Try the other rotors.",
      oneline: "A rotor is a box that swaps letters for other letters, in a fixed pattern.",
      mattered: "One box is only the old, crackable swap list from Chapter 1. The magic comes next." },

    { id: "ch3", label: "3 Box that moves", title: "Chapter 3: The box that moves", scene: "ch3",
      analogy: "A combination lock, or the odometer on a car. Every time you do one thing (a key press), the dial ticks forward exactly one notch.",
      ideas: ["Before each letter goes through, the scrambling box ticks forward one notch.", "Now the same box is lined up differently, so the same input letter comes out as a different one.", "So the swap list changes after every letter. Exactly what Anna needed in Chapter 1."],
      extra: `<p><b>What happens when Anna types AAAAA</b> (standard settings, the same as the first Library entry):</p>
        <table class="t2"><tr><th>Press</th><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td></tr><tr><th>Input</th><td>A</td><td>A</td><td>A</td><td>A</td><td>A</td></tr><tr><th>Output</th><td>B</td><td>D</td><td>Z</td><td>G</td><td>O</td></tr></table>
        <p>The same letter in, five different letters out.</p>`,
      widget: (b) => widgetRotor(b, true), tryHint: "Tick the box and watch the same letter come out differently each time.",
      machine: { label: "Type AAAAA in the real machine (3D)", settings: STANDARD, message: "AAAAA" },
      oneline: "The box clicks one notch before every letter, so the scramble keeps changing.",
      mattered: "This single trick defeats the letter-counting method from Chapter 1." },

    { id: "ch4", label: "4 Three boxes", title: "Chapter 4: Three boxes are better than one", scene: "ch4",
      analogy: "A three-digit odometer. The right digit spins fast. Every time it completes a lap, it nudges the middle digit one step. Every time the middle digit completes a lap, it nudges the left one.",
      ideas: ["Three scrambling boxes sit side by side: right, middle, left. Each letter goes through all three, one after another.", "Only the right box ticks on every key press. The middle and left tick much more rarely.", "This makes the pattern repeat only after about 16,900 key presses, far longer than any message, so Tom has no short pattern to find."],
      extra: `<p>There are 26 × 26 × 26 = 17,576 ways to set the three starting dials.</p>
        <details class="nerd"><summary>Nerd box (optional): the double step</summary><p>The boxes pass the nudge along when a small notch on each one lines up. There is a quirk where the middle box can tick twice in a row. This is why the real cycle is 16,900 and not 17,576. The machine here reproduces it exactly: try the double-step button above.</p></details>`,
      widget: widgetOdometer, tryHint: "Press keys and watch the three windows tick like an odometer.",
      machine: { label: "Watch the three dials tick in the real machine (3D)", settings: STANDARD, message: "AAAAAAAAAAAAAAAAAAAAAAAAAA" },
      oneline: "Three boxes ticking at different speeds make the pattern last far beyond any message.",
      mattered: "It turned a crackable swap list into something that, for years, nobody could crack by counting letters." },

    { id: "ch5", label: "5 The mirror", title: "Chapter 5: The mirror", scene: "ch5",
      analogy: "A mirror at the end of a hallway. You walk in, you bounce, you walk back out along a different path.",
      ideas: ["After the three boxes comes the reflector, a fixed plate that pairs letters up (A with Y, B with R, and so on).", "The signal bounces off it and goes back through the three boxes, taking a different route out.", "Because of the mirror, the machine works both ways: if the machine turns A into G, the same setup turns G back into A."],
      extra: `<p><b>Two consequences.</b></p><ul><li><b>Encrypting and decrypting are the same action.</b> Type the scrambled message into a machine with the same settings, and the original comes out. No second machine is needed.</li>
        <li><b>A letter can never become itself.</b> Pairing means A can never light A. It sounds harmless but it was a real weakness: if Tom guessed a word was hidden in the message, he could slide it along the scrambled text and rule out every position where a letter matched itself.</li></ul>`,
      widget: widgetMirror, tryHint: "Scramble a message, then send it back through. The original returns.",
      machine: { label: "Watch the signal bounce off the mirror (3D)", settings: STANDARD, message: "G" },
      oneline: "The mirror makes the same machine both scramble and unscramble.",
      mattered: "It made Enigma easy to use in the field, and its tiny weakness (never itself) gave codebreakers a foothold." },

    { id: "ch6a", label: "6a Plugboard", title: "Chapter 6a: The plugboard", scene: "ch6a",
      analogy: "Two people swap name tags before a party. Anyone who looks up Rachel now meets Kate instead, and the other way around.",
      ideas: ["The plugboard on the front takes pairs of letters and swaps them.", "The swap happens when the letter enters the machine and again when it leaves.", "Up to ten cables could be used each day, which makes the scramble far harder to guess."],
      widget: widgetPlugboard, tryHint: "Add or change cables and see which letters of the output change.",
      machine: { label: "See the cables in the real machine (3D)", settings: { ...STANDARD, plugboard: "HW" }, message: "HELLOWORLD" },
      oneline: "The plugboard swaps some pairs of letters before the scrambling starts.",
      mattered: "It multiplied the number of possibilities enormously, as the next chapter shows." },

    { id: "ch6b", label: "6b Secret key", title: "Chapter 6b: The secret key", scene: "ch6b",
      analogy: "The code for a combination lock. The lock design is public; only the code is secret.",
      ideas: ["Which three rotors to use, and in which order.", "The starting dial for each rotor (A to Z).", "Which pairs of letters to plug together. (A fourth detail, the ring setting, appears in the machine's Full mode.)"],
      extra: `<p><b>How was it broken?</b> Not by trying everything. Tom's side found shortcuts: operators who made mistakes (like repeating a message start), the "never itself" weakness from Chapter 5, and clever machines and mathematics that threw out most possibilities at once. The Code Library shows a few of these ideas in action.</p>`,
      widget: widgetKey, tryHint: "Slide the number of cables and watch the number of possible cards explode.",
      oneline: "The key is a daily card of settings; the number of possible cards is astronomical, but not unbreakable.",
      mattered: "The Germans trusted that number. That trust, and the human habits around it, was their weakness." },
  ];

  const GLOSSARY = [
    ["Cipher", "A way of scrambling a message."], ["Rotor (scrambling box)", "A wheel that turns each letter into another."],
    ["Reflector (mirror)", "The end plate that sends the signal back."], ["Plugboard", "Front panel of cables that swap pairs of letters."],
    ["Key", "The daily settings both sides must share."], ["Encrypt / decrypt", "Scramble / unscramble."],
    ["Ring setting", "A detail of how each wheel's letter ring is offset from its wiring (see the machine's Full mode)."],
  ];

  // ---------------------------------------------------------------- the Learn tab
  let current = 0, sceneCtl = null;

  function openMachine(m) {
    Store.load(m.settings, m.message, false);
    EnigmaUI.showTab("machine");
    EnigmaUI.showView("inside");
    setTimeout(() => { if (window.Inside3D && Inside3D.isReady()) Inside3D.playMessage(); }, 500);
  }

  function show(i) {
    current = Math.max(0, Math.min(CHAPTERS.length - 1, i));
    const ch = CHAPTERS[current], root = document.getElementById("learn-body");
    if (sceneCtl) sceneCtl.pause();
    document.querySelectorAll("#learn-nav .lp").forEach((b, k) => { b.classList.toggle("on", k === current); b.setAttribute("aria-current", k === current ? "step" : "false"); });
    root.innerHTML = `
      <article class="chapter">
        <h3>${ch.title}</h3>
        <div id="ch-scene" aria-label="Scene for this chapter"></div>
        <p class="analogy"><b>Everyday comparison.</b> ${ch.analogy}</p>
        <h4>The idea, in three steps</h4>
        <ol class="ideas">${ch.ideas.map((t) => `<li>${t}</li>`).join("")}</ol>
        ${ch.extra || ""}
        <div class="tryit"><h4>Try it</h4><p class="hint">${ch.tryHint}</p><div id="ch-widget" class="widget"></div>
          ${ch.machine ? `<p><button type="button" class="btn big" id="ch-machine">▶ ${ch.machine.label}</button></p>` : ""}</div>
        <p class="oneline"><b>In one line:</b> ${ch.oneline}</p>
        <p class="mattered"><b>Why it mattered:</b> ${ch.mattered}</p>
        <nav class="chnav"><button type="button" class="btn" id="ch-prev" ${current === 0 ? "disabled" : ""}>◂ Previous chapter</button>
          <button type="button" class="btn big" id="ch-next">${current === CHAPTERS.length - 1 ? "Open the Code Library ▸" : "Next chapter ▸"}</button></nav>
      </article>`;
    sceneCtl = Player.mount(document.getElementById("ch-scene"), SCENES[ch.scene]);
    ch.widget(document.getElementById("ch-widget"));
    if (ch.machine) document.getElementById("ch-machine").addEventListener("click", () => openMachine(ch.machine));
    document.getElementById("ch-prev").addEventListener("click", () => show(current - 1));
    document.getElementById("ch-next").addEventListener("click", () => { if (current === CHAPTERS.length - 1) EnigmaUI.showTab("library"); else show(current + 1); window.scrollTo({ top: 0 }); });
  }

  function init() {
    const nav = document.getElementById("learn-nav");
    nav.innerHTML = CHAPTERS.map((c, i) => `<button type="button" class="lp" data-i="${i}">${c.label}</button>`).join("");
    nav.addEventListener("click", (e) => { const b = e.target.closest(".lp"); if (b) show(Number(b.dataset.i)); });
    document.getElementById("glossary").innerHTML = GLOSSARY.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join("");
    show(0);
  }

  return { init, show, CHAPTERS };
})();
