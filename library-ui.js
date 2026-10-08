// library-ui.js - draws the Code Library tab from LIBRARY (see library-data.js).
// "Decode it in the machine" loads an entry into the shared machine and plays it in the Inside view.

(() => {
  const list = document.getElementById("lib-list");
  const groupFive = (text) => text.replace(/(.{5})/g, "$1 ").trim();
  const clean = (text) => text.toUpperCase().replace(/[^A-Z]/g, "");
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function settingsChips(s) {
    const chips = [
      `Rotors ${s.rotors.join(" · ")}`, `Mirror ${s.reflector}`, `Start ${s.positions}`, `Rings ${s.rings}`,
      s.plugboard ? `Cables ${s.plugboard}` : "No cables",
    ];
    return chips.map((c) => `<span class="chipset">${esc(c)}</span>`).join("");
  }

  function card(e) {
    return `
      <article class="libcard" data-id="${e.id}">
        <header><h3>${esc(e.title)}</h3><span class="kind kind-${e.kind.toLowerCase().replace(/\s+/g, "-")}">${esc(e.kind)}</span></header>
        <p>${esc(e.blurb)}</p>
        <div class="chips" aria-label="Settings">${settingsChips(e.settings)}</div>
        <div class="lib-label">Scrambled text</div>
        <div class="lib-cipher">${groupFive(e.ciphertext)}</div>
        <div class="lib-actions">
          <button class="btn big" data-act="decode">▶ Decode it in the machine</button>
          <button class="btn" data-act="reveal" aria-pressed="false">Show the answer</button>
          <button class="btn" data-act="copy">Copy scrambled text</button>
        </div>
        <div class="lib-answer" hidden><div class="lib-label">Original text</div><div class="lib-plain">${groupFive(e.plaintext)}</div></div>
        <label class="lib-check">Check your answer
          <input type="text" data-act="check" placeholder="Type what you think it says" spellcheck="false" autocomplete="off"></label>
        <div class="lib-result" aria-live="polite"></div>
      </article>`;
  }

  function loadEntry(e) {
    Store.load(e.settings, e.ciphertext, false);   // false: do not animate just the last letter
    EnigmaUI.showTab("machine");
    EnigmaUI.showView("inside");
    // give the 3D canvas a moment to size itself, then play the whole message from the start
    setTimeout(() => { if (window.Inside3D && Inside3D.isReady()) Inside3D.playMessage(); }, 500);
  }

  function check(e, input, out) {
    const guess = clean(input.value), want = e.plaintext;
    if (!guess) { out.textContent = ""; out.className = "lib-result"; return; }
    if (guess === want) { out.textContent = "Perfect match. You decoded it."; out.className = "lib-result good"; return; }
    let right = 0;
    for (let i = 0; i < Math.min(guess.length, want.length); i++) if (guess[i] === want[i]) right++;
    out.textContent = `${right} of ${want.length} letters match so far.`;
    out.className = "lib-result";
  }

  list.innerHTML = LIBRARY.map(card).join("");

  list.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("[data-act]");
    if (!btn || btn.tagName === "INPUT") return;
    const cardEl = btn.closest(".libcard"), e = LIBRARY.find((x) => x.id === cardEl.dataset.id);
    if (btn.dataset.act === "decode") loadEntry(e);
    if (btn.dataset.act === "reveal") {
      const box = cardEl.querySelector(".lib-answer"), show = box.hidden;
      box.hidden = !show;
      btn.setAttribute("aria-pressed", String(show));
      btn.textContent = show ? "Hide the answer" : "Show the answer";
    }
    if (btn.dataset.act === "copy") {
      try { await navigator.clipboard.writeText(e.ciphertext); btn.textContent = "Copied!"; } catch (err) { btn.textContent = "Select the text to copy"; }
      setTimeout(() => (btn.textContent = "Copy scrambled text"), 1500);
    }
  });
  list.addEventListener("input", (ev) => {
    if (ev.target.dataset.act !== "check") return;
    const cardEl = ev.target.closest(".libcard");
    check(LIBRARY.find((x) => x.id === cardEl.dataset.id), ev.target, cardEl.querySelector(".lib-result"));
  });
})();
