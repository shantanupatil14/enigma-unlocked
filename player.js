// player.js - the scene player: plays a scripted scene (characters, speech, small effects) like a short sketch video.
// The visitor can click Next/Back, press the arrow keys, or press Play to let it run by itself.
// A scene is plain data (see scenes.js): a list of "beats". Each beat can change the room, who is on stage,
// their pose, which little effects are showing, and what is said.

const Player = (() => {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SCALE = 1.15, TOP = 46;                    // how big the characters are and how high they stand on the 800 x 450 stage
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  // Work out the full state of the stage at beat i by folding every beat up to it (each beat only lists what changes).
  function stateAt(scene, i) {
    const st = { room: scene.room, cast: {}, fx: new Set() };
    for (let k = 0; k <= i; k++) {
      const b = scene.beats[k];
      if (b.room) st.room = b.room;
      for (const [name, c] of Object.entries(b.cast || {})) st.cast[name] = { ...(st.cast[name] || { show: false, x: 200, look: "r", mood: "" }), ...c };
      if (b.fx) st.fx = new Set(b.fx);
    }
    return st;
  }

  function mount(container, scene, opts = {}) {
    let index = 0, timer = null, playing = false, room = null;
    container.classList.add("pl");
    if (reduced) container.classList.add("reduce");
    container.tabIndex = 0;
    container.innerHTML = `
      <div class="pl-stage">
        <svg viewBox="0 0 800 450" role="img" aria-label="${esc(scene.title)}: a hand-drawn scene">
          ${Art.defs}
          <rect width="800" height="450" fill="url(#paper)"/>
          <g class="room-back"></g>
          <g class="chars">
            <g class="char" data-name="anna"><g class="char-wrap">${Art.anna()}</g></g>
            <g class="char" data-name="tom"><g class="char-wrap">${Art.tom()}</g></g>
          </g>
          <g class="room-front"></g>
          <g class="fxlayer">${Art.effects}</g>
          <rect width="800" height="450" fill="url(#vig)" pointer-events="none"/>
        </svg>
        <div class="pl-bubble" hidden></div>
        <div class="pl-caption" hidden></div>
      </div>
      <div class="pl-controls">
        <button class="btn" data-pl="back">◂ Back</button>
        <button class="btn big" data-pl="play">▶ Play</button>
        <button class="btn" data-pl="next">Next ▸</button>
        <span class="pl-dots" role="tablist" aria-label="Scene progress"></span>
        <span class="pl-count"></span>
      </div>
      <div class="pl-cta" hidden><button class="btn big" data-pl="cta"></button></div>
      <div class="sr" aria-live="polite"></div>`;
    const svg = container.querySelector("svg"), bubble = container.querySelector(".pl-bubble"), caption = container.querySelector(".pl-caption");
    const dots = container.querySelector(".pl-dots"), count = container.querySelector(".pl-count"), live = container.querySelector(".sr");
    const cta = container.querySelector(".pl-cta"), playBtn = container.querySelector('[data-pl="play"]');
    dots.innerHTML = scene.beats.map((_, i) => `<button type="button" class="dot" data-dot="${i}" aria-label="Go to part ${i + 1}"></button>`).join("");

    function setRoom(name) {
      if (name === room) return;
      const swap = () => {
        const r = Art.rooms[name]();
        svg.querySelector(".room-back").innerHTML = r.back;
        svg.querySelector(".room-front").innerHTML = r.front;
        room = name;
        svg.classList.remove("fading");
      };
      if (room === null || reduced) { swap(); return; }
      svg.classList.add("fading");
      setTimeout(swap, 220);
    }

    function render() {
      const beat = scene.beats[index], st = stateAt(scene, index);
      setRoom(st.room);
      // characters
      for (const el of svg.querySelectorAll(".char")) {
        const name = el.dataset.name, c = st.cast[name] || { show: false, x: 200, look: "r", mood: "" };
        el.style.transform = `translate(${c.x}px, ${TOP}px) scale(${SCALE})`;
        el.classList.toggle("hidden", !c.show);
        el.setAttribute("class", `char look-${c.look} mood-${c.mood || "neutral"} ${c.show ? "" : "hidden"}`);
      }
      // effects
      svg.setAttribute("class", [...st.fx].map((f) => "on-" + f).join(" ") + (svg.classList.contains("fading") ? " fading" : ""));
      // what is said
      bubble.hidden = beat.who === "narrator";
      caption.hidden = beat.who !== "narrator";
      if (beat.who === "narrator") caption.textContent = beat.text;
      else {
        const c = st.cast[beat.who], cx = Math.min(74, Math.max(26, ((c.x + 100 * SCALE) / 800) * 100));
        bubble.textContent = beat.text;
        bubble.style.left = cx + "%";
        bubble.dataset.who = beat.who;
      }
      live.textContent = (beat.who === "narrator" ? "" : beat.who[0].toUpperCase() + beat.who.slice(1) + ": ") + beat.text;
      dots.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("on", i <= index));
      count.textContent = `${index + 1} / ${scene.beats.length}`;
      container.querySelector('[data-pl="back"]').disabled = index === 0;
      const last = index === scene.beats.length - 1;
      container.querySelector('[data-pl="next"]').disabled = last;
      cta.hidden = !(last && scene.cta);
      if (last && scene.cta) cta.querySelector("button").textContent = scene.cta.label;
      playBtn.textContent = playing ? "⏸ Pause" : last ? "↺ Replay" : "▶ Play";
    }

    const delay = (b) => Math.max(2800, 1500 + b.text.length * 55);
    function schedule() {
      clearTimeout(timer);
      if (!playing) return;
      if (index >= scene.beats.length - 1) { playing = false; render(); return; }
      timer = setTimeout(() => { index++; render(); schedule(); }, delay(scene.beats[index]));
    }
    const go = (i) => { index = Math.max(0, Math.min(scene.beats.length - 1, i)); render(); schedule(); };

    container.addEventListener("click", (e) => {
      const a = e.target.closest("[data-pl],[data-dot]");
      if (!a) return;
      if (a.dataset.dot !== undefined) { go(Number(a.dataset.dot)); return; }
      const act = a.dataset.pl;
      if (act === "next") go(index + 1);
      if (act === "back") go(index - 1);
      if (act === "cta" && scene.cta) scene.cta.run();
      if (act === "play") {
        if (!playing && index >= scene.beats.length - 1) index = 0;
        playing = !playing; render(); schedule();
      }
    });
    container.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(index + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
    });

    render();
    return { go, pause() { playing = false; clearTimeout(timer); render(); }, get index() { return index; }, get playing() { return playing; } };
  }

  return { mount, stateAt };
})();
