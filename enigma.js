// enigma.js - the Enigma I cipher core. No screen code in here, only the machine's logic.
// Letters are handled as numbers 0-25 (A=0 ... Z=25). "Wrap around" (after Z comes A) is mod26.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Historical wiring tables (public facts). Each string says where letters A..Z come out.
// "notch" = the window letter at which this rotor nudges the next rotor to its left.
const ROTORS = {
  I:   { wiring: "EKMFLGDQVZNTOWYHXUSPAIBRCJ", notch: "Q" },
  II:  { wiring: "AJDKSIRUXBLHWTMCQGZNPYFVOE", notch: "E" },
  III: { wiring: "BDFHJLCPRTXVZNYEIWGAKMUSQO", notch: "V" },
  IV:  { wiring: "ESOVPZJAYQUIRHXLNFTGKDCMWB", notch: "J" },
  V:   { wiring: "VZBRGITYUPSDNHLXAWMJQOFECK", notch: "Z" },
};

// The "mirror" plates. B is the one used on the standard machine; A is the older one (1930 manual).
const REFLECTORS = {
  A: "EJMZALYXVBWFCRQUONTSPIKHGD",
  B: "YRUHQSLDPXNGOKMIEBFZCWVJAT",
  C: "FVPJIAOYEDRZXWGCTKUQSBNMHL",
};

// Wrap-around counting: mod26(26) = 0, mod26(-1) = 25.
function mod26(n) {
  return ((n % 26) + 26) % 26;
}

// Letter <-> number helpers.
function toNum(letter) {
  return ALPHABET.indexOf(letter);
}
function toLetter(num) {
  return ALPHABET[mod26(num)];
}

// Turn a wiring string into the reverse lookup (used on the signal's way back).
function invert(wiring) {
  const back = new Array(26);
  for (let i = 0; i < 26; i++) back[toNum(wiring[i])] = ALPHABET[i];
  return back.join("");
}

class Enigma {
  // settings = {
  //   rotors:    ["I","II","III"]  left, middle, right
  //   reflector: "B"
  //   rings:     "AAA"             ring setting for left, middle, right
  //   positions: "AAA"             start letters showing in the three windows
  //   plugboard: "AM FI NV"        pairs of letters to swap (optional)
  // }
  constructor(settings = {}) {
    this.rotorNames = settings.rotors || ["I", "II", "III"];
    this.reflectorName = settings.reflector || "B";
    this.rings = (settings.rings || "AAA").toUpperCase();
    this.startPositions = (settings.positions || "AAA").toUpperCase();
    this.plugboardText = settings.plugboard || "";
    this.reset();
  }

  // Put the machine back at its starting positions.
  reset() {
    this.positions = [...this.startPositions].map(toNum); // [left, middle, right]
    this.plugs = this._buildPlugboard(this.plugboardText);
  }

  // "AM FI" -> a lookup where A<->M and F<->I swap, all other letters map to themselves.
  _buildPlugboard(text) {
    const map = [...Array(26).keys()]; // start: every letter maps to itself
    const pairs = text.toUpperCase().split(/[\s,]+/).filter(Boolean);
    const used = new Set();
    for (const pair of pairs) {
      if (pair.length !== 2 || pair[0] === pair[1]) throw new Error(`Bad plug pair: ${pair}`);
      const a = toNum(pair[0]);
      const b = toNum(pair[1]);
      if (a < 0 || b < 0) throw new Error(`Bad plug pair: ${pair}`);
      if (used.has(a) || used.has(b)) throw new Error(`Letter used twice in plugboard: ${pair}`);
      used.add(a);
      used.add(b);
      map[a] = b;
      map[b] = a;
    }
    return map;
  }

  // Tick the rotors forward. Happens BEFORE the letter goes through.
  step() {
    const [left, middle, right] = this.positions;
    const middleNotch = toNum(ROTORS[this.rotorNames[1]].notch);
    const rightNotch = toNum(ROTORS[this.rotorNames[2]].notch);

    if (middle === middleNotch) {
      // Middle rotor at its notch: it AND the left rotor tick (this is the "double step").
      this.positions[0] = mod26(left + 1);
      this.positions[1] = mod26(middle + 1);
    } else if (right === rightNotch) {
      this.positions[1] = mod26(middle + 1);
    }
    this.positions[2] = mod26(right + 1); // the right rotor ticks every time
  }

  // Send one number through one rotor. i = 0 left, 1 middle, 2 right.
  // forward = true on the way in (towards the mirror), false on the way back.
  _rotorPass(c, i, forward) {
    const rotor = ROTORS[this.rotorNames[i]];
    const offset = this.positions[i] - toNum(this.rings[i]); // window letter minus ring setting
    const table = forward ? rotor.wiring : invert(rotor.wiring);
    return mod26(toNum(table[mod26(c + offset)]) - offset);
  }

  // Encrypt one letter. Returns the output letter and the path it took (for the UI to animate).
  encryptLetter(letter) {
    letter = letter.toUpperCase();
    let c = toNum(letter);
    if (c < 0) throw new Error(`Not a letter: ${letter}`);

    this.step();
    const path = [{ stage: "Key pressed", letter }];
    const note = (stage) => path.push({ stage, letter: toLetter(c) });

    c = this.plugs[c];
    note("Plugboard");
    for (const i of [2, 1, 0]) { // right, middle, left
      c = this._rotorPass(c, i, true);
      note(`${["Left", "Middle", "Right"][i]} rotor`);
    }
    c = toNum(REFLECTORS[this.reflectorName][c]);
    note("Mirror (reflector)");
    for (const i of [0, 1, 2]) { // left, middle, right
      c = this._rotorPass(c, i, false);
      note(`${["Left", "Middle", "Right"][i]} rotor (back)`);
    }
    c = this.plugs[c];
    note("Plugboard (back)");

    return { output: toLetter(c), path, positions: this.getPositions() };
  }

  // Encrypt a whole message. Anything that is not A-Z (spaces, digits, punctuation) is skipped.
  encrypt(text) {
    let out = "";
    for (const ch of text.toUpperCase()) {
      if (ALPHABET.includes(ch)) out += this.encryptLetter(ch).output;
    }
    return out;
  }

  // The three window letters, e.g. "ADU".
  getPositions() {
    return this.positions.map(toLetter).join("");
  }
}

// Make it usable both in a web page and in a test runner.
if (typeof module !== "undefined") module.exports = { Enigma, ROTORS, REFLECTORS, ALPHABET, mod26 };
