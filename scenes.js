// scenes.js - the scripts for the sketch scenes. Anna and Tom are invented characters.
// Each beat lists only what CHANGES: who speaks (narrator, anna or tom), the text, and optionally the room,
// who is on stage (cast: x position, where they look, mood) and which small effects are showing (fx).
// Moods (faces): neutral, happy, surprised, worried, thinking, curious, proud.
// Effects: signal, lamp, bars, swap.
// Anna is the radio operator and explains the machine. Tom is the codebreaker listening in.

const ANNA = (extra = {}) => ({ show: true, x: 250, look: "r", mood: "neutral", ...extra });
const TOM = (extra = {}) => ({ show: true, x: 150, look: "r", mood: "neutral", ...extra });

const SCENES = {
  // ---------------------------------------------------------------- the Story (landing)
  story: {
    title: "A message that must stay secret",
    room: "radio-room",
    cta: { label: "Start learning ▸", run: () => EnigmaUI.showTab("learn") },
    beats: [
      { who: "narrator", text: "1940. A foggy city at night. Radio waves carry secrets across the dark, and some of them are not meant for everyone.", room: "street",
        cast: { anna: ANNA({ x: 90, mood: "curious" }), tom: TOM({ x: 480, look: "l", mood: "curious" }) } },
      { who: "narrator", text: "A quiet radio room. Anna has a message that must reach its destination, and nobody else may read it.", room: "radio-room",
        cast: { anna: ANNA({ mood: "neutral" }), tom: { show: false } } },
      { who: "anna", text: "Radio is wonderful. It reaches anyone, anywhere, in an instant.", cast: { anna: { mood: "happy" } } },
      { who: "anna", text: "But that means anyone with a radio can listen in. Friends... and enemies.", cast: { anna: { mood: "worried" } }, fx: ["signal"] },
      { who: "narrator", text: "So the message has to be scrambled, so that only the person with the right machine can unscramble it.",
        cast: { anna: { mood: "proud" } }, fx: ["lamp"] },
      { who: "anna", text: "This is my machine. I type a letter, and a different letter lights up. Letter by letter, my message turns into nonsense.", cast: { anna: { mood: "happy" } }, fx: ["lamp"] },
      { who: "narrator", text: "Far away, someone is listening.", room: "listening-station",
        cast: { anna: { show: false }, tom: TOM({ mood: "curious" }) }, fx: ["signal"] },
      { who: "tom", text: "Hm. A stream of letters. Q... W... R... T... It means nothing at all.", cast: { tom: { mood: "surprised" } } },
      { who: "tom", text: "But somebody went to a lot of trouble to send it. I will find out how.", cast: { tom: { mood: "thinking" } }, fx: [] },
      { who: "narrator", text: "Tom has a plan. But first, how does Anna's machine scramble letters? That is what we are about to learn.", cast: { tom: { mood: "proud" } } },
    ],
  },

  // ---------------------------------------------------------------- Chapter 0
  ch0: {
    title: "The big picture",
    room: "radio-room",
    beats: [
      { who: "narrator", text: "Anna sits in front of a wooden box with a keyboard, a panel of little lamps, and a tangle of cables on the front. She types one letter.",
        cast: { anna: ANNA({ pose: "typing" }) } },
      { who: "anna", text: "I press the letter S... and a lamp lights up. A different letter!", cast: { anna: { mood: "surprised" } }, fx: ["lamp"] },
      { who: "anna", text: "Here is the whole journey of one letter, before we look at any piece in detail.", cast: { anna: { mood: "happy" } }, fx: [] },
      { who: "narrator", text: "Key pressed, plugboard, three wheels, a mirror, back through the wheels, plugboard again, lamp." },
      { who: "narrator", text: "That is all of Enigma. Each chapter explains one piece, in the order Anna needs it." },
    ],
  },

  // ---------------------------------------------------------------- Chapter 1
  ch1: {
    title: "Why a simple secret code fails",
    room: "listening-station",
    beats: [
      { who: "narrator", text: "Anna and her friend agree on a simple secret alphabet: A becomes Q, B becomes W, C becomes E, and so on.",
        cast: { tom: TOM({ mood: "curious" }) }, fx: ["swap"] },
      { who: "tom", text: "A swap code like that is easy to crack. Look at this chart of the intercepted letters...", cast: { tom: { mood: "proud" } }, fx: ["bars"] },
      { who: "tom", text: "This letter, T, appears far more often than any other. In English, the most common letter is E.", cast: { tom: { mood: "curious" } } },
      { who: "tom", text: "So in this code, T must stand for E. One letter found!", cast: { tom: { mood: "surprised" } } },
      { who: "tom", text: "Then T, then A... the whole message falls open in an afternoon.", cast: { tom: { mood: "happy" } } },
      { who: "narrator", text: "Anna needs a code that changes after every single letter. That is exactly what Enigma does." },
    ],
  },

  // ---------------------------------------------------------------- Chapter 2
  ch2: {
    title: "The scrambling box",
    room: "radio-room",
    beats: [
      { who: "narrator", text: "Anna opens the lid of the machine. Inside sits a thick disc, about the size of an ice-hockey puck.",
        cast: { anna: ANNA({ mood: "curious" }) } },
      { who: "anna", text: "This is the heart of it. It is called a rotor.", cast: { anna: { mood: "proud" } } },
      { who: "anna", text: "Think of a sorting box: 26 slots on the left, 26 on the right. Drop a letter in on the left, and it always comes out of one fixed, different slot on the right.", cast: { anna: { mood: "happy" } } },
      { who: "anna", text: "This rotor turns A into E, every time. Nobody sees inside the box. They only see what goes in and what comes out.", cast: { anna: { mood: "neutral" } } },
      { who: "narrator", text: "There are five different boxes, each with its own scramble. Each day Anna picks three of the five." },
    ],
  },

  // ---------------------------------------------------------------- Chapter 3
  ch3: {
    title: "The box that moves",
    room: "radio-room",
    beats: [
      { who: "narrator", text: "Anna presses A. A lamp lights: B.", cast: { anna: ANNA({ pose: "typing" }) }, fx: ["lamp"] },
      { who: "anna", text: "I press A again... and now it is D! It never gives the same letter twice.", cast: { anna: { mood: "surprised" } } },
      { who: "anna", text: "Before every letter, the scrambling box ticks forward one notch, like a combination lock or a car's odometer.", cast: { anna: { mood: "happy" } }, fx: [] },
      { who: "narrator", text: "So the swap list changes after every letter. Exactly what Anna needed in Chapter 1." },
    ],
  },

  // ---------------------------------------------------------------- Chapter 4
  ch4: {
    title: "Three boxes are better than one",
    room: "listening-station",
    beats: [
      { who: "tom", text: "One moving box is still not good enough. It repeats after 26 letters. Give me 26 in a row and I can find the pattern.",
        cast: { tom: TOM({ mood: "proud" }) } },
      { who: "narrator", text: "Anna's machine has three.", room: "radio-room", cast: { tom: { show: false }, anna: ANNA({ mood: "happy" }) } },
      { who: "anna", text: "Think of a three-digit odometer. The right digit spins fast. Each time it finishes a lap, it nudges the middle one. Each time the middle finishes a lap, it nudges the left.", cast: { anna: { mood: "curious" } } },
      { who: "anna", text: "That makes the pattern last about sixteen thousand nine hundred key presses, far longer than any message.", cast: { anna: { mood: "proud" } } },
    ],
  },

  // ---------------------------------------------------------------- Chapter 5
  ch5: {
    title: "The mirror",
    room: "radio-room",
    beats: [
      { who: "narrator", text: "A new problem. Anna's friend at the other end must read her message.", cast: { anna: ANNA({ mood: "thinking" }) } },
      { who: "anna", text: "How does he undo it? Build a second machine that works backwards?", cast: { anna: { mood: "worried" } } },
      { who: "anna", text: "No! He uses the very same machine, set the very same way.", cast: { anna: { mood: "happy" } } },
      { who: "anna", text: "At the end of the wheels sits a mirror. The signal bounces off it and comes back by a different path.", cast: { anna: { mood: "proud" } } },
      { who: "narrator", text: "Far away, Tom notices something.", room: "listening-station", cast: { anna: { show: false }, tom: TOM({ mood: "curious" }) } },
      { who: "tom", text: "Interesting. No letter ever turns into itself. That is a clue I can use.", cast: { tom: { mood: "surprised" } } },
    ],
  },

  // ---------------------------------------------------------------- Chapter 6a
  ch6a: {
    title: "The plugboard",
    room: "radio-room",
    beats: [
      { who: "narrator", text: "Anna plugs a cable between two sockets on the front panel.", cast: { anna: ANNA({ mood: "curious" }) } },
      { who: "anna", text: "Now R and K swap places, before and after everything else.", cast: { anna: { mood: "proud" } } },
      { who: "anna", text: "It is like two guests swapping name tags at a party. Anyone who looks for Rachel meets Kate instead.", cast: { anna: { mood: "happy" } } },
      { who: "narrator", text: "Up to ten cables a day. One more scramble, chosen by the operator." },
    ],
  },

  // ---------------------------------------------------------------- Chapter 6b
  ch6b: {
    title: "The secret key",
    room: "radio-room",
    beats: [
      { who: "narrator", text: "Every morning Anna gets a card from headquarters. It says exactly how to set the machine.", cast: { anna: ANNA({ mood: "neutral" }) } },
      { who: "anna", text: "Which three wheels, in which order. Where each wheel starts. Which letters to plug together. That card is the whole secret.", cast: { anna: { mood: "proud" } } },
      { who: "narrator", text: "In the listening station, Tom does the sums.", room: "listening-station", cast: { anna: { show: false }, tom: TOM({ mood: "thinking" }) } },
      { who: "tom", text: "About 159 million million million possible cards. If every person on Earth tried one a second, it would take over 600 years.", cast: { tom: { mood: "surprised" } } },
      { who: "tom", text: "I cannot try them all. So I will look for shortcuts: human mistakes, and the fact that no letter is ever itself.", cast: { tom: { mood: "curious" } } },
    ],
  },
};