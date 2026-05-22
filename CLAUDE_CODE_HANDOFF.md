# Claude Code Handoff — Smash or Pass redesign

> **For Claude Code:** read this file end-to-end before touching the repo. The goal is a visual + interaction overhaul of `public/index.html` while leaving `server.js`, the API contract, and `data/votes.json` schema **completely untouched**.

---

## 1. What changed at a high level

The old `public/index.html` was a single dark-themed app. The redesign introduces:

1. **Three switchable visual themes**, each a full visual rebuild of the same app:
   - **`foil`** — 90s holographic trading card (default). Dark navy background, cream/gold card stock, embossed gold borders, holo shimmer overlay, condensed display type for headings.
   - **`cartridge`** — Game Boy DMG retro. 4-tone green LCD palette, `Press Start 2P` pixel font, chunky 4px borders, pixelated sprites with green color-tinting filter.
   - **`dex`** — Modern device chrome. Red plastic header, dark CRT-style screen with mint-cyan readouts + scanlines + faux stat bars, clean sans-serif.

2. **A capsule-burst entry animation** every time a new creature is rolled:
   - Phase 1: capsule drops in from above (~220ms)
   - Phase 2: capsule wobbles left/right 3× (~680ms)
   - Phase 3: white flash + capsule halves fly apart (~200ms)
   - Phase 4: creature scales in with overshoot bounce (~400ms)
   - Phase 5: idle float (subtle Y bob, infinite)
   - Each theme provides its OWN capsule visual — NOT a recreation of the trademarked red-and-white pokéball. The cartridge theme uses a 2-tone green pixel "canister", foil uses a faceted gold/cream hexagonal gem, dex uses a chrome/red containment capsule with a glowing seam.

3. **Vote animations**:
   - **Smash (level-up)**: white-to-gold radial flash + ~18 gold sparkle particles rising + creature `scale + brightness` pulse. Plays `window.SOP_AUDIO.smash` if set.
   - **Pass (faint)**: creature goes greyscale and spirals down off-screen with `rotate(0 → 1440deg)` + `scale(1 → 0.2)` + opacity fade. 5 cartoon stars orbit around the center for ~1.1s. Plays `window.SOP_AUDIO.pass` if set.

4. **A floating theme switcher** in the bottom-right corner. Click the pill → dropdown of all 3 themes with color swatches → pick one. Selection is persisted to `localStorage` under key `sop_theme`. **Default is `foil`** when no choice is stored yet.

5. **Audio hook system** — silent by default. Consumers can later set `window.SOP_AUDIO = { entry, smash, pass, skip }` with URLs/paths to their own audio files. The app will `new Audio(url).play()` each event fire-and-forget. **No audio files are bundled** — the user will source/ship their own.

---

## 2. What does NOT change

- `server.js` — leave as-is.
- The `/api/votes` (GET) and `/api/vote` (POST) endpoints — the new UI calls them with the **identical** payload shape: `{ id, choice, name, sprite }`. Static / GitHub-Pages mode (where these fetches fail) still works silently.
- `data/votes.json` schema — same.
- `package.json` — same.
- The `.gitignore` rule for `data/votes.json` — same.

---

## 3. Implementation path — pick ONE

### Path A · Single-file drop-in (recommended, fastest)

Replace the entire contents of `public/index.html` with the file in **Appendix A** below. That's it. The single file inlines React 18.3.1, ReactDOM, Babel standalone, and all theme logic in one `<script type="text/babel">` block. It's ~69 KB.

**Pros:** trivial diff, one file changed, mirrors the current repo's "one HTML file" philosophy.
**Cons:** large single file; harder to diff future tweaks.

### Path B · Modular split

Recreate the modular structure as separate files under `public/js/` and have `public/index.html` reference them with `<script type="text/babel" src="…">` tags. This matches how the design exploration was built and is easier to maintain long-term.

File layout:

```
public/
├── index.html              # shell + React/Babel CDN + boot
└── js/
    ├── shared.jsx          # state store, PokeAPI client, audio hook, gen filters
    ├── effects.jsx         # animation primitives (phase machine, sparkles, stars)
    ├── shared-components.jsx # CreatureStage + Leaderboard (theme-agnostic)
    ├── theme-cartridge.jsx # Game Boy theme
    ├── theme-foil.jsx      # Trading card theme
    ├── theme-dex.jsx       # Modern device theme
    └── theme-switcher.jsx  # floating switcher pill
```

Use the source listings in **Appendix B**. The `public/index.html` shell for Path B is in **Appendix C**.

**Pros:** clean diffs, easier to iterate on individual themes.
**Cons:** 7 new files + the shell rewrite; more moving parts.

---

## 4. Visual / interaction specs (per theme)

### 4.1 Foil (default)

| Token | Value |
|---|---|
| bg | `#1e1e2c` with radial-gradient overlays `#2a2547` (top-left) and `#3a1f3f` (bottom-right) |
| card surface | conic-gradient gold/cream around 360° (foil shimmer base) |
| gold | `#c8a14c` · highlight `#f3d27a` |
| ink (text on cream) | `#23202b` |
| muted | `#6d6453` |
| smash button | `#d33d49` (crimson) |
| pass button | `#4a3a8a` (deep purple) |
| display font | `Anton` (Google Fonts), 22–26px, letter-spacing 1–2px |
| body font | `Inter` |

**Card structure** (320px wide):
1. Outer box-shadow stack: `0 0 0 2px gold, 0 0 0 4px ink, 0 0 0 5px goldHi, 0 12px 36px black50, inset 0 0 0 1px goldHi` — produces the embossed gold double-border.
2. Inner conic-gradient backdrop (the "foil stock").
3. Name strip: linear-gradient gold bar, name uppercase left, `#xxx` right.
4. Art window: cream gradient `#fff9e0 → #f6e8b8`, 2px gold border + inset ink border. Holographic shimmer is a 115° linear-gradient overlay translated -80% → 80% over 4s, `mix-blend-mode: overlay`.
5. Footer row: type circles (22px, colored disc with 2px ink border + inset shadow) on the left; italic "ILLUS. SPRITE WORKS" on the right.

**Buttons:** 3D embossed style with inset highlight + inset shadow + 4px solid drop shadow. Press state translates `Y+3px` and shortens drop shadow.

### 4.2 Cartridge 88

| Token | Value |
|---|---|
| bg / LCD lightest | `#9bbc0f` |
| LCD mid | `#8bac0f` |
| LCD dark | `#306230` |
| LCD darkest | `#0f380f` |
| font | `Press Start 2P` — 8–16px depending on element |

**Critical detail:** sprite `<img>` gets a CSS filter to mimic 4-tone LCD: `contrast(1.1) saturate(0) sepia(0.85) hue-rotate(40deg) brightness(0.85)` + `image-rendering: pixelated`.

**Borders:** 4px solid `#0f380f` on panel edges. Buttons get a `4px 4px 0` hard drop-shadow that collapses to `2px 2px 0` on press.

**Capsule visual:** two stacked 64×32 rectangles (ink top half, lightest-green bottom half) with 3px black borders + inset highlight/shadow bands; centered 16×16 button. No curves anywhere.

### 4.3 Dex OS

| Token | Value |
|---|---|
| red header | linear-gradient `#d62828 → #a01d1d`, inset ‑1px dark line at bottom |
| surface | `#f6f3ee` |
| panel (device chassis) | `#1a1a1f` with 18px radius |
| screen bg | linear-gradient `#0b1018 → #050a12` |
| screen ink | `#7fffd4` (mint cyan, used for readout text, seam glow, type-pill outlines) |
| smash | `#22c55e` (green) · pass `#ef4444` (red) |
| display font (chrome) | `Inter` 700/800 |
| readout font (screen) | `JetBrains Mono` 9–13px, letter-spacing 1.5–2px, UPPERCASE |

**Screen ornaments:**
- 8px green LED + 6px yellow LED at top-left of screen bezel (always on).
- 3 pulsing dots in the header center (green/yellow/blue), animating opacity 1→0.5 + scale 1→0.85 over 1.8s ease-in-out infinite.
- Scanline overlay: `repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,255,255,0.025) 2px 3px)` over the screen.
- Faux stat bars below the name: 3 rows (HP, ATK, DEF) with deterministic widths computed from `current.id` (so a given creature always shows the same fake stats).
- Button labels include shoulder-button hints: "L · ABANDON / PASS" and "R · CAPTURE / SMASH".

---

## 5. Shared state & data flow

A single module-level store (`SOPStore`) holds all state. Themes subscribe via the `useSOP()` hook and re-render on change. **The store is theme-agnostic** — all 3 themes read the same source of truth.

State shape:

```js
{
  checkedGens: Set<number>,     // 0..8, which gens are in the pool
  current: { id, name, sprite, types } | null,
  loading: boolean,
  voteEvent: { id, choice, ts } | null,
  voteSeq: number,              // bumps each vote — themes useEffect on this
  sSmash, sPass, sSeen: number, // session counters
  globalVotes: { [id]: { smash, pass, name, sprite } },
  skipSeq: number,
}
```

Actions: `vote('smash' | 'pass')`, `skip()`, `toggleGen(i, checked)`, `toggleAllGens(checked)`, `advance()` (private, picks a random pokemon from the pool).

`vote()` flow:
1. Increment session counter for the chosen side.
2. Bump `voteSeq` (this is what themes watch to trigger the smash/faint animation).
3. Update `globalVotes[id]` optimistically.
4. POST `/api/vote` (fire-and-forget, ignore failures for static mode).
5. After 1300ms, call `advance()` to roll the next creature.

The PokeAPI fetch is cached in a module-local `pokeCache = {}` keyed by id so repeated draws of the same creature don't re-hit the network.

---

## 6. Animation engine

Lives in `effects.jsx`. Two hooks:

```js
useEntryPhase(currentId)
// Returns { phase, seq } where phase cycles:
// 'drop' (0-220ms) → 'wobble' (220-900ms) → 'flash' (900-1100ms)
// → 'reveal' (1100-1500ms) → 'idle' (1500+)
// Resets whenever currentId changes. Fires playSfx('entry') on each reset.

useVoteAnim()
// Returns { active, choice } based on store.voteSeq.
// active=true for VOTE_DURATION (1300ms) after each vote.
```

Two particle components: `<SparkleBurst active>` (18 gold rotated-square sparkles with randomized x/delay/duration, animating up 160px while rotating 45→225°) and `<FaintStars active>` (5 SVG stars orbiting at radius 60 via a single `@keyframes sopOrbit` rotation).

A one-time `<style id="sop-anim-styles">` block injects all keyframes globally. Themes don't redefine them; they just consume `animation: sopWobble 680ms steps(8, end)` etc.

Critical keyframes:
- `sopDrop` — translateY(-260px) scale(.7) → 0/1
- `sopWobble` — Y bob + rotate ±14deg over 7 keyframes
- `sopCapsuleOpenTop` / `sopCapsuleOpenBot` — fly halves apart on flash
- `sopReveal` — scale 0 → 1.18 → 1 (overshoot at 55%)
- `sopSmashPulse` — brightness 1 → 1.6 + scale 1 → 1.15 at 40%
- `sopFaintSpiral` — Y 0→160, rotate 0→1440deg, scale 1→0.2, grayscale 0→1, opacity 1→0
- `sopFloatIdle` — Y 0 → -6 → 0 over 2.4s infinite

---

## 7. Theme switcher

Floating `<ThemeSwitcher current={theme} onChange={setTheme} />` positioned `fixed; right: 16; bottom: 16; z-index: 9999`. Two-state component: closed = a small pill showing the current theme's swatch + label + ▼; open = a 240px popover above the pill listing all 3 themes with swatch / label / sublabel / checkmark.

Swatches:
- Foil: `linear-gradient(135deg, #f3d27a, #c8a14c, #f3d27a)`
- Cartridge: `linear-gradient(135deg, #9bbc0f, #306230)`
- Dex: `linear-gradient(135deg, #f25d5d, #a01d1d)`

Selection persists to `localStorage.sop_theme`. On load, the App component reads it, falling back to `'foil'` if missing or invalid.

---

## 8. Acceptance criteria

Verify all of these in the browser before considering the handoff complete:

- [ ] Page loads with Foil theme by default; no console errors.
- [ ] Capsule burst plays on every new creature: drop → wobble (3x) → flash → creature scales in.
- [ ] Clicking **Smash** plays the level-up animation (sparkles + flash + pulse), increments session smash counter + global counter, advances to the next creature ~1.3s later.
- [ ] Clicking **Pass** plays the faint animation (greyscale spiral + cartoon stars), same flow.
- [ ] Clicking **Skip** just advances — no smash/pass animation.
- [ ] Theme switcher pill in bottom-right opens a popover, lets you pick any theme. Switching is instantaneous and the current creature stays on screen.
- [ ] Reload after switching: the theme persists.
- [ ] Generation filter checkboxes affect the pool. "All" master checkbox shows an indeterminate state when some-but-not-all are checked.
- [ ] Leaderboard updates as votes come in.
- [ ] `/api/vote` is POSTed with `{ id, choice, name, sprite }` on every vote.
- [ ] In static / GitHub Pages mode (no backend), fetch failures don't crash the UI.
- [ ] Setting `window.SOP_AUDIO = { entry: 'foo.mp3' }` in console then triggering an entry plays the audio.

---

## 9. Audio wiring (when ready)

When the user has SFX files, they can be:
1. Dropped into `public/audio/` and referenced as e.g. `window.SOP_AUDIO = { entry: '/audio/open.wav', smash: '/audio/level-up.wav', pass: '/audio/faint.wav', skip: '/audio/blip.wav' }` set in a `<script>` tag before the main app script.
2. Or set at runtime from the browser console for testing.

No code changes needed — the `playSfx(key)` helper already `new Audio(url).play()`s whatever's there.

---

## Appendix A · Bundled `public/index.html` (Path A)

Write this entire file to `public/index.html`, overwriting the existing one:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pokémon: Smash or Pass</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Anton&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

  <script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>

  <style>
    html, body { margin: 0; padding: 0; height: 100%; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #1e1e2c; overflow: hidden; }
    #root { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel" data-presets="react">
// ===== js/shared.jsx =====
// Shared state, PokeAPI access, audio hooks. All 3 themes consume the same store
// so the same Pokémon appears in every theme — and voting in one triggers
// animations in all three. Great for comparison.

const GENS = [
  { label: 'Gen 1 · Kanto',   range: [1, 151],   sub: '#001–151' },
  { label: 'Gen 2 · Johto',   range: [152, 251], sub: '#152–251' },
  { label: 'Gen 3 · Hoenn',   range: [252, 386], sub: '#252–386' },
  { label: 'Gen 4 · Sinnoh',  range: [387, 493], sub: '#387–493' },
  { label: 'Gen 5 · Unova',   range: [494, 649], sub: '#494–649' },
  { label: 'Gen 6 · Kalos',   range: [650, 721], sub: '#650–721' },
  { label: 'Gen 7 · Alola',   range: [722, 809], sub: '#722–809' },
  { label: 'Gen 8 · Galar',   range: [810, 905], sub: '#810–905' },
  { label: 'Gen 9 · Paldea',  range: [906, 1025],sub: '#906–1025' },
];

// Audio hook system — by default silent. The user can drop their own files in
// later by setting window.SOP_AUDIO = { entry: 'url', smash: 'url', pass: 'url', skip: 'url' }
// either before page load or anytime at runtime. Each event is fire-and-forget.
window.SOP_AUDIO = window.SOP_AUDIO || {};
function playSfx(key) {
  const url = window.SOP_AUDIO?.[key];
  if (!url) return;
  try {
    const a = new Audio(url);
    a.volume = 0.6;
    a.play().catch(() => {});
  } catch (e) { /* noop */ }
}

// PokeAPI access. Pulls full details once, sprites direct from PokeAPI CDN.
const pokeCache = {};
async function fetchPoke(id) {
  if (pokeCache[id]) return pokeCache[id];
  try {
    const r = await fetch(\u0060https://pokeapi.co/api/v2/pokemon/${id}\u0060);
    const d = await r.json();
    pokeCache[id] = {
      id,
      name: d.name,
      sprite: \u0060https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png\u0060,
      types: d.types.map(t => t.type.name),
    };
    return pokeCache[id];
  } catch (e) {
    return { id, name: \u0060pokemon-${id}\u0060, sprite: '', types: [] };
  }
}

// Simple store with React-style external listener — used so all 3 themes
// re-render off the same source of truth.
function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    set: (patch) => {
      state = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
      subs.forEach(fn => fn(state));
    },
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
  };
}

const SOPStore = createStore({
  // Generations filter
  checkedGens: new Set(GENS.map((_, i) => i)),
  // Current encounter
  current: null,         // { id, name, sprite, types } | null
  loading: true,
  // Vote event — themes subscribe to \u0060voteSeq\u0060 to trigger their faint/level-up animation
  voteEvent: null,       // { id, choice, ts } | null
  voteSeq: 0,
  // Session stats
  sSmash: 0,
  sPass: 0,
  sSeen: 0,
  // Global tally (loaded from server)
  globalVotes: {},
  // Skip event
  skipSeq: 0,
});

function getPool() {
  const { checkedGens } = SOPStore.get();
  const pool = [];
  checkedGens.forEach(i => {
    const [lo, hi] = GENS[i].range;
    for (let id = lo; id <= hi; id++) pool.push(id);
  });
  return pool;
}

let advancing = false;
async function advance() {
  if (advancing) return;
  advancing = true;
  const pool = getPool();
  if (pool.length === 0) {
    SOPStore.set({ current: null, loading: false });
    advancing = false;
    return;
  }
  const id = pool[Math.floor(Math.random() * pool.length)];
  SOPStore.set({ loading: true });
  const poke = await fetchPoke(id);
  SOPStore.set({ current: poke, loading: false });
  advancing = false;
}

function toggleGen(i, checked) {
  const s = SOPStore.get();
  const next = new Set(s.checkedGens);
  if (checked) next.add(i); else next.delete(i);
  SOPStore.set({ checkedGens: next });
}

function toggleAllGens(checked) {
  SOPStore.set({ checkedGens: checked ? new Set(GENS.map((_, i) => i)) : new Set() });
}

function vote(choice) {
  const s = SOPStore.get();
  if (!s.current) return;
  const id = s.current.id;
  const patch = {
    voteEvent: { id, choice, ts: Date.now() },
    voteSeq: s.voteSeq + 1,
    sSeen: s.sSeen + 1,
  };
  if (choice === 'smash') patch.sSmash = s.sSmash + 1;
  if (choice === 'pass') patch.sPass = s.sPass + 1;
  // Update global tally optimistically
  const gv = { ...s.globalVotes };
  if (!gv[id]) gv[id] = { smash: 0, pass: 0, name: s.current.name, sprite: s.current.sprite };
  gv[id] = { ...gv[id], [choice]: gv[id][choice] + 1, name: s.current.name, sprite: s.current.sprite };
  patch.globalVotes = gv;
  SOPStore.set(patch);

  playSfx(choice);

  // POST to server (silently fails in static mode)
  fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, choice, name: s.current.name, sprite: s.current.sprite }),
  }).catch(() => {});

  // Schedule next pokemon after the longest animation window
  setTimeout(() => advance(), 1300);
}

function skip() {
  const s = SOPStore.get();
  SOPStore.set({ skipSeq: s.skipSeq + 1 });
  playSfx('skip');
  advance();
}

async function loadGlobalVotes() {
  try {
    const r = await fetch('/api/votes');
    if (r.ok) {
      const data = await r.json();
      SOPStore.set({ globalVotes: data });
    }
  } catch (e) {}
}

// React hook
function useSOP() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => SOPStore.subscribe(force), []);
  return SOPStore.get();
}

// Watch generation filter changes: rebuild pool and advance if current is null
// or out of pool. Triggered from the store subscription itself.
let lastGenSig = '';
SOPStore.subscribe((s) => {
  const sig = [...s.checkedGens].sort().join(',');
  if (sig !== lastGenSig) {
    lastGenSig = sig;
    const pool = getPool();
    if (pool.length > 0 && !s.current && !s.loading) advance();
  }
});

// Boot: load global tally, kick off the first encounter.
loadGlobalVotes();
advance();

// Export to global window
Object.assign(window, {
  GENS, useSOP, SOPStore, vote, skip, toggleGen, toggleAllGens, playSfx, fetchPoke,
});


// ===== js/effects.jsx =====
// Animation primitives: entry phase state machine + sparkle/star particle systems.
// Each theme provides its own Capsule visual but consumes the same phase timing.

const ENTRY_TIMINGS = {
  drop:    [0,    220],   // capsule drops in from above
  wobble:  [220,  900],   // capsule shakes left/right 3x
  flash:   [900,  1100],  // white flash as capsule opens
  reveal:  [1100, 1500],  // creature scales in, halves fly apart
  // idle: 1500+
};
const ENTRY_TOTAL = 1500;

// Vote animation duration
const VOTE_DURATION = 1300;

/**
 * useEntryPhase — returns the current phase + elapsed ms whenever a new
 * Pokémon arrives (currentId changes). Phase is one of:
 * 'drop' | 'wobble' | 'flash' | 'reveal' | 'idle'.
 */
function useEntryPhase(currentId) {
  const [phase, setPhase] = React.useState('idle');
  const [seq, setSeq] = React.useState(0);

  React.useEffect(() => {
    if (currentId == null) { setPhase('idle'); return; }
    setSeq(s => s + 1);
    setPhase('drop');
    const timers = [
      setTimeout(() => setPhase('wobble'), ENTRY_TIMINGS.wobble[0]),
      setTimeout(() => setPhase('flash'),  ENTRY_TIMINGS.flash[0]),
      setTimeout(() => setPhase('reveal'), ENTRY_TIMINGS.reveal[0]),
      setTimeout(() => setPhase('idle'),   ENTRY_TOTAL),
    ];
    // Hook for sound: capsule shake & open
    playSfx('entry');
    return () => timers.forEach(clearTimeout);
  }, [currentId]);

  return { phase, seq };
}

/**
 * useVoteAnim — observes voteSeq from the store and returns the current vote
 * animation state: { choice, active, ts } | { active: false }.
 */
function useVoteAnim() {
  const { voteEvent, voteSeq } = useSOP();
  const [active, setActive] = React.useState(false);
  const [choice, setChoice] = React.useState(null);

  React.useEffect(() => {
    if (!voteEvent) return;
    setActive(true);
    setChoice(voteEvent.choice);
    const t = setTimeout(() => setActive(false), VOTE_DURATION);
    return () => clearTimeout(t);
  }, [voteSeq]);

  return { active, choice };
}

/**
 * SparkleBurst — gold sparkle particles rising up after a smash.
 * Self-contained, no styles needed beyond what's inlined. Renders ~16 particles.
 */
function SparkleBurst({ active }) {
  const particles = React.useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 80,        // % across
      delay: Math.random() * 200,
      duration: 700 + Math.random() * 500,
      size: 6 + Math.random() * 8,
      hue: 45 + Math.random() * 15,
    }));
  }, [active]);

  if (!active) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 8,
    }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: \u0060${p.x}%\u0060,
          bottom: '20%',
          width: p.size,
          height: p.size,
          background: \u0060oklch(0.85 0.18 ${p.hue})\u0060,
          boxShadow: \u00600 0 ${p.size}px oklch(0.85 0.2 ${p.hue})\u0060,
          transform: 'rotate(45deg)',
          animation: \u0060sopSparkle ${p.duration}ms ease-out ${p.delay}ms forwards\u0060,
          opacity: 0,
        }} />
      ))}
    </div>
  );
}

/**
 * LevelUpFlash — quick white-to-gold flash + arrow-up text.
 */
function LevelUpFlash({ active, color = '#facc15' }) {
  if (!active) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7,
      animation: 'sopFlash 280ms ease-out',
      background: \u0060radial-gradient(circle at center, ${color}33 0%, transparent 60%)\u0060,
    }} />
  );
}

/**
 * FaintStars — cartoon stars orbiting after pass. 5-pointed dizzy stars.
 */
function FaintStars({ active }) {
  if (!active) return null;
  const stars = [0, 1, 2, 3, 4];
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ position: 'relative', width: 0, height: 0, animation: 'sopOrbit 1.1s linear' }}>
        {stars.map(i => (
          <div key={i} style={{
            position: 'absolute',
            transform: \u0060rotate(${i * 72}deg) translate(60px) rotate(${-i * 72}deg)\u0060,
          }}>
            <Star size={24} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Simple 5-pointed star glyph. */
function Star({ size = 18, color = '#fde047', stroke = '#854d0e' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
      <path d="M12 1.5l3 7.2 7.7.6-5.85 5 1.8 7.5L12 17.9 5.35 21.8l1.8-7.5L1.3 9.3 9 8.7z"
        fill={color} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

// Global keyframes injected once. Themes opt-in to their own variants.
if (!document.getElementById('sop-anim-styles')) {
  const s = document.createElement('style');
  s.id = 'sop-anim-styles';
  s.textContent = \u0060
    @keyframes sopSparkle {
      0%   { transform: translate(0, 0) rotate(45deg) scale(0.4); opacity: 0; }
      20%  { opacity: 1; }
      100% { transform: translate(0, -160px) rotate(225deg) scale(1.2); opacity: 0; }
    }
    @keyframes sopFlash {
      0%   { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes sopOrbit {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes sopDrop {
      from { transform: translateY(-260px) scale(0.7); }
      to   { transform: translateY(0) scale(1); }
    }
    @keyframes sopWobble {
      0%   { transform: translateY(0) rotate(0deg); }
      15%  { transform: translateY(-6px) rotate(-14deg); }
      30%  { transform: translateY(0)    rotate(0deg); }
      45%  { transform: translateY(-6px) rotate(14deg); }
      60%  { transform: translateY(0)    rotate(0deg); }
      75%  { transform: translateY(-6px) rotate(-12deg); }
      100% { transform: translateY(0)    rotate(0deg); }
    }
    @keyframes sopCapsuleOpenTop {
      0%   { transform: translateY(0) rotate(0); opacity: 1; }
      100% { transform: translateY(-100px) rotate(-30deg); opacity: 0; }
    }
    @keyframes sopCapsuleOpenBot {
      0%   { transform: translateY(0) rotate(0); opacity: 1; }
      100% { transform: translateY(80px) rotate(30deg); opacity: 0; }
    }
    @keyframes sopReveal {
      0%   { transform: scale(0); opacity: 0; }
      55%  { transform: scale(1.18); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes sopWhiteFlash {
      0%, 100% { opacity: 0; }
      50%      { opacity: 1; }
    }
    @keyframes sopSmashPulse {
      0%, 100% { transform: scale(1); filter: brightness(1); }
      40%      { transform: scale(1.15); filter: brightness(1.6) drop-shadow(0 0 12px gold); }
    }
    @keyframes sopFaintSpiral {
      0%   { transform: translateY(0) rotate(0deg) scale(1); filter: grayscale(0); }
      30%  { transform: translateY(-10px) rotate(360deg) scale(0.95); filter: grayscale(0.6); }
      100% { transform: translateY(160px) rotate(1440deg) scale(0.2); filter: grayscale(1) brightness(0.5); opacity: 0; }
    }
    @keyframes sopFloatIdle {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-6px); }
    }
  \u0060;
  document.head.appendChild(s);
}

Object.assign(window, {
  useEntryPhase, useVoteAnim, SparkleBurst, LevelUpFlash, FaintStars, Star,
  ENTRY_TIMINGS, ENTRY_TOTAL, VOTE_DURATION,
});


// ===== js/shared-components.jsx =====
// Shared components used across all 3 themes: the creature stage (handles
// entry/vote animations on top of theme-specific Capsule + sprite) and
// leaderboard list.

function CreatureStage({ current, phase, voteActive, choice, palette, Capsule, pixelated, height = 180, spriteSize = 150, spriteFilter = '' }) {
  const showCapsule = phase === 'drop' || phase === 'wobble' || phase === 'flash';
  const showCreature = phase === 'reveal' || phase === 'idle';

  // Vote animation overrides everything.
  let creatureAnim = '';
  let creatureFilter = '';
  let creatureStyle = {};
  if (voteActive && choice === 'smash') {
    creatureAnim = 'sopSmashPulse 600ms ease-out';
  } else if (voteActive && choice === 'pass') {
    creatureAnim = 'sopFaintSpiral 1100ms ease-in forwards';
  } else if (phase === 'reveal') {
    creatureAnim = 'sopReveal 380ms cubic-bezier(.4,1.6,.6,1) forwards';
  } else if (phase === 'idle') {
    creatureAnim = 'sopFloatIdle 2.4s ease-in-out infinite';
  }

  return (
    <div style={{
      position: 'relative', width: '100%', height,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {showCapsule && (
        <div style={{ position: 'absolute' }}>
          <Capsule phase={phase} />
        </div>
      )}
      {showCreature && current?.sprite && (
        <img
          key={\u0060${current.id}-${voteActive ? choice : 'idle'}\u0060}
          src={current.sprite}
          alt={current.name}
          style={{
            width: spriteSize, height: spriteSize,
            imageRendering: pixelated ? 'pixelated' : 'auto',
            filter: spriteFilter,
            animation: creatureAnim,
            ...creatureStyle,
          }}
        />
      )}
      {/* Flash overlay during phase transition + smash */}
      {(phase === 'flash' || (voteActive && choice === 'smash')) && (
        <div style={{
          position: 'absolute', inset: 0,
          background: voteActive ? 'radial-gradient(circle, gold 0%, transparent 70%)' : 'white',
          animation: 'sopWhiteFlash 280ms ease-out',
          pointerEvents: 'none',
        }} />
      )}
      <SparkleBurst active={voteActive && choice === 'smash'} />
      <FaintStars active={voteActive && choice === 'pass'} />
    </div>
  );
}

function Leaderboard({ mode, votes, palette, pixelated, max = 5 }) {
  const entries = Object.entries(votes)
    .map(([id, v]) => ({ id, ...v }))
    .filter(e => (e.smash + e.pass) > 0)
    .sort((a, b) => b[mode] - a[mode])
    .slice(0, max);

  if (entries.length === 0) {
    return <div style={{ fontSize: 9, color: palette.muted || palette.ink, padding: '14px 4px', opacity: 0.7 }}>
      No votes yet
    </div>;
  }

  const maxVal = entries[0][mode] || 1;
  const barColor = mode === 'smash' ? (palette.smash || palette.black) : (palette.pass || palette.ink);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {entries.map((e, i) => {
        const pct = Math.round((e[mode] / maxVal) * 100);
        return (
          <div key={e.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            paddingBottom: 6, borderBottom: \u00601px solid ${palette.border || palette.ink}33\u0060,
          }}>
            <div style={{
              width: 14, textAlign: 'center', fontSize: 10,
              color: i === 0 ? (palette.gold || '#f59e0b') : palette.muted || palette.ink,
              fontWeight: 700,
            }}>{i + 1}</div>
            <img src={e.sprite} alt={e.name} style={{
              width: 28, height: 28, imageRendering: pixelated ? 'pixelated' : 'auto', flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 9, textTransform: 'capitalize',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{e.name.replace(/-/g, ' ')}</div>
              <div style={{ height: 3, background: \u0060${palette.border || palette.ink}25\u0060, marginTop: 3, borderRadius: 1 }}>
                <div style={{ height: '100%', width: \u0060${pct}%\u0060, background: barColor, borderRadius: 1, transition: 'width .4s' }} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: barColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{e[mode]}</div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { CreatureStage, Leaderboard });


// ===== js/theme-cartridge.jsx =====
// THEME 1 — CARTRIDGE 88
// Game Boy DMG aesthetic: 4-tone green LCD, pixel font, chunky borders.

const DMG = {
  bg:    '#9bbc0f',  // LCD background (lightest)
  bg2:   '#8bac0f',  // mid-light
  ink:   '#306230',  // dark
  black: '#0f380f',  // darkest
  shell: '#7d8d3a',  // bezel
};

function CartridgeTheme() {
  const s = useSOP();
  const { current, loading, sSmash, sPass, sSeen, globalVotes, checkedGens } = s;
  const { phase } = useEntryPhase(current?.id);
  const { active: voteActive, choice } = useVoteAnim();

  const showCreature = phase === 'reveal' || phase === 'idle';
  const showCapsule = phase === 'drop' || phase === 'wobble' || phase === 'flash';

  const gSmash = Object.values(globalVotes).reduce((a, v) => a + v.smash, 0);
  const gPass = Object.values(globalVotes).reduce((a, v) => a + v.pass, 0);

  return (
    <div style={{
      width: '100%', height: '100%', background: DMG.bg, color: DMG.black,
      fontFamily: '"Press Start 2P", monospace', fontSize: 10, lineHeight: 1.6,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      imageRendering: 'pixelated',
    }}>
      {/* HEADER */}
      <div style={{
        background: DMG.ink, color: DMG.bg, padding: '14px 18px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: \u00604px solid ${DMG.black}\u0060,
      }}>
        <div>
          <div style={{ fontSize: 14, letterSpacing: 1 }}>POKé-RATE</div>
          <div style={{ fontSize: 8, color: DMG.bg2, marginTop: 6, letterSpacing: 1 }}>VER. 1988 · GLOBAL DATA</div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <CartCount label="SMASH" val={gSmash} />
          <CartCount label="PASS" val={gPass} />
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '180px 1fr 210px', overflow: 'hidden' }}>
        {/* LEFT */}
        <div style={{ borderRight: \u00604px solid ${DMG.black}\u0060, background: DMG.bg2, padding: 14, overflow: 'auto' }}>
          <div style={{ fontSize: 10, color: DMG.black, marginBottom: 12 }}>►GAMES</div>
          <CartCheckbox
            label="ALL"
            checked={checkedGens.size === GENS.length}
            indeterminate={checkedGens.size > 0 && checkedGens.size < GENS.length}
            onChange={(c) => toggleAllGens(c)}
          />
          <div style={{ height: 1, background: DMG.ink, margin: '10px 0', opacity: 0.35 }} />
          {GENS.map((g, i) => (
            <CartCheckbox
              key={i}
              label={g.label.replace('Gen ', 'G').replace(' · ', ' ').toUpperCase()}
              sub={g.sub}
              checked={checkedGens.has(i)}
              onChange={(c) => toggleGen(i, c)}
            />
          ))}
        </div>

        {/* CENTER */}
        <div style={{
          position: 'relative', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 18, gap: 16,
          background: \u0060repeating-linear-gradient(0deg, ${DMG.bg} 0 3px, ${DMG.bg2} 3px 4px)\u0060,
        }}>
          {/* Screen-frame bezel */}
          <div style={{
            position: 'absolute', inset: 12,
            border: \u00604px solid ${DMG.black}\u0060,
            boxShadow: \u0060inset 0 0 0 4px ${DMG.bg}, inset 0 0 0 8px ${DMG.ink}\u0060,
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1, width: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <CreatureStage
              current={current}
              phase={phase}
              voteActive={voteActive}
              choice={choice}
              palette={DMG}
              Capsule={DMGCapsule}
              pixelated
              spriteFilter="contrast(1.1) saturate(0) sepia(0.85) hue-rotate(40deg) brightness(0.85)"
            />
            {current && (phase === 'idle' || phase === 'reveal') && (
              <>
                <div style={{ fontSize: 8, color: DMG.ink, marginTop: -4 }}>NO. {String(current.id).padStart(3, '0')}</div>
                <div style={{ fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' }}>{current.name.replace(/-/g, ' ')}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {current.types.map(t => (
                    <span key={t} style={{
                      fontSize: 8, padding: '4px 8px',
                      background: DMG.ink, color: DMG.bg, letterSpacing: 1,
                      border: \u00602px solid ${DMG.black}\u0060,
                    }}>{t.toUpperCase()}</span>
                  ))}
                </div>
              </>
            )}

            {!current && !loading && (
              <div style={{ fontSize: 10, color: DMG.ink, textAlign: 'center', padding: 40 }}>
                SELECT A GAME ►
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <CartButton onClick={() => vote('pass')} bg={DMG.ink} disabled={!current || phase !== 'idle'}>► PASS</CartButton>
              <CartButton onClick={() => vote('smash')} bg={DMG.black} disabled={!current || phase !== 'idle'}>► SMASH</CartButton>
            </div>
            <button onClick={skip} style={{
              fontFamily: 'inherit', fontSize: 8, background: 'transparent',
              border: \u00602px solid ${DMG.ink}\u0060, color: DMG.ink, padding: '6px 14px',
              cursor: 'pointer', letterSpacing: 1,
            }}>SKIP ▷</button>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ borderLeft: \u00604px solid ${DMG.black}\u0060, background: DMG.bg2, padding: 14, overflow: 'auto' }}>
          <div style={{ fontSize: 10, marginBottom: 12 }}>►TOP RATED</div>
          <Leaderboard mode="smash" votes={globalVotes} palette={DMG} pixelated />
          <div style={{ height: 12 }} />
          <div style={{ fontSize: 10, marginBottom: 8 }}>►WORST RATED</div>
          <Leaderboard mode="pass" votes={globalVotes} palette={DMG} pixelated />
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        background: DMG.ink, color: DMG.bg, padding: '8px 14px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        borderTop: \u00604px solid ${DMG.black}\u0060, fontSize: 8, letterSpacing: 1,
      }}>
        <span>SESSION:</span>
        <span>SMASHED <b style={{ color: '#9bbc0f' }}>{sSmash}</b></span>
        <span>SEEN <b>{sSeen}</b></span>
        <span>PASSED <b>{sPass}</b></span>
      </div>
    </div>
  );
}

function CartCount({ label, val }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 14 }}>{val}</div>
      <div style={{ fontSize: 7, marginTop: 4, color: DMG.bg2 }}>{label}</div>
    </div>
  );
}

function CartCheckbox({ label, sub, checked, indeterminate, onChange }) {
  const boxRef = React.useRef();
  React.useEffect(() => { if (boxRef.current) boxRef.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label style={{
      display: 'block', cursor: 'pointer', marginBottom: 6, fontSize: 9,
      color: DMG.black, userSelect: 'none',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 14, height: 14, border: \u00602px solid ${DMG.black}\u0060, background: DMG.bg,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {checked && !indeterminate && <span style={{ width: 6, height: 6, background: DMG.black }} />}
          {indeterminate && <span style={{ width: 6, height: 2, background: DMG.black }} />}
        </span>
        <input type="checkbox" ref={boxRef} checked={checked} onChange={(e) => onChange(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
        <span>{label}</span>
      </span>
      {sub && <div style={{ fontSize: 7, color: DMG.ink, marginLeft: 22, marginTop: 3, letterSpacing: 1 }}>{sub}</div>}
    </label>
  );
}

function CartButton({ children, onClick, disabled, bg }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily: 'inherit', fontSize: 12, letterSpacing: 1,
      padding: '12px 16px',
      background: bg, color: DMG.bg,
      border: \u00603px solid ${DMG.black}\u0060,
      boxShadow: disabled ? 'none' : \u00604px 4px 0 ${DMG.black}\u0060,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transform: 'translate(0,0)',
      transition: 'transform .08s, box-shadow .08s',
    }}
    onMouseDown={e => { if (disabled) return; e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = \u00602px 2px 0 ${DMG.black}\u0060; }}
    onMouseUp={e => { if (disabled) return; e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = \u00604px 4px 0 ${DMG.black}\u0060; }}
    onMouseLeave={e => { if (disabled) return; e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = \u00604px 4px 0 ${DMG.black}\u0060; }}
    >{children}</button>
  );
}

// Pixelated DMG capsule. Pure CSS — two stacked rectangles + a hinge bar.
// Intentionally NOT a sphere — this is a chunky pixel-art "creature canister"
// styled like a Game Boy item sprite. No red or trademarked shapes.
function DMGCapsule({ phase }) {
  const open = phase === 'flash';
  const wobbling = phase === 'wobble';
  const dropping = phase === 'drop';
  return (
    <div style={{
      width: 80, height: 80, position: 'relative',
      animation:
        dropping ? 'sopDrop 220ms steps(4, end) forwards' :
        wobbling ? 'sopWobble 680ms steps(8, end)' :
        'none',
    }}>
      {/* Top half */}
      <div style={{
        position: 'absolute', left: 8, top: 4, width: 64, height: 32,
        background: DMG.ink,
        boxShadow: \u0060inset -4px 0 0 ${DMG.black}, inset 4px 4px 0 ${DMG.bg2}\u0060,
        border: \u00603px solid ${DMG.black}\u0060,
        animation: open ? 'sopCapsuleOpenTop 200ms ease-out forwards' : 'none',
      }} />
      {/* Bottom half */}
      <div style={{
        position: 'absolute', left: 8, top: 44, width: 64, height: 32,
        background: DMG.bg,
        boxShadow: \u0060inset -4px 0 0 ${DMG.ink}, inset 4px 4px 0 ${DMG.bg2}\u0060,
        border: \u00603px solid ${DMG.black}\u0060,
        animation: open ? 'sopCapsuleOpenBot 200ms ease-out forwards' : 'none',
      }} />
      {/* Center button */}
      <div style={{
        position: 'absolute', left: 32, top: 32, width: 16, height: 16,
        background: DMG.bg2,
        border: \u00603px solid ${DMG.black}\u0060,
      }} />
    </div>
  );
}

window.CartridgeTheme = CartridgeTheme;


// ===== js/theme-foil.jsx =====
// THEME 2 — FOIL
// 90s holographic trading card. Embossed gold borders, prismatic gradient bg,
// condensed display type, energy-symbol pills.

const FOIL = {
  bg:      '#1e1e2c',
  surface: '#fbf6e7',           // cream card stock
  surface2:'#f3e9c4',
  gold:    '#c8a14c',
  goldHi:  '#f3d27a',
  ink:     '#23202b',
  muted:   '#6d6453',
  smash:   '#d33d49',
  pass:    '#4a3a8a',
  border:  '#c8a14c',
};

function FoilTheme() {
  const s = useSOP();
  const { current, loading, sSmash, sPass, sSeen, globalVotes, checkedGens } = s;
  const { phase } = useEntryPhase(current?.id);
  const { active: voteActive, choice } = useVoteAnim();

  const gSmash = Object.values(globalVotes).reduce((a, v) => a + v.smash, 0);
  const gPass = Object.values(globalVotes).reduce((a, v) => a + v.pass, 0);

  const typePalette = {
    fire: '#ef6c4a', water: '#3aa1d3', grass: '#5fb35d', electric: '#e9c531',
    psychic: '#d75aa4', ice: '#7ad3d7', dragon: '#7866b8', dark: '#3d3540',
    fairy: '#e3a7c8', normal: '#9d9582', fighting: '#b85c3a', flying: '#8aaee8',
    poison: '#9b59c1', ground: '#c9a05c', rock: '#998264', bug: '#8ab148',
    ghost: '#6a5a93', steel: '#8a96a3',
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: \u0060
        radial-gradient(ellipse at 20% 0%, #2a2547 0%, transparent 50%),
        radial-gradient(ellipse at 80% 100%, #3a1f3f 0%, transparent 50%),
        ${FOIL.bg}
      \u0060,
      color: FOIL.surface, fontFamily: '"Inter", system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* HEADER */}
      <div style={{
        padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: \u00601px solid ${FOIL.gold}40\u0060,
        background: \u0060linear-gradient(180deg, ${FOIL.bg} 0%, transparent 100%)\u0060,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FoilDiamond />
          <div>
            <div style={{
              fontFamily: '"Anton", "Bebas Neue", Impact, sans-serif',
              fontSize: 26, letterSpacing: 2,
              background: \u0060linear-gradient(135deg, ${FOIL.goldHi}, ${FOIL.gold}, ${FOIL.goldHi})\u0060,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>HOLO-RATE 1ST EDITION</div>
            <div style={{ fontSize: 10, color: FOIL.muted, letterSpacing: 2, marginTop: 2 }}>RATE EVERY CREATURE · COLLECT THE DATA</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <FoilStat label="SMASHES" val={gSmash} accent={FOIL.smash} />
          <FoilStat label="PASSES" val={gPass} accent={FOIL.pass} />
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '190px 1fr 220px', overflow: 'hidden' }}>
        {/* LEFT */}
        <div style={{
          borderRight: \u00601px solid ${FOIL.gold}30\u0060, padding: '20px 16px', overflow: 'auto',
        }}>
          <FoilHeading>SET FILTER</FoilHeading>
          <FoilCheck
            label="ALL SETS"
            checked={checkedGens.size === GENS.length}
            indeterminate={checkedGens.size > 0 && checkedGens.size < GENS.length}
            onChange={(c) => toggleAllGens(c)}
          />
          <div style={{ height: 1, background: \u0060${FOIL.gold}30\u0060, margin: '12px 0' }} />
          {GENS.map((g, i) => (
            <FoilCheck
              key={i}
              label={g.label}
              sub={g.sub}
              checked={checkedGens.has(i)}
              onChange={(c) => toggleGen(i, c)}
            />
          ))}
        </div>

        {/* CENTER — the card */}
        <div style={{
          position: 'relative', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 18, gap: 14,
          background: \u0060radial-gradient(circle at center, ${FOIL.gold}10 0%, transparent 60%)\u0060,
        }}>
          <div style={{
            // The holographic card itself
            width: 280, padding: '10px 10px 18px',
            background: \u0060
              conic-gradient(from 210deg at 50% 50%,
                #f9efc8 0deg, #fbecc9 30deg, #f5dcb7 60deg, #ead2a2 90deg,
                #f9efc8 130deg, #fbecc9 180deg, #f5dcb7 220deg, #ead2a2 280deg,
                #f9efc8 360deg)
            \u0060,
            borderRadius: 12,
            boxShadow: \u0060
              0 0 0 2px ${FOIL.gold},
              0 0 0 4px ${FOIL.ink},
              0 0 0 5px ${FOIL.goldHi},
              0 12px 36px rgba(0,0,0,0.5),
              inset 0 0 0 1px ${FOIL.goldHi}
            \u0060,
            position: 'relative', zIndex: 1,
          }}>
            {/* card name strip */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: \u0060linear-gradient(90deg, ${FOIL.goldHi}, ${FOIL.gold})\u0060,
              padding: '6px 12px', borderRadius: 4,
              border: \u00601px solid ${FOIL.ink}\u0060,
              color: FOIL.ink, fontFamily: '"Anton", Impact, sans-serif',
              letterSpacing: 1,
            }}>
              <span style={{ fontSize: 14, textTransform: 'uppercase' }}>
                {current ? current.name.replace(/-/g, ' ') : '— — —'}
              </span>
              <span style={{ fontSize: 10 }}>{current ? \u0060#${String(current.id).padStart(3, '0')}\u0060 : ''}</span>
            </div>

            {/* art window */}
            <div style={{
              marginTop: 10, padding: 6,
              background: \u0060linear-gradient(180deg, #fff9e0, #f6e8b8)\u0060,
              border: \u00602px solid ${FOIL.gold}\u0060,
              boxShadow: \u0060inset 0 0 0 1px ${FOIL.ink}, inset 0 2px 8px ${FOIL.gold}30\u0060,
              borderRadius: 4,
              position: 'relative', overflow: 'hidden',
            }}>
              {/* holo shimmer */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: \u0060linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)\u0060,
                animation: 'foilShine 4s linear infinite',
                mixBlendMode: 'overlay',
              }} />
              <CreatureStage
                current={current}
                phase={phase}
                voteActive={voteActive}
                choice={choice}
                palette={FOIL}
                Capsule={FoilCapsule}
                pixelated
                spriteFilter="drop-shadow(0 4px 6px rgba(0,0,0,0.25))"
                height={170}
                spriteSize={140}
              />
            </div>

            {/* types + footer */}
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {current?.types.map(t => (
                  <span key={t} title={t} style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: typePalette[t] || '#888',
                    border: \u00602px solid ${FOIL.ink}\u0060,
                    boxShadow: \u0060inset 0 -2px 0 rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.4)\u0060,
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 8, color: FOIL.muted, fontStyle: 'italic', letterSpacing: 1 }}>
                ILLUS. SPRITE WORKS
              </div>
            </div>
          </div>

          {!current && !loading && (
            <div style={{ color: FOIL.muted, padding: 20 }}>Select a set to begin</div>
          )}

          {/* Vote buttons */}
          <div style={{ display: 'flex', gap: 12, width: 280, marginTop: 6 }}>
            <FoilButton onClick={() => vote('pass')} bg={FOIL.pass} disabled={!current || phase !== 'idle'}>Pass</FoilButton>
            <FoilButton onClick={() => vote('smash')} bg={FOIL.smash} disabled={!current || phase !== 'idle'}>Smash</FoilButton>
          </div>
          <button onClick={skip} style={{
            background: 'transparent', border: \u00601px solid ${FOIL.gold}55\u0060,
            color: FOIL.muted, padding: '5px 16px', borderRadius: 99, cursor: 'pointer',
            fontSize: 11, letterSpacing: 1,
          }}>Skip →</button>
        </div>

        {/* RIGHT */}
        <div style={{ borderLeft: \u00601px solid ${FOIL.gold}30\u0060, padding: '20px 16px', overflow: 'auto' }}>
          <FoilHeading>MOST SMASHED</FoilHeading>
          <Leaderboard mode="smash" votes={globalVotes} palette={{...FOIL, smash: FOIL.smash, muted: FOIL.muted, border: FOIL.gold }} />
          <div style={{ height: 12 }} />
          <FoilHeading>MOST PASSED</FoilHeading>
          <Leaderboard mode="pass" votes={globalVotes} palette={{...FOIL, pass: FOIL.pass, muted: FOIL.muted, border: FOIL.gold }} />
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        padding: '10px 22px', display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        borderTop: \u00601px solid ${FOIL.gold}40\u0060, fontSize: 11, letterSpacing: 1, color: FOIL.muted,
      }}>
        <span style={{ color: FOIL.smash }}>SMASHED · {sSmash}</span>
        <span style={{ color: FOIL.surface }}>SEEN · {sSeen}</span>
        <span style={{ color: FOIL.pass }}>PASSED · {sPass}</span>
      </div>

      <style>{\u0060
        @keyframes foilShine { from { transform: translateX(-80%); } to { transform: translateX(80%); } }
      \u0060}</style>
    </div>
  );
}

function FoilHeading({ children }) {
  return <div style={{
    fontFamily: '"Anton", Impact, sans-serif', fontSize: 13, letterSpacing: 2,
    color: FOIL.gold, marginBottom: 12,
  }}>{children}</div>;
}

function FoilStat({ label, val, accent }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontFamily: '"Anton", Impact, sans-serif', fontSize: 22, color: accent,
        lineHeight: 1, letterSpacing: 1,
      }}>{val.toLocaleString()}</div>
      <div style={{ fontSize: 9, color: FOIL.muted, letterSpacing: 2, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function FoilCheck({ label, sub, checked, indeterminate, onChange }) {
  const ref = React.useRef();
  React.useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label style={{ display: 'block', cursor: 'pointer', marginBottom: 10, userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{
          width: 16, height: 16, borderRadius: 3,
          background: checked ? FOIL.gold : 'transparent',
          border: \u00601.5px solid ${FOIL.gold}\u0060,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {checked && !indeterminate && <span style={{ color: FOIL.ink, fontSize: 11, fontWeight: 900 }}>✓</span>}
          {indeterminate && <span style={{ width: 8, height: 2, background: FOIL.ink }} />}
        </span>
        <input type="checkbox" ref={ref} checked={checked} onChange={(e) => onChange(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
        <span style={{ fontSize: 12, color: FOIL.surface, fontWeight: 500 }}>{label}</span>
      </div>
      {sub && <div style={{ fontSize: 10, color: FOIL.muted, marginLeft: 25, marginTop: 2 }}>{sub}</div>}
    </label>
  );
}

function FoilButton({ children, onClick, disabled, bg }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, padding: '12px 0',
      fontFamily: '"Anton", Impact, sans-serif',
      fontSize: 18, letterSpacing: 2, textTransform: 'uppercase',
      color: '#fff',
      background: \u0060linear-gradient(180deg, ${bg} 0%, ${bg} 50%, ${bg}cc 100%)\u0060,
      border: \u00601px solid ${FOIL.ink}\u0060,
      borderRadius: 8,
      boxShadow: \u0060inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.25), 0 4px 0 ${FOIL.ink}, 0 6px 14px rgba(0,0,0,0.4)\u0060,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'transform .08s, box-shadow .08s',
    }}
    onMouseDown={e => { if (disabled) return; e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = \u0060inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.25), 0 1px 0 ${FOIL.ink}, 0 2px 6px rgba(0,0,0,0.4)\u0060; }}
    onMouseUp={e => { if (disabled) return; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = \u0060inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.25), 0 4px 0 ${FOIL.ink}, 0 6px 14px rgba(0,0,0,0.4)\u0060; }}
    onMouseLeave={e => { if (disabled) return; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = \u0060inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.25), 0 4px 0 ${FOIL.ink}, 0 6px 14px rgba(0,0,0,0.4)\u0060; }}
    >{children}</button>
  );
}

// Foil-themed "Energy Orb" capsule — not a sphere; a faceted crystal-cut
// gem with rotating gradient. Holographic vibe, no trademarked shape.
function FoilCapsule({ phase }) {
  const open = phase === 'flash';
  const wobbling = phase === 'wobble';
  const dropping = phase === 'drop';
  return (
    <div style={{
      width: 80, height: 80, position: 'relative',
      animation:
        dropping ? 'sopDrop 220ms cubic-bezier(.5,1.5,.5,1) forwards' :
        wobbling ? 'sopWobble 680ms ease-in-out' :
        'none',
    }}>
      <svg viewBox="0 0 80 80" width="80" height="80" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="foilOrbTop" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f3d27a" />
            <stop offset="100%" stopColor="#c8a14c" />
          </linearGradient>
          <linearGradient id="foilOrbBot" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#fbf6e7" />
            <stop offset="100%" stopColor="#e3d5a7" />
          </linearGradient>
        </defs>
        {/* Top half (hexagon-cut) */}
        <g style={{ transformOrigin: '40px 40px', animation: open ? 'sopCapsuleOpenTop 220ms ease-out forwards' : 'none' }}>
          <polygon points="20,40 28,16 52,16 60,40" fill="url(#foilOrbTop)" stroke="#23202b" strokeWidth="2" />
          <polygon points="28,16 52,16 46,22 34,22" fill="rgba(255,255,255,0.4)" />
        </g>
        {/* Bottom half */}
        <g style={{ transformOrigin: '40px 40px', animation: open ? 'sopCapsuleOpenBot 220ms ease-out forwards' : 'none' }}>
          <polygon points="20,40 60,40 52,64 28,64" fill="url(#foilOrbBot)" stroke="#23202b" strokeWidth="2" />
          <polygon points="28,64 52,64 46,58 34,58" fill="rgba(0,0,0,0.1)" />
        </g>
        {/* Center gem */}
        <circle cx="40" cy="40" r="6" fill="#23202b" stroke="#c8a14c" strokeWidth="2" />
        <circle cx="38" cy="38" r="2" fill="#f3d27a" />
      </svg>
    </div>
  );
}

function FoilDiamond() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <polygon points="14,2 26,14 14,26 2,14" fill="none" stroke={FOIL.gold} strokeWidth="2" />
      <polygon points="14,7 21,14 14,21 7,14" fill={FOIL.goldHi} />
      <polygon points="14,7 21,14 14,14" fill={FOIL.gold} />
    </svg>
  );
}

window.FoilTheme = FoilTheme;


// ===== js/theme-dex.jsx =====
// THEME 3 — DEX OS
// Modern device chrome: white/red plastic, digital readouts, clean sans-serif.
// Original UI — not a recreation of any official Pokédex UI.

const DEX = {
  red:        '#d62828',
  redDeep:    '#a01d1d',
  redHi:      '#f25d5d',
  surface:    '#f6f3ee',
  surface2:   '#e8e3da',
  panel:      '#1a1a1f',
  panelHi:    '#2a2a32',
  screen:     '#0b1018',
  screenInk:  '#7fffd4',     // mint-cyan digital readout
  screenDim:  '#3a6a5a',
  text:       '#1a1a1f',
  muted:      '#6c6864',
  smash:      '#22c55e',
  pass:       '#ef4444',
  border:     '#c9c2b6',
};

function DexTheme() {
  const s = useSOP();
  const { current, loading, sSmash, sPass, sSeen, globalVotes, checkedGens } = s;
  const { phase } = useEntryPhase(current?.id);
  const { active: voteActive, choice } = useVoteAnim();

  const gSmash = Object.values(globalVotes).reduce((a, v) => a + v.smash, 0);
  const gPass = Object.values(globalVotes).reduce((a, v) => a + v.pass, 0);

  const typePalette = {
    fire: '#ef6c4a', water: '#3aa1d3', grass: '#5fb35d', electric: '#e9c531',
    psychic: '#d75aa4', ice: '#7ad3d7', dragon: '#7866b8', dark: '#3d3540',
    fairy: '#e3a7c8', normal: '#9d9582', fighting: '#b85c3a', flying: '#8aaee8',
    poison: '#9b59c1', ground: '#c9a05c', rock: '#998264', bug: '#8ab148',
    ghost: '#6a5a93', steel: '#8a96a3',
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: DEX.surface,
      color: DEX.text, fontFamily: '"Inter", system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* HEADER bar */}
      <div style={{
        background: \u0060linear-gradient(180deg, ${DEX.red} 0%, ${DEX.redDeep} 100%)\u0060,
        color: '#fff', padding: '14px 22px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: \u0060inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)\u0060,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <DexLogo />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1 }}>RATEDEX</div>
            <div style={{ fontSize: 10, color: '#ffd9d9', letterSpacing: 2, marginTop: 1 }}>
              FIELD UNIT 03 · TELEMETRY LIVE
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <DexLED color="#22c55e" pulse />
          <DexLED color="#facc15" pulse />
          <DexLED color="#3b82f6" pulse />
        </div>
        <div style={{ display: 'flex', gap: 22 }}>
          <DexCount label="GLOBAL · SMASH" val={gSmash} color="#86efac" />
          <DexCount label="GLOBAL · PASS" val={gPass} color="#fca5a5" />
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '200px 1fr 220px', overflow: 'hidden' }}>
        {/* LEFT */}
        <div style={{
          background: DEX.surface2, padding: 18, overflow: 'auto',
          borderRight: \u00601px solid ${DEX.border}\u0060,
        }}>
          <DexLabel>REGION FILTER</DexLabel>
          <DexCheck
            label="All regions"
            checked={checkedGens.size === GENS.length}
            indeterminate={checkedGens.size > 0 && checkedGens.size < GENS.length}
            onChange={(c) => toggleAllGens(c)}
            bold
          />
          <div style={{ height: 1, background: DEX.border, margin: '12px 0' }} />
          {GENS.map((g, i) => (
            <DexCheck
              key={i}
              label={g.label}
              sub={g.sub}
              checked={checkedGens.has(i)}
              onChange={(c) => toggleGen(i, c)}
            />
          ))}
        </div>

        {/* CENTER — the device screen */}
        <div style={{
          position: 'relative', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '20px 22px', gap: 16,
        }}>
          {/* main "screen" */}
          <div style={{
            width: 320,
            background: DEX.panel,
            borderRadius: 18,
            padding: 10,
            boxShadow: \u00600 1px 0 rgba(255,255,255,0.6), 0 12px 28px rgba(0,0,0,0.18), inset 0 0 0 1px ${DEX.panelHi}\u0060,
            position: 'relative',
          }}>
            {/* screen bezel reflection corners */}
            <div style={{
              position: 'absolute', top: 6, left: 14, width: 8, height: 8,
              borderRadius: '50%', background: '#22c55e',
              boxShadow: \u00600 0 8px #22c55e, inset 0 0 2px rgba(0,0,0,0.3)\u0060,
            }} />
            <div style={{
              position: 'absolute', top: 6, left: 30, width: 6, height: 6,
              borderRadius: '50%', background: '#facc15',
              boxShadow: \u00600 0 6px #facc15\u0060,
            }} />

            {/* inner screen */}
            <div style={{
              background: \u0060linear-gradient(180deg, ${DEX.screen} 0%, #050a12 100%)\u0060,
              borderRadius: 12,
              padding: '14px 14px 18px',
              boxShadow: \u0060inset 0 0 0 1px #000, inset 0 0 28px rgba(0,255,200,0.08)\u0060,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* scanlines */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: \u0060repeating-linear-gradient(0deg, rgba(255,255,255,0) 0 2px, rgba(255,255,255,0.025) 2px 3px)\u0060,
              }} />
              {/* top readout */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 10, color: DEX.screenInk, letterSpacing: 1.5,
              }}>
                <span>► ENC {current ? \u0060#${String(current.id).padStart(4, '0')}\u0060 : '----'}</span>
                <span style={{ color: DEX.screenDim }}>SCAN {String(sSeen).padStart(3, '0')}</span>
              </div>

              <div style={{ marginTop: 6, height: 1, background: \u0060${DEX.screenInk}30\u0060 }} />

              <CreatureStage
                current={current}
                phase={phase}
                voteActive={voteActive}
                choice={choice}
                palette={DEX}
                Capsule={DexCapsule}
                pixelated
                spriteFilter="drop-shadow(0 0 14px rgba(127,255,212,0.35))"
                height={160}
                spriteSize={140}
              />

              {/* readout bottom */}
              <div style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                color: DEX.screenInk, fontSize: 13, letterSpacing: 1.5,
                textTransform: 'uppercase', textAlign: 'center', minHeight: 18,
              }}>
                {current && (phase === 'idle' || phase === 'reveal') ? current.name.replace(/-/g, ' ') : (loading ? 'SCANNING…' : '')}
              </div>

              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 6 }}>
                {current?.types.map(t => (
                  <span key={t} style={{
                    fontSize: 9,
                    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                    padding: '3px 9px', borderRadius: 99,
                    background: \u0060${typePalette[t] || '#888'}25\u0060,
                    border: \u00601px solid ${typePalette[t] || '#888'}\u0060,
                    color: typePalette[t] || '#888',
                    letterSpacing: 1,
                  }}>{t.toUpperCase()}</span>
                ))}
              </div>

              {/* faux stat bars */}
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {['HP', 'ATK', 'DEF'].map((k, i) => (
                  <div key={k} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                    fontSize: 9, color: DEX.screenDim, letterSpacing: 1,
                  }}>
                    <span style={{ width: 22, color: DEX.screenInk }}>{k}</span>
                    <div style={{ flex: 1, height: 4, background: \u0060${DEX.screenInk}15\u0060, borderRadius: 1 }}>
                      <div style={{
                        height: '100%', width: current ? \u0060${30 + ((current.id * (i+3)) % 70)}%\u0060 : '0%',
                        background: DEX.screenInk, borderRadius: 1, transition: 'width .35s',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom device chrome */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 6px 4px',
            }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <div style={{ width: 16, height: 4, background: '#444', borderRadius: 1 }} />
                <div style={{ width: 16, height: 4, background: '#444', borderRadius: 1 }} />
                <div style={{ width: 16, height: 4, background: '#444', borderRadius: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#444' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#444' }} />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12, width: 320, marginTop: 4 }}>
            <DexButton onClick={() => vote('pass')} disabled={!current || phase !== 'idle'} variant="pass">
              <span style={{ fontSize: 11, letterSpacing: 2, opacity: 0.85, display: 'block' }}>L · ABANDON</span>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>PASS</span>
            </DexButton>
            <DexButton onClick={() => vote('smash')} disabled={!current || phase !== 'idle'} variant="smash">
              <span style={{ fontSize: 11, letterSpacing: 2, opacity: 0.85, display: 'block' }}>R · CAPTURE</span>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>SMASH</span>
            </DexButton>
          </div>
          <button onClick={skip} style={{
            background: 'transparent', border: \u00601px solid ${DEX.border}\u0060,
            color: DEX.muted, padding: '6px 18px', borderRadius: 99, cursor: 'pointer',
            fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
          }}>↪ Skip</button>
        </div>

        {/* RIGHT */}
        <div style={{
          background: DEX.surface2, padding: 18, overflow: 'auto',
          borderLeft: \u00601px solid ${DEX.border}\u0060,
        }}>
          <DexLabel>TOP SMASH</DexLabel>
          <Leaderboard mode="smash" votes={globalVotes} palette={{ ...DEX, smash: DEX.smash, muted: DEX.muted, ink: DEX.muted }} />
          <div style={{ height: 16 }} />
          <DexLabel>TOP PASS</DexLabel>
          <Leaderboard mode="pass" votes={globalVotes} palette={{ ...DEX, pass: DEX.pass, muted: DEX.muted, ink: DEX.muted }} />
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        background: DEX.panel, color: '#fff', padding: '8px 22px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 11, letterSpacing: 2,
      }}>
        <span>SESS</span>
        <span style={{ color: DEX.smash }}>SMASH · {String(sSmash).padStart(3, '0')}</span>
        <span style={{ color: '#aaa' }}>SEEN · {String(sSeen).padStart(3, '0')}</span>
        <span style={{ color: DEX.pass }}>PASS · {String(sPass).padStart(3, '0')}</span>
      </div>
    </div>
  );
}

function DexLabel({ children }) {
  return <div style={{
    fontSize: 10, letterSpacing: 2, color: DEX.muted, fontWeight: 700,
    marginBottom: 10, textTransform: 'uppercase',
  }}>{children}</div>;
}

function DexCount({ label, val, color }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 18, color, fontWeight: 700, lineHeight: 1,
      }}>{val.toLocaleString()}</div>
      <div style={{ fontSize: 9, color: '#ffd9d9', letterSpacing: 1.5, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function DexLED({ color, pulse }) {
  return <div style={{
    width: 10, height: 10, borderRadius: '50%',
    background: color,
    boxShadow: \u00600 0 6px ${color}, inset 0 0 2px rgba(0,0,0,0.3)\u0060,
    animation: pulse ? 'dexPulse 1.8s ease-in-out infinite' : 'none',
  }} />;
}

function DexCheck({ label, sub, checked, indeterminate, onChange, bold }) {
  const ref = React.useRef();
  React.useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label style={{ display: 'block', cursor: 'pointer', marginBottom: 9, userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{
          width: 18, height: 18, borderRadius: 4,
          background: checked ? DEX.red : '#fff',
          border: \u00601.5px solid ${checked ? DEX.red : DEX.border}\u0060,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all .15s',
        }}>
          {checked && !indeterminate && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
          {indeterminate && <span style={{ width: 8, height: 2, background: '#fff' }} />}
        </span>
        <input type="checkbox" ref={ref} checked={checked} onChange={(e) => onChange(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
        <span style={{ fontSize: 12, color: DEX.text, fontWeight: bold ? 700 : 500 }}>{label}</span>
      </div>
      {sub && <div style={{ fontSize: 10, color: DEX.muted, marginLeft: 27, marginTop: 2 }}>{sub}</div>}
    </label>
  );
}

function DexButton({ children, onClick, disabled, variant }) {
  const color = variant === 'smash' ? DEX.smash : DEX.pass;
  const colorDark = variant === 'smash' ? '#16a34a' : '#b91c1c';
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, padding: '10px 0',
      color: '#fff',
      background: \u0060linear-gradient(180deg, ${color} 0%, ${colorDark} 100%)\u0060,
      border: 'none',
      borderRadius: 12,
      boxShadow: \u0060inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 4px 0 ${colorDark}, 0 6px 14px rgba(0,0,0,0.2)\u0060,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'transform .08s, box-shadow .08s',
      fontFamily: 'inherit',
    }}
    onMouseDown={e => { if (disabled) return; e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = \u0060inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 1px 0 ${colorDark}, 0 2px 6px rgba(0,0,0,0.2)\u0060; }}
    onMouseUp={e => { if (disabled) return; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = \u0060inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 4px 0 ${colorDark}, 0 6px 14px rgba(0,0,0,0.2)\u0060; }}
    onMouseLeave={e => { if (disabled) return; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = \u0060inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 4px 0 ${colorDark}, 0 6px 14px rgba(0,0,0,0.2)\u0060; }}
    >{children}</button>
  );
}

function DexLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <rect x="2" y="2" width="32" height="32" rx="8" fill="#fff" />
      <rect x="6" y="6" width="24" height="14" rx="3" fill={DEX.screen} />
      <circle cx="12" cy="13" r="2.5" fill={DEX.screenInk} />
      <circle cx="20" cy="13" r="2.5" fill={DEX.screenInk} opacity="0.5" />
      <rect x="6" y="24" width="24" height="6" rx="2" fill={DEX.panel} />
      <circle cx="10" cy="27" r="1.5" fill="#facc15" />
      <circle cx="14" cy="27" r="1.5" fill="#22c55e" />
      <circle cx="18" cy="27" r="1.5" fill="#3b82f6" />
    </svg>
  );
}

// Dex-themed "containment capsule" — chrome casing with a glowing seam.
// Slick / industrial, not a sphere split horizontally.
function DexCapsule({ phase }) {
  const open = phase === 'flash';
  const wobbling = phase === 'wobble';
  const dropping = phase === 'drop';
  return (
    <div style={{
      width: 80, height: 80, position: 'relative',
      animation:
        dropping ? 'sopDrop 220ms cubic-bezier(.4,1.4,.5,1) forwards' :
        wobbling ? 'sopWobble 680ms ease-in-out' :
        'none',
    }}>
      <svg viewBox="0 0 80 80" width="80" height="80" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="dexChrome" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="50%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
        </defs>
        {/* Top half — chrome */}
        <g style={{ transformOrigin: '40px 40px', animation: open ? 'sopCapsuleOpenTop 220ms ease-out forwards' : 'none' }}>
          <path d="M14 40 Q14 14 40 14 Q66 14 66 40 Z" fill="url(#dexChrome)" stroke="#1a1a1f" strokeWidth="2" />
          <path d="M22 30 Q26 22 38 20" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
        </g>
        {/* Bottom half — red device */}
        <g style={{ transformOrigin: '40px 40px', animation: open ? 'sopCapsuleOpenBot 220ms ease-out forwards' : 'none' }}>
          <path d="M14 40 Q14 66 40 66 Q66 66 66 40 Z" fill={DEX.red} stroke="#1a1a1f" strokeWidth="2" />
          <path d="M22 50 Q26 58 38 60" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
        </g>
        {/* Glowing seam */}
        <line x1="12" y1="40" x2="68" y2="40" stroke="#7fffd4" strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 4px #7fffd4)' }} />
        {/* Center button */}
        <circle cx="40" cy="40" r="7" fill="#1a1a1f" stroke={DEX.screenInk} strokeWidth="1.5" />
        <circle cx="40" cy="40" r="3" fill={DEX.screenInk}
          style={{ filter: 'drop-shadow(0 0 4px #7fffd4)' }} />
      </svg>
    </div>
  );
}

// Pulse keyframe (one-time)
if (!document.getElementById('dex-anim-styles')) {
  const s = document.createElement('style');
  s.id = 'dex-anim-styles';
  s.textContent = \u0060
    @keyframes dexPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%      { opacity: 0.5; transform: scale(0.85); }
    }
  \u0060;
  document.head.appendChild(s);
}

window.DexTheme = DexTheme;


// ===== js/theme-switcher.jsx =====
// Floating theme switcher — sits in the bottom-right.
// Cycles between the 3 themes; persists selection to localStorage.

const THEMES = [
  { id: 'foil',      label: 'Foil',       sub: 'Holographic trading card',
    swatch: 'linear-gradient(135deg, #f3d27a 0%, #c8a14c 50%, #f3d27a 100%)' },
  { id: 'cartridge', label: 'Cartridge 88', sub: 'Game Boy DMG',
    swatch: 'linear-gradient(135deg, #9bbc0f 0%, #306230 100%)' },
  { id: 'dex',       label: 'Dex OS',     sub: 'Modern device',
    swatch: 'linear-gradient(135deg, #f25d5d 0%, #a01d1d 100%)' },
];

function ThemeSwitcher({ current, onChange }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{
      position: 'fixed', right: 16, bottom: 16, zIndex: 9999,
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      {open && (
        <div style={{
          position: 'absolute', right: 0, bottom: 'calc(100% + 8px)',
          background: '#fff',
          borderRadius: 14, padding: 8, minWidth: 240,
          boxShadow: '0 10px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#6b7280',
            padding: '8px 10px 4px', textTransform: 'uppercase',
          }}>Theme</div>
          {THEMES.map(t => (
            <button key={t.id}
              onClick={() => { onChange(t.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '10px',
                background: current === t.id ? 'rgba(99,102,241,0.07)' : 'transparent',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                color: '#111827', textAlign: 'left',
                transition: 'background .12s',
              }}
              onMouseEnter={e => { if (current !== t.id) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { if (current !== t.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: t.swatch,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
                flexShrink: 0,
              }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{t.sub}</div>
              </span>
              {current === t.id && <span style={{ color: '#6366f1', fontSize: 16, fontWeight: 700 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        title="Switch theme"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff',
          padding: '8px 12px 8px 8px',
          border: 'none', borderRadius: 99, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08)',
          fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#111827',
        }}
      >
        <span style={{
          width: 24, height: 24, borderRadius: '50%',
          background: THEMES.find(t => t.id === current)?.swatch,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
        }} />
        <span>{THEMES.find(t => t.id === current)?.label}</span>
        <span style={{ color: '#9ca3af', fontSize: 10, marginLeft: 2 }}>▼</span>
      </button>
    </div>
  );
}

window.ThemeSwitcher = ThemeSwitcher;
window.THEMES = THEMES;




// ===== App entry =====
const STORAGE_KEY = 'sop_theme';

function App() {
  const [theme, setTheme] = React.useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && ['foil', 'cartridge', 'dex'].includes(saved)) return saved;
    } catch (e) {}
    return 'foil';
  });

  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
  }, [theme]);

  const ThemeComponent = {
    foil: FoilTheme,
    cartridge: CartridgeTheme,
    dex: DexTheme,
  }[theme];

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ThemeComponent />
      <ThemeSwitcher current={theme} onChange={setTheme} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>

```

---

## Appendix B · Modular sources (Path B)

### `public/js/shared.jsx`

```jsx
// Shared state, PokeAPI access, audio hooks. All 3 themes consume the same store
// so the same Pokémon appears in every theme — and voting in one triggers
// animations in all three. Great for comparison.

const GENS = [
  { label: 'Gen 1 · Kanto',   range: [1, 151],   sub: '#001–151' },
  { label: 'Gen 2 · Johto',   range: [152, 251], sub: '#152–251' },
  { label: 'Gen 3 · Hoenn',   range: [252, 386], sub: '#252–386' },
  { label: 'Gen 4 · Sinnoh',  range: [387, 493], sub: '#387–493' },
  { label: 'Gen 5 · Unova',   range: [494, 649], sub: '#494–649' },
  { label: 'Gen 6 · Kalos',   range: [650, 721], sub: '#650–721' },
  { label: 'Gen 7 · Alola',   range: [722, 809], sub: '#722–809' },
  { label: 'Gen 8 · Galar',   range: [810, 905], sub: '#810–905' },
  { label: 'Gen 9 · Paldea',  range: [906, 1025],sub: '#906–1025' },
];

// Audio hook system — by default silent. The user can drop their own files in
// later by setting window.SOP_AUDIO = { entry: 'url', smash: 'url', pass: 'url', skip: 'url' }
// either before page load or anytime at runtime. Each event is fire-and-forget.
window.SOP_AUDIO = window.SOP_AUDIO || {};
function playSfx(key) {
  const url = window.SOP_AUDIO?.[key];
  if (!url) return;
  try {
    const a = new Audio(url);
    a.volume = 0.6;
    a.play().catch(() => {});
  } catch (e) { /* noop */ }
}

// PokeAPI access. Pulls full details once, sprites direct from PokeAPI CDN.
const pokeCache = {};
async function fetchPoke(id) {
  if (pokeCache[id]) return pokeCache[id];
  try {
    const r = await fetch(\u0060https://pokeapi.co/api/v2/pokemon/${id}\u0060);
    const d = await r.json();
    pokeCache[id] = {
      id,
      name: d.name,
      sprite: \u0060https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png\u0060,
      types: d.types.map(t => t.type.name),
    };
    return pokeCache[id];
  } catch (e) {
    return { id, name: \u0060pokemon-${id}\u0060, sprite: '', types: [] };
  }
}

// Simple store with React-style external listener — used so all 3 themes
// re-render off the same source of truth.
function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    set: (patch) => {
      state = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
      subs.forEach(fn => fn(state));
    },
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
  };
}

const SOPStore = createStore({
  // Generations filter
  checkedGens: new Set(GENS.map((_, i) => i)),
  // Current encounter
  current: null,         // { id, name, sprite, types } | null
  loading: true,
  // Vote event — themes subscribe to \u0060voteSeq\u0060 to trigger their faint/level-up animation
  voteEvent: null,       // { id, choice, ts } | null
  voteSeq: 0,
  // Session stats
  sSmash: 0,
  sPass: 0,
  sSeen: 0,
  // Global tally (loaded from server)
  globalVotes: {},
  // Skip event
  skipSeq: 0,
});

function getPool() {
  const { checkedGens } = SOPStore.get();
  const pool = [];
  checkedGens.forEach(i => {
    const [lo, hi] = GENS[i].range;
    for (let id = lo; id <= hi; id++) pool.push(id);
  });
  return pool;
}

let advancing = false;
async function advance() {
  if (advancing) return;
  advancing = true;
  const pool = getPool();
  if (pool.length === 0) {
    SOPStore.set({ current: null, loading: false });
    advancing = false;
    return;
  }
  const id = pool[Math.floor(Math.random() * pool.length)];
  SOPStore.set({ loading: true });
  const poke = await fetchPoke(id);
  SOPStore.set({ current: poke, loading: false });
  advancing = false;
}

function toggleGen(i, checked) {
  const s = SOPStore.get();
  const next = new Set(s.checkedGens);
  if (checked) next.add(i); else next.delete(i);
  SOPStore.set({ checkedGens: next });
}

function toggleAllGens(checked) {
  SOPStore.set({ checkedGens: checked ? new Set(GENS.map((_, i) => i)) : new Set() });
}

function vote(choice) {
  const s = SOPStore.get();
  if (!s.current) return;
  const id = s.current.id;
  const patch = {
    voteEvent: { id, choice, ts: Date.now() },
    voteSeq: s.voteSeq + 1,
    sSeen: s.sSeen + 1,
  };
  if (choice === 'smash') patch.sSmash = s.sSmash + 1;
  if (choice === 'pass') patch.sPass = s.sPass + 1;
  // Update global tally optimistically
  const gv = { ...s.globalVotes };
  if (!gv[id]) gv[id] = { smash: 0, pass: 0, name: s.current.name, sprite: s.current.sprite };
  gv[id] = { ...gv[id], [choice]: gv[id][choice] + 1, name: s.current.name, sprite: s.current.sprite };
  patch.globalVotes = gv;
  SOPStore.set(patch);

  playSfx(choice);

  // POST to server (silently fails in static mode)
  fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, choice, name: s.current.name, sprite: s.current.sprite }),
  }).catch(() => {});

  // Schedule next pokemon after the longest animation window
  setTimeout(() => advance(), 1300);
}

function skip() {
  const s = SOPStore.get();
  SOPStore.set({ skipSeq: s.skipSeq + 1 });
  playSfx('skip');
  advance();
}

async function loadGlobalVotes() {
  try {
    const r = await fetch('/api/votes');
    if (r.ok) {
      const data = await r.json();
      SOPStore.set({ globalVotes: data });
    }
  } catch (e) {}
}

// React hook
function useSOP() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => SOPStore.subscribe(force), []);
  return SOPStore.get();
}

// Watch generation filter changes: rebuild pool and advance if current is null
// or out of pool. Triggered from the store subscription itself.
let lastGenSig = '';
SOPStore.subscribe((s) => {
  const sig = [...s.checkedGens].sort().join(',');
  if (sig !== lastGenSig) {
    lastGenSig = sig;
    const pool = getPool();
    if (pool.length > 0 && !s.current && !s.loading) advance();
  }
});

// Boot: load global tally, kick off the first encounter.
loadGlobalVotes();
advance();

// Export to global window
Object.assign(window, {
  GENS, useSOP, SOPStore, vote, skip, toggleGen, toggleAllGens, playSfx, fetchPoke,
});

```

### `public/js/effects.jsx`

```jsx
// Animation primitives: entry phase state machine + sparkle/star particle systems.
// Each theme provides its own Capsule visual but consumes the same phase timing.

const ENTRY_TIMINGS = {
  drop:    [0,    220],   // capsule drops in from above
  wobble:  [220,  900],   // capsule shakes left/right 3x
  flash:   [900,  1100],  // white flash as capsule opens
  reveal:  [1100, 1500],  // creature scales in, halves fly apart
  // idle: 1500+
};
const ENTRY_TOTAL = 1500;

// Vote animation duration
const VOTE_DURATION = 1300;

/**
 * useEntryPhase — returns the current phase + elapsed ms whenever a new
 * Pokémon arrives (currentId changes). Phase is one of:
 * 'drop' | 'wobble' | 'flash' | 'reveal' | 'idle'.
 */
function useEntryPhase(currentId) {
  const [phase, setPhase] = React.useState('idle');
  const [seq, setSeq] = React.useState(0);

  React.useEffect(() => {
    if (currentId == null) { setPhase('idle'); return; }
    setSeq(s => s + 1);
    setPhase('drop');
    const timers = [
      setTimeout(() => setPhase('wobble'), ENTRY_TIMINGS.wobble[0]),
      setTimeout(() => setPhase('flash'),  ENTRY_TIMINGS.flash[0]),
      setTimeout(() => setPhase('reveal'), ENTRY_TIMINGS.reveal[0]),
      setTimeout(() => setPhase('idle'),   ENTRY_TOTAL),
    ];
    // Hook for sound: capsule shake & open
    playSfx('entry');
    return () => timers.forEach(clearTimeout);
  }, [currentId]);

  return { phase, seq };
}

/**
 * useVoteAnim — observes voteSeq from the store and returns the current vote
 * animation state: { choice, active, ts } | { active: false }.
 */
function useVoteAnim() {
  const { voteEvent, voteSeq } = useSOP();
  const [active, setActive] = React.useState(false);
  const [choice, setChoice] = React.useState(null);

  React.useEffect(() => {
    if (!voteEvent) return;
    setActive(true);
    setChoice(voteEvent.choice);
    const t = setTimeout(() => setActive(false), VOTE_DURATION);
    return () => clearTimeout(t);
  }, [voteSeq]);

  return { active, choice };
}

/**
 * SparkleBurst — gold sparkle particles rising up after a smash.
 * Self-contained, no styles needed beyond what's inlined. Renders ~16 particles.
 */
function SparkleBurst({ active }) {
  const particles = React.useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 80,        // % across
      delay: Math.random() * 200,
      duration: 700 + Math.random() * 500,
      size: 6 + Math.random() * 8,
      hue: 45 + Math.random() * 15,
    }));
  }, [active]);

  if (!active) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 8,
    }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: \u0060${p.x}%\u0060,
          bottom: '20%',
          width: p.size,
          height: p.size,
          background: \u0060oklch(0.85 0.18 ${p.hue})\u0060,
          boxShadow: \u00600 0 ${p.size}px oklch(0.85 0.2 ${p.hue})\u0060,
          transform: 'rotate(45deg)',
          animation: \u0060sopSparkle ${p.duration}ms ease-out ${p.delay}ms forwards\u0060,
          opacity: 0,
        }} />
      ))}
    </div>
  );
}

/**
 * LevelUpFlash — quick white-to-gold flash + arrow-up text.
 */
function LevelUpFlash({ active, color = '#facc15' }) {
  if (!active) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7,
      animation: 'sopFlash 280ms ease-out',
      background: \u0060radial-gradient(circle at center, ${color}33 0%, transparent 60%)\u0060,
    }} />
  );
}

/**
 * FaintStars — cartoon stars orbiting after pass. 5-pointed dizzy stars.
 */
function FaintStars({ active }) {
  if (!active) return null;
  const stars = [0, 1, 2, 3, 4];
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ position: 'relative', width: 0, height: 0, animation: 'sopOrbit 1.1s linear' }}>
        {stars.map(i => (
          <div key={i} style={{
            position: 'absolute',
            transform: \u0060rotate(${i * 72}deg) translate(60px) rotate(${-i * 72}deg)\u0060,
          }}>
            <Star size={24} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Simple 5-pointed star glyph. */
function Star({ size = 18, color = '#fde047', stroke = '#854d0e' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
      <path d="M12 1.5l3 7.2 7.7.6-5.85 5 1.8 7.5L12 17.9 5.35 21.8l1.8-7.5L1.3 9.3 9 8.7z"
        fill={color} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

// Global keyframes injected once. Themes opt-in to their own variants.
if (!document.getElementById('sop-anim-styles')) {
  const s = document.createElement('style');
  s.id = 'sop-anim-styles';
  s.textContent = \u0060
    @keyframes sopSparkle {
      0%   { transform: translate(0, 0) rotate(45deg) scale(0.4); opacity: 0; }
      20%  { opacity: 1; }
      100% { transform: translate(0, -160px) rotate(225deg) scale(1.2); opacity: 0; }
    }
    @keyframes sopFlash {
      0%   { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes sopOrbit {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes sopDrop {
      from { transform: translateY(-260px) scale(0.7); }
      to   { transform: translateY(0) scale(1); }
    }
    @keyframes sopWobble {
      0%   { transform: translateY(0) rotate(0deg); }
      15%  { transform: translateY(-6px) rotate(-14deg); }
      30%  { transform: translateY(0)    rotate(0deg); }
      45%  { transform: translateY(-6px) rotate(14deg); }
      60%  { transform: translateY(0)    rotate(0deg); }
      75%  { transform: translateY(-6px) rotate(-12deg); }
      100% { transform: translateY(0)    rotate(0deg); }
    }
    @keyframes sopCapsuleOpenTop {
      0%   { transform: translateY(0) rotate(0); opacity: 1; }
      100% { transform: translateY(-100px) rotate(-30deg); opacity: 0; }
    }
    @keyframes sopCapsuleOpenBot {
      0%   { transform: translateY(0) rotate(0); opacity: 1; }
      100% { transform: translateY(80px) rotate(30deg); opacity: 0; }
    }
    @keyframes sopReveal {
      0%   { transform: scale(0); opacity: 0; }
      55%  { transform: scale(1.18); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes sopWhiteFlash {
      0%, 100% { opacity: 0; }
      50%      { opacity: 1; }
    }
    @keyframes sopSmashPulse {
      0%, 100% { transform: scale(1); filter: brightness(1); }
      40%      { transform: scale(1.15); filter: brightness(1.6) drop-shadow(0 0 12px gold); }
    }
    @keyframes sopFaintSpiral {
      0%   { transform: translateY(0) rotate(0deg) scale(1); filter: grayscale(0); }
      30%  { transform: translateY(-10px) rotate(360deg) scale(0.95); filter: grayscale(0.6); }
      100% { transform: translateY(160px) rotate(1440deg) scale(0.2); filter: grayscale(1) brightness(0.5); opacity: 0; }
    }
    @keyframes sopFloatIdle {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-6px); }
    }
  \u0060;
  document.head.appendChild(s);
}

Object.assign(window, {
  useEntryPhase, useVoteAnim, SparkleBurst, LevelUpFlash, FaintStars, Star,
  ENTRY_TIMINGS, ENTRY_TOTAL, VOTE_DURATION,
});

```

### `public/js/shared-components.jsx`

```jsx
// Shared components used across all 3 themes: the creature stage (handles
// entry/vote animations on top of theme-specific Capsule + sprite) and
// leaderboard list.

function CreatureStage({ current, phase, voteActive, choice, palette, Capsule, pixelated, height = 180, spriteSize = 150, spriteFilter = '' }) {
  const showCapsule = phase === 'drop' || phase === 'wobble' || phase === 'flash';
  const showCreature = phase === 'reveal' || phase === 'idle';

  // Vote animation overrides everything.
  let creatureAnim = '';
  let creatureFilter = '';
  let creatureStyle = {};
  if (voteActive && choice === 'smash') {
    creatureAnim = 'sopSmashPulse 600ms ease-out';
  } else if (voteActive && choice === 'pass') {
    creatureAnim = 'sopFaintSpiral 1100ms ease-in forwards';
  } else if (phase === 'reveal') {
    creatureAnim = 'sopReveal 380ms cubic-bezier(.4,1.6,.6,1) forwards';
  } else if (phase === 'idle') {
    creatureAnim = 'sopFloatIdle 2.4s ease-in-out infinite';
  }

  return (
    <div style={{
      position: 'relative', width: '100%', height,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {showCapsule && (
        <div style={{ position: 'absolute' }}>
          <Capsule phase={phase} />
        </div>
      )}
      {showCreature && current?.sprite && (
        <img
          key={\u0060${current.id}-${voteActive ? choice : 'idle'}\u0060}
          src={current.sprite}
          alt={current.name}
          style={{
            width: spriteSize, height: spriteSize,
            imageRendering: pixelated ? 'pixelated' : 'auto',
            filter: spriteFilter,
            animation: creatureAnim,
            ...creatureStyle,
          }}
        />
      )}
      {/* Flash overlay during phase transition + smash */}
      {(phase === 'flash' || (voteActive && choice === 'smash')) && (
        <div style={{
          position: 'absolute', inset: 0,
          background: voteActive ? 'radial-gradient(circle, gold 0%, transparent 70%)' : 'white',
          animation: 'sopWhiteFlash 280ms ease-out',
          pointerEvents: 'none',
        }} />
      )}
      <SparkleBurst active={voteActive && choice === 'smash'} />
      <FaintStars active={voteActive && choice === 'pass'} />
    </div>
  );
}

function Leaderboard({ mode, votes, palette, pixelated, max = 5 }) {
  const entries = Object.entries(votes)
    .map(([id, v]) => ({ id, ...v }))
    .filter(e => (e.smash + e.pass) > 0)
    .sort((a, b) => b[mode] - a[mode])
    .slice(0, max);

  if (entries.length === 0) {
    return <div style={{ fontSize: 9, color: palette.muted || palette.ink, padding: '14px 4px', opacity: 0.7 }}>
      No votes yet
    </div>;
  }

  const maxVal = entries[0][mode] || 1;
  const barColor = mode === 'smash' ? (palette.smash || palette.black) : (palette.pass || palette.ink);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {entries.map((e, i) => {
        const pct = Math.round((e[mode] / maxVal) * 100);
        return (
          <div key={e.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            paddingBottom: 6, borderBottom: \u00601px solid ${palette.border || palette.ink}33\u0060,
          }}>
            <div style={{
              width: 14, textAlign: 'center', fontSize: 10,
              color: i === 0 ? (palette.gold || '#f59e0b') : palette.muted || palette.ink,
              fontWeight: 700,
            }}>{i + 1}</div>
            <img src={e.sprite} alt={e.name} style={{
              width: 28, height: 28, imageRendering: pixelated ? 'pixelated' : 'auto', flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 9, textTransform: 'capitalize',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{e.name.replace(/-/g, ' ')}</div>
              <div style={{ height: 3, background: \u0060${palette.border || palette.ink}25\u0060, marginTop: 3, borderRadius: 1 }}>
                <div style={{ height: '100%', width: \u0060${pct}%\u0060, background: barColor, borderRadius: 1, transition: 'width .4s' }} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: barColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{e[mode]}</div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { CreatureStage, Leaderboard });

```

### `public/js/theme-cartridge.jsx`

```jsx
// THEME 1 — CARTRIDGE 88
// Game Boy DMG aesthetic: 4-tone green LCD, pixel font, chunky borders.

const DMG = {
  bg:    '#9bbc0f',  // LCD background (lightest)
  bg2:   '#8bac0f',  // mid-light
  ink:   '#306230',  // dark
  black: '#0f380f',  // darkest
  shell: '#7d8d3a',  // bezel
};

function CartridgeTheme() {
  const s = useSOP();
  const { current, loading, sSmash, sPass, sSeen, globalVotes, checkedGens } = s;
  const { phase } = useEntryPhase(current?.id);
  const { active: voteActive, choice } = useVoteAnim();

  const showCreature = phase === 'reveal' || phase === 'idle';
  const showCapsule = phase === 'drop' || phase === 'wobble' || phase === 'flash';

  const gSmash = Object.values(globalVotes).reduce((a, v) => a + v.smash, 0);
  const gPass = Object.values(globalVotes).reduce((a, v) => a + v.pass, 0);

  return (
    <div style={{
      width: '100%', height: '100%', background: DMG.bg, color: DMG.black,
      fontFamily: '"Press Start 2P", monospace', fontSize: 10, lineHeight: 1.6,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      imageRendering: 'pixelated',
    }}>
      {/* HEADER */}
      <div style={{
        background: DMG.ink, color: DMG.bg, padding: '14px 18px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: \u00604px solid ${DMG.black}\u0060,
      }}>
        <div>
          <div style={{ fontSize: 14, letterSpacing: 1 }}>POKé-RATE</div>
          <div style={{ fontSize: 8, color: DMG.bg2, marginTop: 6, letterSpacing: 1 }}>VER. 1988 · GLOBAL DATA</div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <CartCount label="SMASH" val={gSmash} />
          <CartCount label="PASS" val={gPass} />
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '180px 1fr 210px', overflow: 'hidden' }}>
        {/* LEFT */}
        <div style={{ borderRight: \u00604px solid ${DMG.black}\u0060, background: DMG.bg2, padding: 14, overflow: 'auto' }}>
          <div style={{ fontSize: 10, color: DMG.black, marginBottom: 12 }}>►GAMES</div>
          <CartCheckbox
            label="ALL"
            checked={checkedGens.size === GENS.length}
            indeterminate={checkedGens.size > 0 && checkedGens.size < GENS.length}
            onChange={(c) => toggleAllGens(c)}
          />
          <div style={{ height: 1, background: DMG.ink, margin: '10px 0', opacity: 0.35 }} />
          {GENS.map((g, i) => (
            <CartCheckbox
              key={i}
              label={g.label.replace('Gen ', 'G').replace(' · ', ' ').toUpperCase()}
              sub={g.sub}
              checked={checkedGens.has(i)}
              onChange={(c) => toggleGen(i, c)}
            />
          ))}
        </div>

        {/* CENTER */}
        <div style={{
          position: 'relative', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 18, gap: 16,
          background: \u0060repeating-linear-gradient(0deg, ${DMG.bg} 0 3px, ${DMG.bg2} 3px 4px)\u0060,
        }}>
          {/* Screen-frame bezel */}
          <div style={{
            position: 'absolute', inset: 12,
            border: \u00604px solid ${DMG.black}\u0060,
            boxShadow: \u0060inset 0 0 0 4px ${DMG.bg}, inset 0 0 0 8px ${DMG.ink}\u0060,
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1, width: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <CreatureStage
              current={current}
              phase={phase}
              voteActive={voteActive}
              choice={choice}
              palette={DMG}
              Capsule={DMGCapsule}
              pixelated
              spriteFilter="contrast(1.1) saturate(0) sepia(0.85) hue-rotate(40deg) brightness(0.85)"
            />
            {current && (phase === 'idle' || phase === 'reveal') && (
              <>
                <div style={{ fontSize: 8, color: DMG.ink, marginTop: -4 }}>NO. {String(current.id).padStart(3, '0')}</div>
                <div style={{ fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' }}>{current.name.replace(/-/g, ' ')}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {current.types.map(t => (
                    <span key={t} style={{
                      fontSize: 8, padding: '4px 8px',
                      background: DMG.ink, color: DMG.bg, letterSpacing: 1,
                      border: \u00602px solid ${DMG.black}\u0060,
                    }}>{t.toUpperCase()}</span>
                  ))}
                </div>
              </>
            )}

            {!current && !loading && (
              <div style={{ fontSize: 10, color: DMG.ink, textAlign: 'center', padding: 40 }}>
                SELECT A GAME ►
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <CartButton onClick={() => vote('pass')} bg={DMG.ink} disabled={!current || phase !== 'idle'}>► PASS</CartButton>
              <CartButton onClick={() => vote('smash')} bg={DMG.black} disabled={!current || phase !== 'idle'}>► SMASH</CartButton>
            </div>
            <button onClick={skip} style={{
              fontFamily: 'inherit', fontSize: 8, background: 'transparent',
              border: \u00602px solid ${DMG.ink}\u0060, color: DMG.ink, padding: '6px 14px',
              cursor: 'pointer', letterSpacing: 1,
            }}>SKIP ▷</button>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ borderLeft: \u00604px solid ${DMG.black}\u0060, background: DMG.bg2, padding: 14, overflow: 'auto' }}>
          <div style={{ fontSize: 10, marginBottom: 12 }}>►TOP RATED</div>
          <Leaderboard mode="smash" votes={globalVotes} palette={DMG} pixelated />
          <div style={{ height: 12 }} />
          <div style={{ fontSize: 10, marginBottom: 8 }}>►WORST RATED</div>
          <Leaderboard mode="pass" votes={globalVotes} palette={DMG} pixelated />
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        background: DMG.ink, color: DMG.bg, padding: '8px 14px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        borderTop: \u00604px solid ${DMG.black}\u0060, fontSize: 8, letterSpacing: 1,
      }}>
        <span>SESSION:</span>
        <span>SMASHED <b style={{ color: '#9bbc0f' }}>{sSmash}</b></span>
        <span>SEEN <b>{sSeen}</b></span>
        <span>PASSED <b>{sPass}</b></span>
      </div>
    </div>
  );
}

function CartCount({ label, val }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 14 }}>{val}</div>
      <div style={{ fontSize: 7, marginTop: 4, color: DMG.bg2 }}>{label}</div>
    </div>
  );
}

function CartCheckbox({ label, sub, checked, indeterminate, onChange }) {
  const boxRef = React.useRef();
  React.useEffect(() => { if (boxRef.current) boxRef.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label style={{
      display: 'block', cursor: 'pointer', marginBottom: 6, fontSize: 9,
      color: DMG.black, userSelect: 'none',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 14, height: 14, border: \u00602px solid ${DMG.black}\u0060, background: DMG.bg,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {checked && !indeterminate && <span style={{ width: 6, height: 6, background: DMG.black }} />}
          {indeterminate && <span style={{ width: 6, height: 2, background: DMG.black }} />}
        </span>
        <input type="checkbox" ref={boxRef} checked={checked} onChange={(e) => onChange(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
        <span>{label}</span>
      </span>
      {sub && <div style={{ fontSize: 7, color: DMG.ink, marginLeft: 22, marginTop: 3, letterSpacing: 1 }}>{sub}</div>}
    </label>
  );
}

function CartButton({ children, onClick, disabled, bg }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily: 'inherit', fontSize: 12, letterSpacing: 1,
      padding: '12px 16px',
      background: bg, color: DMG.bg,
      border: \u00603px solid ${DMG.black}\u0060,
      boxShadow: disabled ? 'none' : \u00604px 4px 0 ${DMG.black}\u0060,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transform: 'translate(0,0)',
      transition: 'transform .08s, box-shadow .08s',
    }}
    onMouseDown={e => { if (disabled) return; e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = \u00602px 2px 0 ${DMG.black}\u0060; }}
    onMouseUp={e => { if (disabled) return; e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = \u00604px 4px 0 ${DMG.black}\u0060; }}
    onMouseLeave={e => { if (disabled) return; e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = \u00604px 4px 0 ${DMG.black}\u0060; }}
    >{children}</button>
  );
}

// Pixelated DMG capsule. Pure CSS — two stacked rectangles + a hinge bar.
// Intentionally NOT a sphere — this is a chunky pixel-art "creature canister"
// styled like a Game Boy item sprite. No red or trademarked shapes.
function DMGCapsule({ phase }) {
  const open = phase === 'flash';
  const wobbling = phase === 'wobble';
  const dropping = phase === 'drop';
  return (
    <div style={{
      width: 80, height: 80, position: 'relative',
      animation:
        dropping ? 'sopDrop 220ms steps(4, end) forwards' :
        wobbling ? 'sopWobble 680ms steps(8, end)' :
        'none',
    }}>
      {/* Top half */}
      <div style={{
        position: 'absolute', left: 8, top: 4, width: 64, height: 32,
        background: DMG.ink,
        boxShadow: \u0060inset -4px 0 0 ${DMG.black}, inset 4px 4px 0 ${DMG.bg2}\u0060,
        border: \u00603px solid ${DMG.black}\u0060,
        animation: open ? 'sopCapsuleOpenTop 200ms ease-out forwards' : 'none',
      }} />
      {/* Bottom half */}
      <div style={{
        position: 'absolute', left: 8, top: 44, width: 64, height: 32,
        background: DMG.bg,
        boxShadow: \u0060inset -4px 0 0 ${DMG.ink}, inset 4px 4px 0 ${DMG.bg2}\u0060,
        border: \u00603px solid ${DMG.black}\u0060,
        animation: open ? 'sopCapsuleOpenBot 200ms ease-out forwards' : 'none',
      }} />
      {/* Center button */}
      <div style={{
        position: 'absolute', left: 32, top: 32, width: 16, height: 16,
        background: DMG.bg2,
        border: \u00603px solid ${DMG.black}\u0060,
      }} />
    </div>
  );
}

window.CartridgeTheme = CartridgeTheme;

```

### `public/js/theme-foil.jsx`

```jsx
// THEME 2 — FOIL
// 90s holographic trading card. Embossed gold borders, prismatic gradient bg,
// condensed display type, energy-symbol pills.

const FOIL = {
  bg:      '#1e1e2c',
  surface: '#fbf6e7',           // cream card stock
  surface2:'#f3e9c4',
  gold:    '#c8a14c',
  goldHi:  '#f3d27a',
  ink:     '#23202b',
  muted:   '#6d6453',
  smash:   '#d33d49',
  pass:    '#4a3a8a',
  border:  '#c8a14c',
};

function FoilTheme() {
  const s = useSOP();
  const { current, loading, sSmash, sPass, sSeen, globalVotes, checkedGens } = s;
  const { phase } = useEntryPhase(current?.id);
  const { active: voteActive, choice } = useVoteAnim();

  const gSmash = Object.values(globalVotes).reduce((a, v) => a + v.smash, 0);
  const gPass = Object.values(globalVotes).reduce((a, v) => a + v.pass, 0);

  const typePalette = {
    fire: '#ef6c4a', water: '#3aa1d3', grass: '#5fb35d', electric: '#e9c531',
    psychic: '#d75aa4', ice: '#7ad3d7', dragon: '#7866b8', dark: '#3d3540',
    fairy: '#e3a7c8', normal: '#9d9582', fighting: '#b85c3a', flying: '#8aaee8',
    poison: '#9b59c1', ground: '#c9a05c', rock: '#998264', bug: '#8ab148',
    ghost: '#6a5a93', steel: '#8a96a3',
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: \u0060
        radial-gradient(ellipse at 20% 0%, #2a2547 0%, transparent 50%),
        radial-gradient(ellipse at 80% 100%, #3a1f3f 0%, transparent 50%),
        ${FOIL.bg}
      \u0060,
      color: FOIL.surface, fontFamily: '"Inter", system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* HEADER */}
      <div style={{
        padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: \u00601px solid ${FOIL.gold}40\u0060,
        background: \u0060linear-gradient(180deg, ${FOIL.bg} 0%, transparent 100%)\u0060,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FoilDiamond />
          <div>
            <div style={{
              fontFamily: '"Anton", "Bebas Neue", Impact, sans-serif',
              fontSize: 26, letterSpacing: 2,
              background: \u0060linear-gradient(135deg, ${FOIL.goldHi}, ${FOIL.gold}, ${FOIL.goldHi})\u0060,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>HOLO-RATE 1ST EDITION</div>
            <div style={{ fontSize: 10, color: FOIL.muted, letterSpacing: 2, marginTop: 2 }}>RATE EVERY CREATURE · COLLECT THE DATA</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <FoilStat label="SMASHES" val={gSmash} accent={FOIL.smash} />
          <FoilStat label="PASSES" val={gPass} accent={FOIL.pass} />
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '190px 1fr 220px', overflow: 'hidden' }}>
        {/* LEFT */}
        <div style={{
          borderRight: \u00601px solid ${FOIL.gold}30\u0060, padding: '20px 16px', overflow: 'auto',
        }}>
          <FoilHeading>SET FILTER</FoilHeading>
          <FoilCheck
            label="ALL SETS"
            checked={checkedGens.size === GENS.length}
            indeterminate={checkedGens.size > 0 && checkedGens.size < GENS.length}
            onChange={(c) => toggleAllGens(c)}
          />
          <div style={{ height: 1, background: \u0060${FOIL.gold}30\u0060, margin: '12px 0' }} />
          {GENS.map((g, i) => (
            <FoilCheck
              key={i}
              label={g.label}
              sub={g.sub}
              checked={checkedGens.has(i)}
              onChange={(c) => toggleGen(i, c)}
            />
          ))}
        </div>

        {/* CENTER — the card */}
        <div style={{
          position: 'relative', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 18, gap: 14,
          background: \u0060radial-gradient(circle at center, ${FOIL.gold}10 0%, transparent 60%)\u0060,
        }}>
          <div style={{
            // The holographic card itself
            width: 280, padding: '10px 10px 18px',
            background: \u0060
              conic-gradient(from 210deg at 50% 50%,
                #f9efc8 0deg, #fbecc9 30deg, #f5dcb7 60deg, #ead2a2 90deg,
                #f9efc8 130deg, #fbecc9 180deg, #f5dcb7 220deg, #ead2a2 280deg,
                #f9efc8 360deg)
            \u0060,
            borderRadius: 12,
            boxShadow: \u0060
              0 0 0 2px ${FOIL.gold},
              0 0 0 4px ${FOIL.ink},
              0 0 0 5px ${FOIL.goldHi},
              0 12px 36px rgba(0,0,0,0.5),
              inset 0 0 0 1px ${FOIL.goldHi}
            \u0060,
            position: 'relative', zIndex: 1,
          }}>
            {/* card name strip */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: \u0060linear-gradient(90deg, ${FOIL.goldHi}, ${FOIL.gold})\u0060,
              padding: '6px 12px', borderRadius: 4,
              border: \u00601px solid ${FOIL.ink}\u0060,
              color: FOIL.ink, fontFamily: '"Anton", Impact, sans-serif',
              letterSpacing: 1,
            }}>
              <span style={{ fontSize: 14, textTransform: 'uppercase' }}>
                {current ? current.name.replace(/-/g, ' ') : '— — —'}
              </span>
              <span style={{ fontSize: 10 }}>{current ? \u0060#${String(current.id).padStart(3, '0')}\u0060 : ''}</span>
            </div>

            {/* art window */}
            <div style={{
              marginTop: 10, padding: 6,
              background: \u0060linear-gradient(180deg, #fff9e0, #f6e8b8)\u0060,
              border: \u00602px solid ${FOIL.gold}\u0060,
              boxShadow: \u0060inset 0 0 0 1px ${FOIL.ink}, inset 0 2px 8px ${FOIL.gold}30\u0060,
              borderRadius: 4,
              position: 'relative', overflow: 'hidden',
            }}>
              {/* holo shimmer */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: \u0060linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)\u0060,
                animation: 'foilShine 4s linear infinite',
                mixBlendMode: 'overlay',
              }} />
              <CreatureStage
                current={current}
                phase={phase}
                voteActive={voteActive}
                choice={choice}
                palette={FOIL}
                Capsule={FoilCapsule}
                pixelated
                spriteFilter="drop-shadow(0 4px 6px rgba(0,0,0,0.25))"
                height={170}
                spriteSize={140}
              />
            </div>

            {/* types + footer */}
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {current?.types.map(t => (
                  <span key={t} title={t} style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: typePalette[t] || '#888',
                    border: \u00602px solid ${FOIL.ink}\u0060,
                    boxShadow: \u0060inset 0 -2px 0 rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.4)\u0060,
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 8, color: FOIL.muted, fontStyle: 'italic', letterSpacing: 1 }}>
                ILLUS. SPRITE WORKS
              </div>
            </div>
          </div>

          {!current && !loading && (
            <div style={{ color: FOIL.muted, padding: 20 }}>Select a set to begin</div>
          )}

          {/* Vote buttons */}
          <div style={{ display: 'flex', gap: 12, width: 280, marginTop: 6 }}>
            <FoilButton onClick={() => vote('pass')} bg={FOIL.pass} disabled={!current || phase !== 'idle'}>Pass</FoilButton>
            <FoilButton onClick={() => vote('smash')} bg={FOIL.smash} disabled={!current || phase !== 'idle'}>Smash</FoilButton>
          </div>
          <button onClick={skip} style={{
            background: 'transparent', border: \u00601px solid ${FOIL.gold}55\u0060,
            color: FOIL.muted, padding: '5px 16px', borderRadius: 99, cursor: 'pointer',
            fontSize: 11, letterSpacing: 1,
          }}>Skip →</button>
        </div>

        {/* RIGHT */}
        <div style={{ borderLeft: \u00601px solid ${FOIL.gold}30\u0060, padding: '20px 16px', overflow: 'auto' }}>
          <FoilHeading>MOST SMASHED</FoilHeading>
          <Leaderboard mode="smash" votes={globalVotes} palette={{...FOIL, smash: FOIL.smash, muted: FOIL.muted, border: FOIL.gold }} />
          <div style={{ height: 12 }} />
          <FoilHeading>MOST PASSED</FoilHeading>
          <Leaderboard mode="pass" votes={globalVotes} palette={{...FOIL, pass: FOIL.pass, muted: FOIL.muted, border: FOIL.gold }} />
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        padding: '10px 22px', display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        borderTop: \u00601px solid ${FOIL.gold}40\u0060, fontSize: 11, letterSpacing: 1, color: FOIL.muted,
      }}>
        <span style={{ color: FOIL.smash }}>SMASHED · {sSmash}</span>
        <span style={{ color: FOIL.surface }}>SEEN · {sSeen}</span>
        <span style={{ color: FOIL.pass }}>PASSED · {sPass}</span>
      </div>

      <style>{\u0060
        @keyframes foilShine { from { transform: translateX(-80%); } to { transform: translateX(80%); } }
      \u0060}</style>
    </div>
  );
}

function FoilHeading({ children }) {
  return <div style={{
    fontFamily: '"Anton", Impact, sans-serif', fontSize: 13, letterSpacing: 2,
    color: FOIL.gold, marginBottom: 12,
  }}>{children}</div>;
}

function FoilStat({ label, val, accent }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontFamily: '"Anton", Impact, sans-serif', fontSize: 22, color: accent,
        lineHeight: 1, letterSpacing: 1,
      }}>{val.toLocaleString()}</div>
      <div style={{ fontSize: 9, color: FOIL.muted, letterSpacing: 2, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function FoilCheck({ label, sub, checked, indeterminate, onChange }) {
  const ref = React.useRef();
  React.useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label style={{ display: 'block', cursor: 'pointer', marginBottom: 10, userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{
          width: 16, height: 16, borderRadius: 3,
          background: checked ? FOIL.gold : 'transparent',
          border: \u00601.5px solid ${FOIL.gold}\u0060,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {checked && !indeterminate && <span style={{ color: FOIL.ink, fontSize: 11, fontWeight: 900 }}>✓</span>}
          {indeterminate && <span style={{ width: 8, height: 2, background: FOIL.ink }} />}
        </span>
        <input type="checkbox" ref={ref} checked={checked} onChange={(e) => onChange(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
        <span style={{ fontSize: 12, color: FOIL.surface, fontWeight: 500 }}>{label}</span>
      </div>
      {sub && <div style={{ fontSize: 10, color: FOIL.muted, marginLeft: 25, marginTop: 2 }}>{sub}</div>}
    </label>
  );
}

function FoilButton({ children, onClick, disabled, bg }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, padding: '12px 0',
      fontFamily: '"Anton", Impact, sans-serif',
      fontSize: 18, letterSpacing: 2, textTransform: 'uppercase',
      color: '#fff',
      background: \u0060linear-gradient(180deg, ${bg} 0%, ${bg} 50%, ${bg}cc 100%)\u0060,
      border: \u00601px solid ${FOIL.ink}\u0060,
      borderRadius: 8,
      boxShadow: \u0060inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.25), 0 4px 0 ${FOIL.ink}, 0 6px 14px rgba(0,0,0,0.4)\u0060,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'transform .08s, box-shadow .08s',
    }}
    onMouseDown={e => { if (disabled) return; e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = \u0060inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.25), 0 1px 0 ${FOIL.ink}, 0 2px 6px rgba(0,0,0,0.4)\u0060; }}
    onMouseUp={e => { if (disabled) return; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = \u0060inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.25), 0 4px 0 ${FOIL.ink}, 0 6px 14px rgba(0,0,0,0.4)\u0060; }}
    onMouseLeave={e => { if (disabled) return; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = \u0060inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.25), 0 4px 0 ${FOIL.ink}, 0 6px 14px rgba(0,0,0,0.4)\u0060; }}
    >{children}</button>
  );
}

// Foil-themed "Energy Orb" capsule — not a sphere; a faceted crystal-cut
// gem with rotating gradient. Holographic vibe, no trademarked shape.
function FoilCapsule({ phase }) {
  const open = phase === 'flash';
  const wobbling = phase === 'wobble';
  const dropping = phase === 'drop';
  return (
    <div style={{
      width: 80, height: 80, position: 'relative',
      animation:
        dropping ? 'sopDrop 220ms cubic-bezier(.5,1.5,.5,1) forwards' :
        wobbling ? 'sopWobble 680ms ease-in-out' :
        'none',
    }}>
      <svg viewBox="0 0 80 80" width="80" height="80" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="foilOrbTop" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f3d27a" />
            <stop offset="100%" stopColor="#c8a14c" />
          </linearGradient>
          <linearGradient id="foilOrbBot" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#fbf6e7" />
            <stop offset="100%" stopColor="#e3d5a7" />
          </linearGradient>
        </defs>
        {/* Top half (hexagon-cut) */}
        <g style={{ transformOrigin: '40px 40px', animation: open ? 'sopCapsuleOpenTop 220ms ease-out forwards' : 'none' }}>
          <polygon points="20,40 28,16 52,16 60,40" fill="url(#foilOrbTop)" stroke="#23202b" strokeWidth="2" />
          <polygon points="28,16 52,16 46,22 34,22" fill="rgba(255,255,255,0.4)" />
        </g>
        {/* Bottom half */}
        <g style={{ transformOrigin: '40px 40px', animation: open ? 'sopCapsuleOpenBot 220ms ease-out forwards' : 'none' }}>
          <polygon points="20,40 60,40 52,64 28,64" fill="url(#foilOrbBot)" stroke="#23202b" strokeWidth="2" />
          <polygon points="28,64 52,64 46,58 34,58" fill="rgba(0,0,0,0.1)" />
        </g>
        {/* Center gem */}
        <circle cx="40" cy="40" r="6" fill="#23202b" stroke="#c8a14c" strokeWidth="2" />
        <circle cx="38" cy="38" r="2" fill="#f3d27a" />
      </svg>
    </div>
  );
}

function FoilDiamond() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <polygon points="14,2 26,14 14,26 2,14" fill="none" stroke={FOIL.gold} strokeWidth="2" />
      <polygon points="14,7 21,14 14,21 7,14" fill={FOIL.goldHi} />
      <polygon points="14,7 21,14 14,14" fill={FOIL.gold} />
    </svg>
  );
}

window.FoilTheme = FoilTheme;

```

### `public/js/theme-dex.jsx`

```jsx
// THEME 3 — DEX OS
// Modern device chrome: white/red plastic, digital readouts, clean sans-serif.
// Original UI — not a recreation of any official Pokédex UI.

const DEX = {
  red:        '#d62828',
  redDeep:    '#a01d1d',
  redHi:      '#f25d5d',
  surface:    '#f6f3ee',
  surface2:   '#e8e3da',
  panel:      '#1a1a1f',
  panelHi:    '#2a2a32',
  screen:     '#0b1018',
  screenInk:  '#7fffd4',     // mint-cyan digital readout
  screenDim:  '#3a6a5a',
  text:       '#1a1a1f',
  muted:      '#6c6864',
  smash:      '#22c55e',
  pass:       '#ef4444',
  border:     '#c9c2b6',
};

function DexTheme() {
  const s = useSOP();
  const { current, loading, sSmash, sPass, sSeen, globalVotes, checkedGens } = s;
  const { phase } = useEntryPhase(current?.id);
  const { active: voteActive, choice } = useVoteAnim();

  const gSmash = Object.values(globalVotes).reduce((a, v) => a + v.smash, 0);
  const gPass = Object.values(globalVotes).reduce((a, v) => a + v.pass, 0);

  const typePalette = {
    fire: '#ef6c4a', water: '#3aa1d3', grass: '#5fb35d', electric: '#e9c531',
    psychic: '#d75aa4', ice: '#7ad3d7', dragon: '#7866b8', dark: '#3d3540',
    fairy: '#e3a7c8', normal: '#9d9582', fighting: '#b85c3a', flying: '#8aaee8',
    poison: '#9b59c1', ground: '#c9a05c', rock: '#998264', bug: '#8ab148',
    ghost: '#6a5a93', steel: '#8a96a3',
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: DEX.surface,
      color: DEX.text, fontFamily: '"Inter", system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* HEADER bar */}
      <div style={{
        background: \u0060linear-gradient(180deg, ${DEX.red} 0%, ${DEX.redDeep} 100%)\u0060,
        color: '#fff', padding: '14px 22px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: \u0060inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)\u0060,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <DexLogo />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1 }}>RATEDEX</div>
            <div style={{ fontSize: 10, color: '#ffd9d9', letterSpacing: 2, marginTop: 1 }}>
              FIELD UNIT 03 · TELEMETRY LIVE
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <DexLED color="#22c55e" pulse />
          <DexLED color="#facc15" pulse />
          <DexLED color="#3b82f6" pulse />
        </div>
        <div style={{ display: 'flex', gap: 22 }}>
          <DexCount label="GLOBAL · SMASH" val={gSmash} color="#86efac" />
          <DexCount label="GLOBAL · PASS" val={gPass} color="#fca5a5" />
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '200px 1fr 220px', overflow: 'hidden' }}>
        {/* LEFT */}
        <div style={{
          background: DEX.surface2, padding: 18, overflow: 'auto',
          borderRight: \u00601px solid ${DEX.border}\u0060,
        }}>
          <DexLabel>REGION FILTER</DexLabel>
          <DexCheck
            label="All regions"
            checked={checkedGens.size === GENS.length}
            indeterminate={checkedGens.size > 0 && checkedGens.size < GENS.length}
            onChange={(c) => toggleAllGens(c)}
            bold
          />
          <div style={{ height: 1, background: DEX.border, margin: '12px 0' }} />
          {GENS.map((g, i) => (
            <DexCheck
              key={i}
              label={g.label}
              sub={g.sub}
              checked={checkedGens.has(i)}
              onChange={(c) => toggleGen(i, c)}
            />
          ))}
        </div>

        {/* CENTER — the device screen */}
        <div style={{
          position: 'relative', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '20px 22px', gap: 16,
        }}>
          {/* main "screen" */}
          <div style={{
            width: 320,
            background: DEX.panel,
            borderRadius: 18,
            padding: 10,
            boxShadow: \u00600 1px 0 rgba(255,255,255,0.6), 0 12px 28px rgba(0,0,0,0.18), inset 0 0 0 1px ${DEX.panelHi}\u0060,
            position: 'relative',
          }}>
            {/* screen bezel reflection corners */}
            <div style={{
              position: 'absolute', top: 6, left: 14, width: 8, height: 8,
              borderRadius: '50%', background: '#22c55e',
              boxShadow: \u00600 0 8px #22c55e, inset 0 0 2px rgba(0,0,0,0.3)\u0060,
            }} />
            <div style={{
              position: 'absolute', top: 6, left: 30, width: 6, height: 6,
              borderRadius: '50%', background: '#facc15',
              boxShadow: \u00600 0 6px #facc15\u0060,
            }} />

            {/* inner screen */}
            <div style={{
              background: \u0060linear-gradient(180deg, ${DEX.screen} 0%, #050a12 100%)\u0060,
              borderRadius: 12,
              padding: '14px 14px 18px',
              boxShadow: \u0060inset 0 0 0 1px #000, inset 0 0 28px rgba(0,255,200,0.08)\u0060,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* scanlines */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: \u0060repeating-linear-gradient(0deg, rgba(255,255,255,0) 0 2px, rgba(255,255,255,0.025) 2px 3px)\u0060,
              }} />
              {/* top readout */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 10, color: DEX.screenInk, letterSpacing: 1.5,
              }}>
                <span>► ENC {current ? \u0060#${String(current.id).padStart(4, '0')}\u0060 : '----'}</span>
                <span style={{ color: DEX.screenDim }}>SCAN {String(sSeen).padStart(3, '0')}</span>
              </div>

              <div style={{ marginTop: 6, height: 1, background: \u0060${DEX.screenInk}30\u0060 }} />

              <CreatureStage
                current={current}
                phase={phase}
                voteActive={voteActive}
                choice={choice}
                palette={DEX}
                Capsule={DexCapsule}
                pixelated
                spriteFilter="drop-shadow(0 0 14px rgba(127,255,212,0.35))"
                height={160}
                spriteSize={140}
              />

              {/* readout bottom */}
              <div style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                color: DEX.screenInk, fontSize: 13, letterSpacing: 1.5,
                textTransform: 'uppercase', textAlign: 'center', minHeight: 18,
              }}>
                {current && (phase === 'idle' || phase === 'reveal') ? current.name.replace(/-/g, ' ') : (loading ? 'SCANNING…' : '')}
              </div>

              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 6 }}>
                {current?.types.map(t => (
                  <span key={t} style={{
                    fontSize: 9,
                    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                    padding: '3px 9px', borderRadius: 99,
                    background: \u0060${typePalette[t] || '#888'}25\u0060,
                    border: \u00601px solid ${typePalette[t] || '#888'}\u0060,
                    color: typePalette[t] || '#888',
                    letterSpacing: 1,
                  }}>{t.toUpperCase()}</span>
                ))}
              </div>

              {/* faux stat bars */}
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {['HP', 'ATK', 'DEF'].map((k, i) => (
                  <div key={k} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                    fontSize: 9, color: DEX.screenDim, letterSpacing: 1,
                  }}>
                    <span style={{ width: 22, color: DEX.screenInk }}>{k}</span>
                    <div style={{ flex: 1, height: 4, background: \u0060${DEX.screenInk}15\u0060, borderRadius: 1 }}>
                      <div style={{
                        height: '100%', width: current ? \u0060${30 + ((current.id * (i+3)) % 70)}%\u0060 : '0%',
                        background: DEX.screenInk, borderRadius: 1, transition: 'width .35s',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom device chrome */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 6px 4px',
            }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <div style={{ width: 16, height: 4, background: '#444', borderRadius: 1 }} />
                <div style={{ width: 16, height: 4, background: '#444', borderRadius: 1 }} />
                <div style={{ width: 16, height: 4, background: '#444', borderRadius: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#444' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#444' }} />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12, width: 320, marginTop: 4 }}>
            <DexButton onClick={() => vote('pass')} disabled={!current || phase !== 'idle'} variant="pass">
              <span style={{ fontSize: 11, letterSpacing: 2, opacity: 0.85, display: 'block' }}>L · ABANDON</span>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>PASS</span>
            </DexButton>
            <DexButton onClick={() => vote('smash')} disabled={!current || phase !== 'idle'} variant="smash">
              <span style={{ fontSize: 11, letterSpacing: 2, opacity: 0.85, display: 'block' }}>R · CAPTURE</span>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>SMASH</span>
            </DexButton>
          </div>
          <button onClick={skip} style={{
            background: 'transparent', border: \u00601px solid ${DEX.border}\u0060,
            color: DEX.muted, padding: '6px 18px', borderRadius: 99, cursor: 'pointer',
            fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
          }}>↪ Skip</button>
        </div>

        {/* RIGHT */}
        <div style={{
          background: DEX.surface2, padding: 18, overflow: 'auto',
          borderLeft: \u00601px solid ${DEX.border}\u0060,
        }}>
          <DexLabel>TOP SMASH</DexLabel>
          <Leaderboard mode="smash" votes={globalVotes} palette={{ ...DEX, smash: DEX.smash, muted: DEX.muted, ink: DEX.muted }} />
          <div style={{ height: 16 }} />
          <DexLabel>TOP PASS</DexLabel>
          <Leaderboard mode="pass" votes={globalVotes} palette={{ ...DEX, pass: DEX.pass, muted: DEX.muted, ink: DEX.muted }} />
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        background: DEX.panel, color: '#fff', padding: '8px 22px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 11, letterSpacing: 2,
      }}>
        <span>SESS</span>
        <span style={{ color: DEX.smash }}>SMASH · {String(sSmash).padStart(3, '0')}</span>
        <span style={{ color: '#aaa' }}>SEEN · {String(sSeen).padStart(3, '0')}</span>
        <span style={{ color: DEX.pass }}>PASS · {String(sPass).padStart(3, '0')}</span>
      </div>
    </div>
  );
}

function DexLabel({ children }) {
  return <div style={{
    fontSize: 10, letterSpacing: 2, color: DEX.muted, fontWeight: 700,
    marginBottom: 10, textTransform: 'uppercase',
  }}>{children}</div>;
}

function DexCount({ label, val, color }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 18, color, fontWeight: 700, lineHeight: 1,
      }}>{val.toLocaleString()}</div>
      <div style={{ fontSize: 9, color: '#ffd9d9', letterSpacing: 1.5, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function DexLED({ color, pulse }) {
  return <div style={{
    width: 10, height: 10, borderRadius: '50%',
    background: color,
    boxShadow: \u00600 0 6px ${color}, inset 0 0 2px rgba(0,0,0,0.3)\u0060,
    animation: pulse ? 'dexPulse 1.8s ease-in-out infinite' : 'none',
  }} />;
}

function DexCheck({ label, sub, checked, indeterminate, onChange, bold }) {
  const ref = React.useRef();
  React.useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label style={{ display: 'block', cursor: 'pointer', marginBottom: 9, userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{
          width: 18, height: 18, borderRadius: 4,
          background: checked ? DEX.red : '#fff',
          border: \u00601.5px solid ${checked ? DEX.red : DEX.border}\u0060,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all .15s',
        }}>
          {checked && !indeterminate && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
          {indeterminate && <span style={{ width: 8, height: 2, background: '#fff' }} />}
        </span>
        <input type="checkbox" ref={ref} checked={checked} onChange={(e) => onChange(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
        <span style={{ fontSize: 12, color: DEX.text, fontWeight: bold ? 700 : 500 }}>{label}</span>
      </div>
      {sub && <div style={{ fontSize: 10, color: DEX.muted, marginLeft: 27, marginTop: 2 }}>{sub}</div>}
    </label>
  );
}

function DexButton({ children, onClick, disabled, variant }) {
  const color = variant === 'smash' ? DEX.smash : DEX.pass;
  const colorDark = variant === 'smash' ? '#16a34a' : '#b91c1c';
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, padding: '10px 0',
      color: '#fff',
      background: \u0060linear-gradient(180deg, ${color} 0%, ${colorDark} 100%)\u0060,
      border: 'none',
      borderRadius: 12,
      boxShadow: \u0060inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 4px 0 ${colorDark}, 0 6px 14px rgba(0,0,0,0.2)\u0060,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'transform .08s, box-shadow .08s',
      fontFamily: 'inherit',
    }}
    onMouseDown={e => { if (disabled) return; e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = \u0060inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 1px 0 ${colorDark}, 0 2px 6px rgba(0,0,0,0.2)\u0060; }}
    onMouseUp={e => { if (disabled) return; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = \u0060inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 4px 0 ${colorDark}, 0 6px 14px rgba(0,0,0,0.2)\u0060; }}
    onMouseLeave={e => { if (disabled) return; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = \u0060inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 4px 0 ${colorDark}, 0 6px 14px rgba(0,0,0,0.2)\u0060; }}
    >{children}</button>
  );
}

function DexLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <rect x="2" y="2" width="32" height="32" rx="8" fill="#fff" />
      <rect x="6" y="6" width="24" height="14" rx="3" fill={DEX.screen} />
      <circle cx="12" cy="13" r="2.5" fill={DEX.screenInk} />
      <circle cx="20" cy="13" r="2.5" fill={DEX.screenInk} opacity="0.5" />
      <rect x="6" y="24" width="24" height="6" rx="2" fill={DEX.panel} />
      <circle cx="10" cy="27" r="1.5" fill="#facc15" />
      <circle cx="14" cy="27" r="1.5" fill="#22c55e" />
      <circle cx="18" cy="27" r="1.5" fill="#3b82f6" />
    </svg>
  );
}

// Dex-themed "containment capsule" — chrome casing with a glowing seam.
// Slick / industrial, not a sphere split horizontally.
function DexCapsule({ phase }) {
  const open = phase === 'flash';
  const wobbling = phase === 'wobble';
  const dropping = phase === 'drop';
  return (
    <div style={{
      width: 80, height: 80, position: 'relative',
      animation:
        dropping ? 'sopDrop 220ms cubic-bezier(.4,1.4,.5,1) forwards' :
        wobbling ? 'sopWobble 680ms ease-in-out' :
        'none',
    }}>
      <svg viewBox="0 0 80 80" width="80" height="80" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="dexChrome" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="50%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
        </defs>
        {/* Top half — chrome */}
        <g style={{ transformOrigin: '40px 40px', animation: open ? 'sopCapsuleOpenTop 220ms ease-out forwards' : 'none' }}>
          <path d="M14 40 Q14 14 40 14 Q66 14 66 40 Z" fill="url(#dexChrome)" stroke="#1a1a1f" strokeWidth="2" />
          <path d="M22 30 Q26 22 38 20" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
        </g>
        {/* Bottom half — red device */}
        <g style={{ transformOrigin: '40px 40px', animation: open ? 'sopCapsuleOpenBot 220ms ease-out forwards' : 'none' }}>
          <path d="M14 40 Q14 66 40 66 Q66 66 66 40 Z" fill={DEX.red} stroke="#1a1a1f" strokeWidth="2" />
          <path d="M22 50 Q26 58 38 60" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
        </g>
        {/* Glowing seam */}
        <line x1="12" y1="40" x2="68" y2="40" stroke="#7fffd4" strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 4px #7fffd4)' }} />
        {/* Center button */}
        <circle cx="40" cy="40" r="7" fill="#1a1a1f" stroke={DEX.screenInk} strokeWidth="1.5" />
        <circle cx="40" cy="40" r="3" fill={DEX.screenInk}
          style={{ filter: 'drop-shadow(0 0 4px #7fffd4)' }} />
      </svg>
    </div>
  );
}

// Pulse keyframe (one-time)
if (!document.getElementById('dex-anim-styles')) {
  const s = document.createElement('style');
  s.id = 'dex-anim-styles';
  s.textContent = \u0060
    @keyframes dexPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%      { opacity: 0.5; transform: scale(0.85); }
    }
  \u0060;
  document.head.appendChild(s);
}

window.DexTheme = DexTheme;

```

### `public/js/theme-switcher.jsx`

```jsx
// Floating theme switcher — sits in the bottom-right.
// Cycles between the 3 themes; persists selection to localStorage.

const THEMES = [
  { id: 'foil',      label: 'Foil',       sub: 'Holographic trading card',
    swatch: 'linear-gradient(135deg, #f3d27a 0%, #c8a14c 50%, #f3d27a 100%)' },
  { id: 'cartridge', label: 'Cartridge 88', sub: 'Game Boy DMG',
    swatch: 'linear-gradient(135deg, #9bbc0f 0%, #306230 100%)' },
  { id: 'dex',       label: 'Dex OS',     sub: 'Modern device',
    swatch: 'linear-gradient(135deg, #f25d5d 0%, #a01d1d 100%)' },
];

function ThemeSwitcher({ current, onChange }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{
      position: 'fixed', right: 16, bottom: 16, zIndex: 9999,
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      {open && (
        <div style={{
          position: 'absolute', right: 0, bottom: 'calc(100% + 8px)',
          background: '#fff',
          borderRadius: 14, padding: 8, minWidth: 240,
          boxShadow: '0 10px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#6b7280',
            padding: '8px 10px 4px', textTransform: 'uppercase',
          }}>Theme</div>
          {THEMES.map(t => (
            <button key={t.id}
              onClick={() => { onChange(t.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '10px',
                background: current === t.id ? 'rgba(99,102,241,0.07)' : 'transparent',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                color: '#111827', textAlign: 'left',
                transition: 'background .12s',
              }}
              onMouseEnter={e => { if (current !== t.id) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { if (current !== t.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: t.swatch,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
                flexShrink: 0,
              }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{t.sub}</div>
              </span>
              {current === t.id && <span style={{ color: '#6366f1', fontSize: 16, fontWeight: 700 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        title="Switch theme"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff',
          padding: '8px 12px 8px 8px',
          border: 'none', borderRadius: 99, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08)',
          fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#111827',
        }}
      >
        <span style={{
          width: 24, height: 24, borderRadius: '50%',
          background: THEMES.find(t => t.id === current)?.swatch,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
        }} />
        <span>{THEMES.find(t => t.id === current)?.label}</span>
        <span style={{ color: '#9ca3af', fontSize: 10, marginLeft: 2 }}>▼</span>
      </button>
    </div>
  );
}

window.ThemeSwitcher = ThemeSwitcher;
window.THEMES = THEMES;

```


---

## Appendix C · Path B shell — `public/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pokémon: Smash or Pass</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Anton&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

  <script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>

  <style>
    html, body { margin: 0; padding: 0; height: 100%; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #1e1e2c; overflow: hidden; }
    #root { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel" src="js/shared.jsx"></script>
  <script type="text/babel" src="js/effects.jsx"></script>
  <script type="text/babel" src="js/shared-components.jsx"></script>
  <script type="text/babel" src="js/theme-cartridge.jsx"></script>
  <script type="text/babel" src="js/theme-foil.jsx"></script>
  <script type="text/babel" src="js/theme-dex.jsx"></script>
  <script type="text/babel" src="js/theme-switcher.jsx"></script>

  <script type="text/babel">
    const STORAGE_KEY = 'sop_theme';

    function App() {
      const [theme, setTheme] = React.useState(() => {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved && ['foil', 'cartridge', 'dex'].includes(saved)) return saved;
        } catch (e) {}
        return 'foil';
      });

      React.useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
      }, [theme]);

      const ThemeComponent = {
        foil: FoilTheme,
        cartridge: CartridgeTheme,
        dex: DexTheme,
      }[theme];

      return (
        <div style={{ width: '100%', height: '100%' }}>
          <ThemeComponent />
          <ThemeSwitcher current={theme} onChange={setTheme} />
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>
```

---

## Final checklist for Claude Code

1. Pick a path (A is faster; B is cleaner long-term).
2. Apply the file changes exactly as listed above.
3. Run `npm start` and walk through the acceptance criteria in §8.
4. Do NOT modify `server.js`, `package.json`, or `data/`.
5. Commit with a descriptive message — note that audio files aren't included (the `SOP_AUDIO` hook is left for the project owner to wire up later).

If anything in the visual specs is ambiguous after reading this doc, prefer reproducing what's in the Appendix code listings exactly — those are the canonical source.
