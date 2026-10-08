// tests.js - checks that the cipher core behaves exactly like the historical machine.
// Each test is a name plus a function that returns true (pass) or false (fail).

const TESTS = [
  {
    name: "Standard vector: rotors I-II-III, mirror B, all A -> AAAAA gives BDZGO",
    run: () => new Enigma().encrypt("AAAAA") === "BDZGO",
  },
  {
    name: "Decrypting BDZGO with the same settings gives AAAAA back",
    run: () => new Enigma().encrypt("BDZGO") === "AAAAA",
  },
  {
    name: "Rotor stepping with double step: ADU -> ADV -> AEW -> BFX -> BFY",
    run: () => {
      const m = new Enigma({ positions: "ADU" });
      const seen = [];
      for (let i = 0; i < 4; i++) {
        m.encryptLetter("A");
        seen.push(m.getPositions());
      }
      return seen.join(",") === "ADV,AEW,BFX,BFY";
    },
  },
  {
    name: "Round trip with plugboard, other rotors and ring settings (200 random letters)",
    run: () => {
      const settings = {
        rotors: ["V", "II", "IV"], reflector: "B", rings: "MCK",
        positions: "QXD", plugboard: "AM FI NV PS TU WZ",
      };
      const plain = Array.from({ length: 200 }, (_, i) => "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[(i * 7 + (i % 5)) % 26]).join("");
      const cipher = new Enigma(settings).encrypt(plain);
      return new Enigma(settings).encrypt(cipher) === plain && cipher !== plain;
    },
  },
  {
    name: "A letter never becomes itself (2000 letters, with plugboard)",
    run: () => {
      const m = new Enigma({ rotors: ["III", "I", "V"], positions: "KEY", plugboard: "AB CD EF" });
      for (let i = 0; i < 2000; i++) {
        const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i % 26];
        if (m.encryptLetter(letter).output === letter) return false;
      }
      return true;
    },
  },
  {
    name: "Plugboard rejects a letter used twice",
    run: () => {
      try { new Enigma({ plugboard: "AB BC" }); return false; } catch (e) { return true; }
    },
  },
  {
    name: "Reset returns the machine to its starting positions",
    run: () => {
      const m = new Enigma({ positions: "CAT" });
      m.encrypt("HELLO");
      m.reset();
      return m.getPositions() === "CAT";
    },
  },
];

// --- The historical tables must have no typos: rotors are permutations, mirrors are proper pairings ---
TESTS.push({
  name: "Every rotor wiring uses each letter A-Z exactly once (no typos in the tables)",
  run: () => Object.values(ROTORS).every((r) => r.wiring.length === 26 && new Set(r.wiring).size === 26 && [...r.wiring].every((c) => ALPHABET.includes(c))),
});
TESTS.push({
  name: "Every rotor has a valid notch letter",
  run: () => Object.values(ROTORS).every((r) => ALPHABET.includes(r.notch)),
});
TESTS.push({
  name: "Every reflector is a proper pairing: A<->B means B<->A, and no letter maps to itself",
  run: () => Object.values(REFLECTORS).every((t) => t.length === 26 && new Set(t).size === 26 &&
    [...t].every((c, i) => c !== ALPHABET[i] && t[ALPHABET.indexOf(c)] === ALPHABET[i])),
});

// --- Every Code Library entry must be exactly right ---
if (typeof LIBRARY !== "undefined") {
  for (const e of LIBRARY) {
    TESTS.push({
      name: `Library "${e.title}": machine output equals the stored scrambled text`,
      run: () => new Enigma(e.settings).encrypt(e.plaintext) === e.ciphertext,
    });
    TESTS.push({
      name: `Library "${e.title}": scrambled text decodes back to the answer`,
      run: () => new Enigma(e.settings).encrypt(e.ciphertext) === e.plaintext && /^[A-Z]+$/.test(e.plaintext),
    });
  }
}

// Run every test; return a list of results.
function runAllTests() {
  return TESTS.map((t) => {
    let pass = false;
    try { pass = t.run(); } catch (e) { pass = false; }
    return { name: t.name, pass };
  });
}

if (typeof module !== "undefined") module.exports = { runAllTests };
