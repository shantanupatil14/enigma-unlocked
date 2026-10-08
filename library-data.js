// library-data.js - the Code Library: known messages with their settings, scrambled text and answer.
// Every entry is checked by tests.html: the scrambled text must equal what the machine produces, and
// feeding it back in must return the answer. So the Library can never contain a wrong answer.
// All messages and explanations below were written for this project.

const STANDARD = { rotors: ["I", "II", "III"], reflector: "B", rings: "AAA", positions: "AAA", plugboard: "" };

const LIBRARY = [
  {
    id: "standard-test", kind: "Test vector", title: "The standard test",
    blurb: "Five A's go in, five different letters come out. This is the classic check for any Enigma: with rotors I, II, III, mirror B and every dial on A, the answer must be BDZGO. If you ever build your own Enigma, this is how you know it is right.",
    settings: { ...STANDARD }, plaintext: "AAAAA", ciphertext: "BDZGO",
  },
  {
    id: "never-itself", kind: "Experiment", title: "A letter can never be itself",
    blurb: "Press A twenty-six times. Not one A comes out. An Enigma letter can never turn into itself, a side effect of the mirror. Codebreakers used this: if they guessed a word hidden in a message, they could slide it along and throw out every position where a letter matched itself.",
    settings: { ...STANDARD }, plaintext: "AAAAAAAAAAAAAAAAAAAAAAAAAA", ciphertext: "BDZGOWCXLTKSBTMCDLPBMUQOFX",
  },
  {
    id: "double-step", kind: "Experiment", title: "The odd double step",
    blurb: "The dials start on A D U. Encrypt AAAAA and watch the three windows: ADV, AEW, BFX, BFY. The middle dial moves twice in a row (D to E, then E to F), dragging the left dial with it. That quirk of the real machine is reproduced exactly here.",
    settings: { ...STANDARD, positions: "ADU" }, plaintext: "AAAAA", ciphertext: "EQIBM",
  },
  {
    id: "hello-plain", kind: "Example", title: "Hello, world",
    blurb: "A short message with the standard setup and no cables. Decode it, then look at the next entry.",
    settings: { ...STANDARD }, plaintext: "HELLOWORLD", ciphertext: "ILBDAAMTAZ",
  },
  {
    id: "hello-cable", kind: "Experiment", title: "Hello, world, with one cable",
    blurb: "The same message and dials, but one cable swaps H and W. Compare with the previous entry: only the letters that touch H or W (going in or coming out) change. One cable has a small effect; ten cables change almost everything.",
    settings: { ...STANDARD, plugboard: "HW" }, plaintext: "HELLOWORLD", ciphertext: "KLBDAJMTAZ",
  },
  {
    id: "clock-tower", kind: "Example", title: "Meet me at the clock tower",
    blurb: "A message Anna might send, using rotors II, IV and V, ring settings, start letters and six cables. Enigma had no punctuation, so operators wrote X for a full stop.",
    settings: { rotors: ["II", "IV", "V"], reflector: "B", rings: "CDE", positions: "MQT", plugboard: "BQ CR DI EJ KW MT" },
    plaintext: "MEETMEATTHEOLDCLOCKTOWERATNOONXBRINGTHEMAP", ciphertext: "LGBBNAMUATGCUBYTFAZEEEJTMILQWDLSLFWUEQXBVA",
  },
  {
    id: "weather-crib", kind: "Experiment", title: "Predictable phrases",
    blurb: "Operators often started with the same phrases, such as WETTERBERICHT (weather report) and KEINE BESONDEREN VORKOMMNISSE (nothing special to report). A codebreaker who guessed such a phrase, called a crib, could test it against the scrambled text. Decode this one to see it. X stands for a full stop.",
    settings: { rotors: ["III", "I", "II"], reflector: "B", rings: "BCD", positions: "KEY", plugboard: "AB CD EF" },
    plaintext: "WETTERBERICHTXKEINEBESONDERENVORKOMMNISSE", ciphertext: "MTXMBVUMYOPMDZGVHIRLJDWKROQSYZPCVBEUVUXBT",
  },
  {
    id: "decode-me", kind: "Challenge", title: "Your turn",
    blurb: "Load this one, press Encrypt it and watch the machine hand you the answer, then type what you found into the box to check it. Remember: the machine can unscramble it only because it has exactly the same settings.",
    settings: { rotors: ["V", "III", "I"], reflector: "B", rings: "AAA", positions: "ENI", plugboard: "GM LS TX" },
    plaintext: "WELLDONEYOUJUSTDECODEDANENIGMAMESSAGE", ciphertext: "BVDZURWVSKBLAXDMHKCXQXFDKLTJPKSDIMFIX",
  },
];

if (typeof module !== "undefined") module.exports = { LIBRARY };
