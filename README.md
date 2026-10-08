# Enigma Unlocked

An interactive website that teaches how the Enigma cipher machine works, then lets you play with a working one.
Open it, watch a short sketched story, learn the machine one idea at a time, type your own name and watch it travel
through a 3D machine letter by letter, and decode real messages from the Code Library.

Suggested GitHub repository name: `enigma-unlocked`.

**Live site:** https://shantanupatil14.github.io/enigma-unlocked/

## What is in it

| Part | What it does |
|---|---|
| **Story** | A short sketched tale with two invented characters, Anna (radio operator) and Tom (codebreaker). |
| **Learn** | Seven short chapters. Each opens with a scene, explains one idea in plain English, and has something to try (letter-count chart, rotor picture, odometer, mirror, plugboard, key counter). |
| **Machine** | **Inside view**: the whole machine in 3D (reflector, three rotors, plugboard, lamps). Type a message and each letter plays through ~20 stages with a plain-English caption, pause, step-by-step and speed controls. **Simple view**: the classic keyboard, lamps, rotor windows and plugboard. Both views share one machine. |
| **Code Library** | Eight messages with exact settings; decode them in the machine or check your own answer. Every answer is tested against the machine. |

## Run it

No install, no server, no internet needed. Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari).
To publish it, upload the folder to a GitHub repository and turn on GitHub Pages (Settings, Pages, deploy from branch).

## Check it

Open `tests.html`. Every line should say PASS. The tests cover the cipher (the standard `AAAAA` to `BDZGO` vector, round trips,
the rotor double step, "a letter never becomes itself"), the historical tables (each rotor is a valid permutation, each mirror a valid pairing)
and every Code Library entry.

## How it is built

Plain HTML, CSS and JavaScript. No build step and no tracking. The only third-party code is **three.js r159** (MIT), saved in `vendor/`
so the site works offline. The 3D model, textures, drawings, characters and text were all created for this project.

| File | Role |
|---|---|
| `enigma.js` | The cipher itself (rotors, reflectors, plugboard, rings, stepping). |
| `store.js` | The one shared machine (settings and message) that every view reads. |
| `ui.js` | The Simple view and the page tabs. |
| `inside3d.js` | The 3D Inside view and the letter-by-letter player. |
| `characters.js`, `player.js`, `scenes.js` | The sketch characters, the scene player and the scene scripts. |
| `lessons.js` | The Learn chapters and their widgets. |
| `library-data.js`, `library-ui.js` | The Code Library. |
| `tests.js`, `tests.html` | The checks. |

## Sharing it on WhatsApp
A phone cannot open this folder, so share a link or a video:
1. **Link (best):** the site is published with GitHub Pages at **https://shantanupatil14.github.io/enigma-unlocked/**. Paste it into WhatsApp; it opens in the phone browser.
2. The link-preview tags in `index.html` (`og:url`, `og:image`) already point at that address, so WhatsApp and LinkedIn show the picture (`og-image.png`) and title. If you publish under a different address, change those two lines.
3. **Quick demo without GitHub:** drag the folder onto netlify.com/drop for a temporary link.
4. **Video:** send the WhatsApp-size reel from `tools/reel/out/` (about 8 MB; WhatsApp's limit is 16 MB).

## The reel
`tools/reel/` builds the narrated vertical video (1080x1920) from this site's own code: a story cut (about 87 s) and a short cut (about 72 s), each as a high-quality file and a WhatsApp-size file. See `tools/reel/README.md` to rebuild it and `tools/reel/FACTS.md` for the source of every fact in the narration.
## Honest limits

- It is a teaching toy, not a security tool. Enigma was broken in the Second World War.
- It simulates the three-rotor Army machine (Enigma I) only: rotors I to V, mirrors A, B and C, ring settings, up to ten cables.
- Only rotors I, II, III with mirror B is checked against a published historical result. The other tables are checked for validity but not against a historical message.
- The 3D view needs WebGL. Without it, the site switches to the Simple view.

## Legal and credits

- Code, text, drawings and 3D art: MIT licence (see `LICENSE`; put your name on the copyright line before publishing).
- three.js: MIT licence, `vendor/LICENSE-three.txt`.
- Anna and Tom are invented. The project is not affiliated with or endorsed by any museum, film, company or organisation.

## Sharing it (screenshot ideas)

- The Inside view in the middle of a letter, with the amber and blue signal paths visible.
- The Story scene of Tom listening at the receiver.
- A decoded Code Library message with the tape showing the answer.