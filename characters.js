// characters.js - the sketch art: two invented characters and the rooms they appear in.
// Everything is inline SVG drawn for this project (no image files). Anna and Tom are fictional and are not modelled
// on any real person or film character. Clothes are plain period clothes, with no uniforms or insignia.
//
// The figures are STILL: clean even outlines, flat colour, and the face does the acting. The scene player changes a
// character's expression just by switching a CSS class (mood-happy, mood-surprised, ...), which decides which eyes,
// brows and mouth are visible. Anna holds a notebook and pencil; Tom holds a magnifying glass.

const Art = (() => {
  const INK = "#2a1d12";
  const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

  // Shared gradients: warm paper, the glow of the lamps, and a soft dark vignette that gives the scenes a sepia mood.
  const defs = `
    <defs>
      <radialGradient id="paper" cx="50%" cy="45%" r="75%">
        <stop offset="0" stop-color="#ead9b6"/><stop offset="1" stop-color="#c9b48a"/>
      </radialGradient>
      <radialGradient id="lampglow" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#ffe29a" stop-opacity=".95"/><stop offset="1" stop-color="#ffe29a" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="vig" cx="50%" cy="50%" r="72%">
        <stop offset=".55" stop-color="#2a1a0a" stop-opacity="0"/><stop offset="1" stop-color="#2a1a0a" stop-opacity=".42"/>
      </radialGradient>
      <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#dfe3dc" stop-opacity="0"/><stop offset=".6" stop-color="#dfe3dc" stop-opacity=".38"/><stop offset="1" stop-color="#dfe3dc" stop-opacity=".1"/>
      </linearGradient>
    </defs>`;

  // ----- shared face (drawn at the head position of a 200 x 290 character box) -----
  // Every eye, brow and mouth shape is here; the CSS "mood-..." classes decide which ones show.
  const face = (eyeFill = INK) => `
    <g class="face">
      <g class="v e-open"><ellipse cx="82" cy="110" rx="8.5" ry="8" fill="#fffaf0" ${S} stroke-width="2.2"/><ellipse cx="118" cy="110" rx="8.5" ry="8" fill="#fffaf0" ${S} stroke-width="2.2"/>
        <circle class="pupil" cx="83" cy="111" r="4" fill="${eyeFill}"/><circle class="pupil" cx="119" cy="111" r="4" fill="${eyeFill}"/></g>
      <g class="v e-wide"><ellipse cx="82" cy="109" rx="11" ry="11" fill="#fffaf0" ${S} stroke-width="2.2"/><ellipse cx="118" cy="109" rx="11" ry="11" fill="#fffaf0" ${S} stroke-width="2.2"/>
        <circle class="pupil" cx="83" cy="110" r="3" fill="${eyeFill}"/><circle class="pupil" cx="119" cy="110" r="3" fill="${eyeFill}"/></g>
      <g class="v e-happy"><path d="M72 113 Q82 101 92 113 M108 113 Q118 101 128 113" fill="none" ${S} stroke-width="3.4"/></g>
      <g class="v e-squint"><path d="M72 111 H92 M108 111 H128" fill="none" ${S} stroke-width="3.4"/><path d="M76 111 Q82 117 88 111 M112 111 Q118 117 124 111" fill="#fffaf0" ${S} stroke-width="1.8"/></g>
      <g class="v b-flat"><path d="M71 96 Q82 91 93 95 M107 95 Q118 91 129 96" fill="none" ${S} stroke-width="4"/></g>
      <g class="v b-up"><path d="M71 88 Q82 82 93 87 M107 87 Q118 82 129 88" fill="none" ${S} stroke-width="4"/></g>
      <g class="v b-worried"><path d="M71 99 L93 89 M107 89 L129 99" fill="none" ${S} stroke-width="4"/></g>
      <g class="v b-curious"><path d="M71 86 Q82 80 93 85 M107 97 Q118 93 129 97" fill="none" ${S} stroke-width="4"/></g>
      <path d="M100 114 Q95 128 103 130" fill="none" ${S} stroke-width="2"/>
      <g class="v m-smile"><path d="M90 141 Q100 149 110 141" fill="none" ${S} stroke-width="2.6"/></g>
      <g class="v m-grin"><path d="M85 138 Q100 159 115 138 Z" fill="#fffaf0" ${S} stroke-width="2.6"/></g>
      <g class="v m-o"><ellipse cx="100" cy="146" rx="6" ry="8" fill="#7a2f2f" ${S} stroke-width="2.4"/></g>
      <g class="v m-flat"><path d="M91 145 H109" fill="none" ${S} stroke-width="2.6"/></g>
      <g class="v m-frown"><path d="M90 149 Q100 140 110 149" fill="none" ${S} stroke-width="2.6"/></g>
      <g class="v m-smirk"><path d="M91 144 Q103 148 112 139" fill="none" ${S} stroke-width="2.6"/></g>
    </g>`;

  // ----- Anna: the radio operator (curly dark hair, patterned headscarf, olive overcoat, tie, notebook and pencil) -----
  function anna() {
    const curl = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2b1d17" ${S}/>`;
    return `
    <g class="char-art">
      ${curl(54, 104, 21)}${curl(50, 132, 19)}${curl(60, 156, 17)}${curl(146, 104, 21)}${curl(150, 132, 19)}${curl(140, 156, 17)}${curl(72, 70, 21)}${curl(128, 70, 21)}${curl(100, 62, 23)}
      <rect x="88" y="150" width="24" height="38" rx="9" fill="#c98a5e" ${S}/>
      <path d="M14 290 C12 222 38 190 80 184 L120 184 C162 190 188 222 186 290 Z" fill="#5d4f3c" ${S}/>
      <path d="M80 184 L100 290 L120 184 Z" fill="#8a6a46" ${S}/>
      <circle cx="100" cy="236" r="3.2" fill="#e9d9ae" ${S} stroke-width="1.4"/><circle cx="100" cy="262" r="3.2" fill="#e9d9ae" ${S} stroke-width="1.4"/>
      <path d="M84 184 L100 206 L116 184 L110 176 L100 190 L90 176 Z" fill="#fffaf0" ${S}/>
      <path d="M95 198 L105 198 L107 238 L100 250 L93 238 Z" fill="#2b2a2a" ${S} stroke-width="2.4"/>
      <path d="M80 184 L64 226 L86 254 L94 212 Z" fill="#6f5f48" ${S}/><path d="M120 184 L136 226 L114 254 L106 212 Z" fill="#6f5f48" ${S}/>
      <g class="prop"><rect x="20" y="232" width="48" height="38" rx="3" fill="#d2b074" ${S} transform="rotate(-8 44 251)"/>
        <path d="M30 244 h28 M30 254 h28 M30 264 h20" stroke="${INK}" stroke-width="1.6" fill="none" transform="rotate(-8 44 251)"/>
        <circle cx="30" cy="270" r="11" fill="#d99f72" ${S}/>
        <path d="M150 262 L176 224" stroke="#d6a43a" stroke-width="6" stroke-linecap="round"/><path d="M176 224 L180 218" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="150" cy="268" r="11" fill="#d99f72" ${S}/></g>
      <g class="head">
        <ellipse cx="100" cy="108" rx="39" ry="47" fill="#d99f72" ${S}/>
        <ellipse cx="62" cy="116" rx="6" ry="9" fill="#d99f72" ${S} stroke-width="2"/><ellipse cx="138" cy="116" rx="6" ry="9" fill="#d99f72" ${S} stroke-width="2"/>
        <ellipse cx="73" cy="127" rx="8" ry="5" fill="#e0775f" opacity=".3"/><ellipse cx="127" cy="127" rx="8" ry="5" fill="#e0775f" opacity=".3"/>
        ${face()}
        <path d="M58 98 C54 52 146 52 142 98 C126 80 74 80 58 98 Z" fill="#b5603a" ${S}/>
        <g fill="#f1e2bd"><circle cx="72" cy="80" r="3"/><circle cx="88" cy="70" r="3"/><circle cx="106" cy="68" r="3"/><circle cx="123" cy="75" r="3"/><circle cx="64" cy="92" r="2.6"/><circle cx="136" cy="90" r="2.6"/><circle cx="98" cy="82" r="2.6"/></g>
        <path d="M130 66 L152 58 L148 82 Z" fill="#b5603a" ${S}/><path d="M130 66 L146 84 L126 78 Z" fill="#9a4c2e" ${S}/>
      </g>
    </g>`;
  }

  // ----- Tom: the codebreaker (tweed cap, cape-coat, waistcoat, bow tie, small moustache, magnifying glass) -----
  function tom() {
    return `
    <g class="char-art">
      <rect x="86" y="150" width="28" height="40" rx="9" fill="#e2b48e" ${S}/>
      <path d="M8 290 C6 220 36 188 78 182 L122 182 C164 188 194 220 192 290 Z" fill="#a89870" ${S}/>
      <path d="M78 184 L100 290 L122 184 Z" fill="#6b5538" ${S}/>
      <circle cx="100" cy="232" r="3.2" fill="#e9d9ae" ${S} stroke-width="1.4"/><circle cx="100" cy="260" r="3.2" fill="#e9d9ae" ${S} stroke-width="1.4"/>
      <path d="M22 236 C40 196 72 190 100 192 C128 190 160 196 178 236 C150 222 50 222 22 236 Z" fill="#bcae84" ${S}/>
      <path d="M40 214 h12 M62 206 h12 M126 206 h12 M148 214 h12 M30 230 h12 M158 230 h12" stroke="#7a6c48" stroke-width="2" opacity=".6" fill="none"/>
      <path d="M82 184 L100 204 L118 184 L112 176 L100 190 L88 176 Z" fill="#fffaf0" ${S}/>
      <path d="M100 198 L84 190 L84 206 Z M100 198 L116 190 L116 206 Z" fill="#2b2a2a" ${S} stroke-width="2.4"/><circle cx="100" cy="198" r="4" fill="#3a3a3a" ${S} stroke-width="2"/>
      <g class="prop"><circle cx="158" cy="226" r="22" fill="#cfe6ea" fill-opacity=".45" stroke="#c9a24d" stroke-width="6"/><circle cx="158" cy="226" r="22" fill="none" ${S} stroke-width="1.6"/>
        <path d="M148 218 Q154 212 162 214" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
        <path d="M174 242 L188 262" stroke="#6a4a2a" stroke-width="7" stroke-linecap="round"/><circle cx="190" cy="268" r="11" fill="#e2b48e" ${S}/>
        <circle cx="26" cy="262" r="11" fill="#e2b48e" ${S}/></g>
      <g class="head">
        <ellipse cx="100" cy="108" rx="40" ry="49" fill="#e8bd96" ${S}/>
        <ellipse cx="61" cy="116" rx="6" ry="9" fill="#e8bd96" ${S} stroke-width="2"/><ellipse cx="139" cy="116" rx="6" ry="9" fill="#e8bd96" ${S} stroke-width="2"/>
        <ellipse cx="72" cy="127" rx="8" ry="5" fill="#d9705f" opacity=".25"/><ellipse cx="128" cy="127" rx="8" ry="5" fill="#d9705f" opacity=".25"/>
        <path d="M60 104 C58 92 62 86 66 84 L66 112 Z M140 104 C142 92 138 86 134 84 L134 112 Z" fill="#3a2a20" ${S} stroke-width="2"/>
        ${face("#2a1d12")}
        <path d="M85 132 Q100 124 115 132 Q107 138 100 135 Q93 138 85 132 Z" fill="#3a2a20" ${S} stroke-width="2"/>
        <path d="M56 94 C54 46 146 46 144 94 C126 76 74 76 56 94 Z" fill="#a99a7a" ${S}/>
        <path d="M60 88 Q100 106 140 88 Q100 78 60 88 Z" fill="#8b7d5e" ${S}/>
        <g fill="#7a6c48" opacity=".7"><circle cx="76" cy="66" r="2"/><circle cx="92" cy="58" r="2"/><circle cx="110" cy="58" r="2"/><circle cx="126" cy="66" r="2"/><circle cx="100" cy="68" r="2"/><circle cx="84" cy="76" r="2"/><circle cx="118" cy="76" r="2"/></g>
        <circle cx="100" cy="48" r="5" fill="#8b7d5e" ${S} stroke-width="2.4"/>
      </g>
    </g>`;
  }

  // ----- props shared by the rooms -----
  const machine = (x, y, s = 1) => `
    <g class="enigma-sketch" transform="translate(${x} ${y}) scale(${s})">
      <path d="M0 40 L140 40 L150 90 L-10 90 Z" fill="#b98a52" ${S}/>
      <rect x="-10" y="90" width="160" height="26" rx="3" fill="#a07240" ${S}/>
      <rect x="6" y="6" width="128" height="38" rx="4" fill="#3d3328" ${S}/>
      <g fill="#6a5a3a">
        <circle class="lamp" cx="22" cy="18" r="5"/><circle class="lamp" cx="40" cy="18" r="5"/><circle class="lamp" cx="58" cy="18" r="5"/><circle class="lamp" cx="76" cy="18" r="5"/><circle class="lamp" cx="94" cy="18" r="5"/><circle class="lamp" cx="112" cy="18" r="5"/>
        <circle class="lamp lamp-main" cx="31" cy="32" r="5"/><circle class="lamp" cx="49" cy="32" r="5"/><circle class="lamp" cx="67" cy="32" r="5"/><circle class="lamp" cx="85" cy="32" r="5"/><circle class="lamp" cx="103" cy="32" r="5"/>
      </g>
      <g fill="#c7ccd1" ${S} stroke-width="1.8"><circle cx="40" cy="-4" r="13"/><circle cx="70" cy="-4" r="13"/><circle cx="100" cy="-4" r="13"/></g>
      <g fill="#f3e8c8" ${S} stroke-width="1.4"><circle cx="20" cy="56" r="6"/><circle cx="40" cy="56" r="6"/><circle cx="60" cy="56" r="6"/><circle cx="80" cy="56" r="6"/><circle cx="100" cy="56" r="6"/><circle cx="120" cy="56" r="6"/><circle cx="30" cy="74" r="6"/><circle cx="50" cy="74" r="6"/><circle cx="70" cy="74" r="6"/><circle cx="90" cy="74" r="6"/><circle cx="110" cy="74" r="6"/></g>
    </g>`;

  const lamp = (x, y) => `
    <g transform="translate(${x} ${y})">
      <circle class="lampglow" cx="0" cy="-30" r="70" fill="url(#lampglow)"/>
      <path d="M-26 -20 L-14 -50 L14 -50 L26 -20 Z" fill="#d9a441" ${S}/>
      <path d="M0 -20 L0 24 M-18 26 H18" fill="none" ${S} stroke-width="3"/>
    </g>`;

  // ----- the rooms (800 x 450 stage). Each has a "back" layer (behind the characters) and a "front" layer (desk or wall). -----
  const rooms = {
    "radio-room": () => ({ back: `
      <rect x="0" y="0" width="800" height="450" fill="#d9c7a0"/>
      <rect x="0" y="250" width="800" height="200" fill="#c4ae82"/>
      <path d="M0 250 H800" ${S} fill="none" stroke-width="2"/>
      <g class="window"><rect x="560" y="44" width="190" height="150" fill="#2b3a55" ${S}/><circle cx="690" cy="92" r="22" fill="#f1e8c0" ${S} stroke-width="2"/><path d="M655 44 V194 M560 119 H750" ${S} stroke-width="3" fill="none"/>
        <g fill="#f1e8c0"><circle cx="590" cy="70" r="2"/><circle cx="620" cy="100" r="2"/><circle cx="600" cy="150" r="2"/><circle cx="725" cy="160" r="2"/></g></g>
      <g class="clock"><circle cx="400" cy="78" r="34" fill="#fffaf0" ${S}/><path d="M400 78 V56 M400 78 L416 86" ${S} stroke-width="3" fill="none"/></g>
      <g class="radio-set" transform="translate(70 210)"><rect x="0" y="0" width="150" height="100" rx="8" fill="#6d5b45" ${S}/><circle cx="46" cy="52" r="26" fill="#efe3c3" ${S}/><path d="M46 52 L60 40" ${S} stroke-width="3"/><rect x="92" y="22" width="44" height="56" rx="4" fill="#3d3328" ${S}/><path d="M100 30 H128 M100 42 H128 M100 54 H128 M100 66 H128" stroke="#8d7a58" stroke-width="2" fill="none"/>
        <path d="M30 0 L-20 -90" ${S} stroke-width="3" fill="none"/><circle cx="-20" cy="-92" r="5" fill="${INK}"/></g>
      <g class="signal"><path d="M30 126 Q 8 100 6 70" fill="none" stroke="#c0762b" stroke-width="3" stroke-dasharray="6 8"/><path d="M44 118 Q 14 84 14 44" fill="none" stroke="#c0762b" stroke-width="3" stroke-dasharray="6 8"/></g>`,
      front: `
      <rect x="40" y="318" width="720" height="26" rx="4" fill="#9a7550" ${S}/>
      <rect x="60" y="344" width="680" height="106" fill="#7b5a3a" ${S}/>
      ${machine(520, 214, 1.15)}
      ${lamp(468, 322)}` }),

    "listening-station": () => ({ back: `
      <rect x="0" y="0" width="800" height="450" fill="#cdbf9c"/>
      <rect x="0" y="260" width="800" height="190" fill="#b5a47c"/>
      <path d="M0 260 H800" ${S} fill="none" stroke-width="2"/>
      <g class="pinboard"><rect x="60" y="40" width="250" height="150" fill="#a97b48" ${S}/>
        <g fill="#f1e8cc" ${S} stroke-width="1.6"><rect x="78" y="58" width="58" height="42" transform="rotate(-4 78 58)"/><rect x="150" y="64" width="62" height="44" transform="rotate(3 150 64)"/><rect x="226" y="56" width="60" height="46" transform="rotate(-2 226 56)"/><rect x="92" y="116" width="64" height="48" transform="rotate(2 92 116)"/><rect x="176" y="120" width="60" height="44" transform="rotate(-3 176 120)"/></g>
        <g font-family="Courier New, monospace" font-size="13" fill="${INK}"><text x="84" y="84">QWRTZ</text><text x="156" y="90">XKJHD</text><text x="232" y="84">MBVLC</text><text x="98" y="144">PLOKI</text><text x="182" y="146">ZAQWS</text></g></g>
      <g class="receiver" transform="translate(400 90)"><rect x="0" y="0" width="330" height="220" rx="10" fill="#5c4a3a" ${S}/><rect x="14" y="14" width="302" height="92" rx="6" fill="#e9dcb8" ${S}/>
        <path d="M30 76 H300" ${S} stroke-width="2" fill="none"/><g stroke="${INK}" stroke-width="1.6"><path d="M50 62 V90 M90 62 V90 M130 62 V90 M170 62 V90 M210 62 V90 M250 62 V90 M290 62 V90"/></g><path class="needle" d="M190 30 V90" ${S} stroke-width="3" stroke="#a8332a"/>
        <circle cx="70" cy="160" r="34" fill="#3d3328" ${S}/><circle cx="70" cy="160" r="22" fill="#c7ccd1" ${S} stroke-width="2"/><path d="M70 160 L84 148" ${S} stroke-width="3"/>
        <circle cx="170" cy="160" r="34" fill="#3d3328" ${S}/><circle cx="170" cy="160" r="22" fill="#c7ccd1" ${S} stroke-width="2"/><path d="M170 160 L160 144" ${S} stroke-width="3"/>
        <rect x="236" y="130" width="70" height="70" rx="4" fill="#3d3328" ${S}/><path d="M246 144 H296 M246 158 H296 M246 172 H296 M246 186 H296" stroke="#8d7a58" stroke-width="2" fill="none"/>
        <path d="M300 0 L340 -70" ${S} stroke-width="3" fill="none"/></g>
      <g class="signal"><path d="M780 40 Q 770 -10 700 -40" fill="none" stroke="#c0762b" stroke-width="3" stroke-dasharray="6 8"/><path d="M780 70 Q 756 -2 690 -24" fill="none" stroke="#c0762b" stroke-width="3" stroke-dasharray="6 8"/></g>`,
      front: `
      <rect x="40" y="326" width="720" height="26" rx="4" fill="#9a7550" ${S}/>
      <rect x="60" y="352" width="680" height="98" fill="#7b5a3a" ${S}/>
      <g class="papers" transform="translate(560 292)"><rect x="0" y="0" width="120" height="34" fill="#f1e8cc" ${S} transform="rotate(-3)"/><rect x="10" y="-8" width="116" height="30" fill="#fffaf0" ${S} transform="rotate(2)"/></g>
      ${lamp(110, 326)}` }),

    // A foggy city street at night: lamp post, shopfronts, and a low stone wall the characters stand behind.
    "street": () => ({ back: `
      <rect x="0" y="0" width="800" height="450" fill="#7f8a84"/>
      <g fill="#6f7a76"><rect x="250" y="70" width="70" height="200"/><rect x="330" y="40" width="60" height="230"/><rect x="410" y="90" width="80" height="180"/><rect x="500" y="60" width="64" height="210"/></g>
      <g fill="#6a7570"><rect x="280" y="40" width="14" height="30"/><rect x="460" y="60" width="14" height="30"/></g>
      <g ${S} stroke-width="2.4"><rect x="0" y="50" width="230" height="260" fill="#8a5a45"/><rect x="570" y="50" width="230" height="260" fill="#7e5240"/></g>
      <g fill="#f4d88c" ${S} stroke-width="2"><rect x="20" y="110" width="50" height="60"/><rect x="90" y="110" width="50" height="60"/><rect x="160" y="110" width="50" height="60"/><rect x="20" y="200" width="190" height="80"/>
        <rect x="590" y="110" width="50" height="60"/><rect x="660" y="110" width="50" height="60"/><rect x="730" y="110" width="50" height="60"/><rect x="590" y="200" width="190" height="80"/></g>
      <g ${S} stroke-width="2.4"><path d="M10 192 H220 L210 206 H20 Z" fill="#a0463a"/><path d="M580 192 H790 L780 206 H590 Z" fill="#3f6b5a"/></g>
      <rect x="0" y="300" width="800" height="150" fill="#6d6459"/>
      <g stroke="#4f473e" stroke-width="2" fill="none" opacity=".7"><path d="M0 330 H800 M0 360 H800 M0 395 H800 M60 300 V450 M180 300 V450 M300 300 V450 M420 300 V450 M540 300 V450 M660 300 V450 M780 300 V450"/></g>
      <g transform="translate(395 300)"><circle class="lampglow" cx="0" cy="-150" r="95" fill="url(#lampglow)"/><path d="M0 0 V-170" ${S} stroke-width="7"/><path d="M-16 -170 H16 L10 -196 H-10 Z" fill="#f4d88c" ${S}/><path d="M-12 -196 H12 L0 -208 Z" fill="#3a2a20" ${S}/></g>
      <rect x="0" y="120" width="800" height="230" fill="url(#fog)"/>`,
      front: `
      <rect x="0" y="336" width="800" height="114" fill="#6b5f55" ${S}/>
      <g stroke="${INK}" stroke-width="2" fill="none" opacity=".55"><path d="M0 372 H800 M0 410 H800 M70 336 V372 M210 336 V372 M350 336 V372 M490 336 V372 M630 336 V372 M770 336 V372 M140 372 V410 M280 372 V410 M420 372 V410 M560 372 V410 M700 372 V410"/></g>
      <rect x="0" y="326" width="800" height="14" fill="#857868" ${S}/>` }),
  };

  // Small scene extras (switched on by the scene script) drawn on top of the room.
  const effects = `
    <g class="fx fx-bars" transform="translate(470 36)">
      <rect x="0" y="0" width="290" height="150" rx="8" fill="#fffaf0" ${S}/>
      <g class="bars" ${S} stroke-width="1.8">
        <rect x="24"  y="100" width="26" height="32"  fill="#d9a441"/><rect x="62"  y="86"  width="26" height="46"  fill="#d9a441"/>
        <rect x="100" y="78"  width="26" height="54"  fill="#d9a441"/><rect x="138" y="96"  width="26" height="36"  fill="#d9a441"/>
        <rect x="176" y="28"  width="26" height="104" fill="#c0392b"/><rect x="214" y="106" width="26" height="26"  fill="#d9a441"/>
        <rect x="252" y="112" width="26" height="20"  fill="#d9a441"/>
      </g>
      <g font-family="Courier New, monospace" font-size="15" font-weight="bold" fill="${INK}" text-anchor="middle"><text x="37" y="148">W</text><text x="75" y="148">K</text><text x="113" y="148">Q</text><text x="151" y="148">R</text><text x="189" y="148">T</text><text x="227" y="148">J</text><text x="265" y="148">M</text></g>
      <text x="145" y="18" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="${INK}">How often each letter appears</text>
    </g>
    <g class="fx fx-swap" transform="translate(500 44)">
      <rect x="0" y="0" width="250" height="110" rx="8" fill="#fffaf0" ${S}/>
      <g font-family="Courier New, monospace" font-size="22" font-weight="bold" fill="${INK}"><text x="18" y="36">A → Q</text><text x="18" y="66">B → W</text><text x="18" y="96">C → E</text><text x="130" y="36">D → R</text><text x="130" y="66">E → T</text><text x="130" y="96">F → Y</text></g>
    </g>
    <g class="fx fx-question"><text x="300" y="120" font-family="Georgia, serif" font-size="64" fill="${INK}">?</text></g>`;

  return { defs, anna, tom, rooms, effects, INK };
})();