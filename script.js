/* =========================================================
   LogicLab — Interactive Logic Gates Simulator
   script.js — gate definitions, simulator, truth table
   generator, answer mode, randomized quiz, progress tracking
   ========================================================= */
'use strict';

/* ------------------------------
   Small DOM helpers
   ------------------------------ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const INPUT_LABELS = ['A', 'B', 'C', 'D']; // input names for 1–4 inputs

/* ------------------------------
   Gate definitions
   compute(): receives an array of 0/1 values, returns 0 or 1.
   XOR  -> 1 when an ODD  number of inputs are 1 (odd parity)
   XNOR -> 1 when an EVEN number of inputs are 1 (even parity)
   ------------------------------ */
const GATES = {
  AND: {
    name: 'AND',
    unary: false,
    inputsInfo: '2 (simulator supports 2–4)',
    description: 'Outputs 1 only when ALL of its inputs are 1. If any input is 0, the output is 0.',
    application: 'Gating circuits — e.g., enabling a clock signal only when a chip-select is active, or checking that several conditions are all true.',
    compute: (ins) => (ins.every((v) => v === 1) ? 1 : 0),
    explain: (ins, out) => (out === 1
      ? 'Every input is 1 — the AND gate outputs 1 only when ALL inputs are HIGH.'
      : 'At least one input is 0 — the AND gate outputs 0 unless ALL inputs are HIGH.'),
  },
  OR: {
    name: 'OR',
    unary: false,
    inputsInfo: '2 (simulator supports 2–4)',
    description: 'Outputs 1 when AT LEAST one input is 1. The output is 0 only when all inputs are 0.',
    application: 'Alarm systems — triggering when any sensor detects motion, or combining multiple interrupt requests into one line.',
    compute: (ins) => (ins.some((v) => v === 1) ? 1 : 0),
    explain: (ins, out) => (out === 1
      ? 'At least one input is 1 — the OR gate outputs 1 when ANY input is HIGH.'
      : 'All inputs are 0 — the OR gate outputs 0 unless at least one input is HIGH.'),
  },
  NOT: {
    name: 'NOT',
    unary: true,
    inputsInfo: '1 (unary gate)',
    description: 'Inverts its single input: 0 becomes 1 and 1 becomes 0. Also called an inverter.',
    application: 'Signal inversion, oscillator circuits (with feedback), and creating active-low control signals.',
    compute: (ins) => (ins[0] === 1 ? 0 : 1),
    explain: () => 'The NOT gate inverts its input: 0 becomes 1 and 1 becomes 0.',
  },
  NAND: {
    name: 'NAND',
    unary: false,
    inputsInfo: '2 (simulator supports 2–4)',
    description: 'An AND gate followed by a NOT. It outputs 0 only when ALL inputs are 1 — the opposite of AND.',
    application: 'A universal gate — any logic function can be built from NAND gates alone. Widely used in flash memory and processors.',
    compute: (ins) => (ins.every((v) => v === 1) ? 0 : 1),
    explain: (ins, out) => (out === 1
      ? 'Not all inputs are 1 — AND would give 0, so the inverted NAND result is 1.'
      : 'All inputs are 1 — AND would give 1, so the inverted NAND result is 0.'),
  },
  NOR: {
    name: 'NOR',
    unary: false,
    inputsInfo: '2 (simulator supports 2–4)',
    description: 'An OR gate followed by a NOT. It outputs 1 only when ALL inputs are 0 — the opposite of OR.',
    application: 'Another universal gate — used in microcontrollers and to build memory cells (an SRAM latch uses two NOR gates).',
    compute: (ins) => (ins.some((v) => v === 1) ? 0 : 1),
    explain: (ins, out) => (out === 1
      ? 'All inputs are 0 — OR would give 0, so the inverted NOR result is 1.'
      : 'At least one input is 1 — OR would give 1, so the inverted NOR result is 0.'),
  },
  XOR: {
    name: 'XOR',
    unary: false,
    inputsInfo: '2 (simulator supports 2–4)',
    description: 'Outputs 1 when an ODD number of inputs are 1 (odd parity). With two inputs: 1 when the inputs are different.',
    application: 'Binary adders, parity generators for error detection, and cryptography / data comparison.',
    compute: (ins) => (ins.reduce((a, b) => a + b, 0) % 2 === 1 ? 1 : 0),
    explain: (ins, out) => (out === 1
      ? 'An ODD number of inputs are 1 — XOR outputs 1 for odd parity.'
      : 'An EVEN number of inputs are 1 — XOR outputs 0 (only an odd count of 1s gives 1).'),
  },
  XNOR: {
    name: 'XNOR',
    unary: false,
    inputsInfo: '2 (simulator supports 2–4)',
    description: 'Outputs 1 when an EVEN number of inputs are 1 (even parity). With two inputs: 1 when the inputs are equal.',
    application: 'Equality comparators, parity checkers, and digital counters.',
    compute: (ins) => (ins.reduce((a, b) => a + b, 0) % 2 === 0 ? 1 : 0),
    explain: (ins, out) => (out === 1
      ? 'An EVEN number of inputs are 1 — XNOR outputs 1 for even parity.'
      : 'An ODD number of inputs are 1 — XNOR outputs 0 (only an even count of 1s gives 1).'),
  },
  Buffer: {
    name: 'Buffer',
    unary: true,
    inputsInfo: '1 (unary gate)',
    description: 'Outputs the input unchanged — it strengthens (amplifies) the signal instead of altering it.',
    application: 'Bus drivers and signal isolation: restoring weakened signals and connecting one output to many inputs.',
    compute: (ins) => ins[0],
    explain: () => 'The Buffer passes the input through unchanged — the output always equals the input.',
  },
};

/* ------------------------------
   SVG gate geometry (viewBox 0 0 120 80)
   inX  = where input wires connect
   outX = where the output wire starts
   bubble = inversion circle (NAND, NOR, NOT, XNOR)
   extra  = extra input curve (XOR, XNOR)
   ------------------------------ */
const GATE_GEO = {
  AND:    { inX: 35, outX: 75, body: 'M35 15 H55 A20 20 0 0 1 55 65 H35 Z' },
  NAND:   { inX: 35, outX: 84, body: 'M35 15 H55 A20 20 0 0 1 55 65 H35 Z', bubble: { cx: 79, cy: 40, r: 5 } },
  OR:     { inX: 35, outX: 68, body: 'M35 15 Q52 15 68 40 Q52 65 35 65 Q48 40 35 15 Z' },
  NOR:    { inX: 35, outX: 78, body: 'M35 15 Q52 15 68 40 Q52 65 35 65 Q48 40 35 15 Z', bubble: { cx: 72.5, cy: 40, r: 5 } },
  XOR:    { inX: 31, outX: 74, body: 'M41 15 Q58 15 74 40 Q58 65 41 65 Q54 40 41 15 Z', extra: 'M31 15 Q44 40 31 65' },
  XNOR:   { inX: 31, outX: 84, body: 'M41 15 Q58 15 74 40 Q58 65 41 65 Q54 40 41 15 Z', extra: 'M31 15 Q44 40 31 65', bubble: { cx: 78.5, cy: 40, r: 5 } },
  NOT:    { inX: 40, outX: 81, body: 'M40 18 L40 62 L72 40 Z', bubble: { cx: 76, cy: 40, r: 4.5 } },
  Buffer: { inX: 40, outX: 72, body: 'M40 18 L40 62 L72 40 Z' },
};

/* Vertical wire positions per input count (gate body spans y = 15…65) */
function wireYs(n) {
  switch (n) {
    case 1: return [40];
    case 2: return [25, 55];
    case 3: return [20, 40, 60];
    case 4: return [16, 32, 48, 64];
    default: return [40];
  }
}

/* Build a full gate diagram SVG with labelled, colour-coded wires.
   output === null renders an unknown ("?") output for quiz questions. */
function gateDiagramSVG(gate, inputs, output, pulse = false) {
  const geo = GATE_GEO[gate];
  const ys = wireYs(inputs.length);
  const parts = [];

  inputs.forEach((v, i) => {
    const y = ys[i];
    parts.push(`<line class="wire ${v ? 'on' : 'off'}" x1="2" y1="${y}" x2="${geo.inX}" y2="${y}"/>`);
    parts.push(`<circle class="dot ${v ? 'on' : 'off'}" cx="${geo.inX}" cy="${y}" r="3.2"/>`);
    parts.push(`<text class="wlbl" x="4" y="${y - 7}">${INPUT_LABELS[i]}</text>`);
  });

  parts.push(`<path class="gate-body" d="${geo.body}"/>`);
  if (geo.extra) parts.push(`<path class="gate-body" d="${geo.extra}"/>`);
  if (geo.bubble) parts.push(`<circle class="gate-body" cx="${geo.bubble.cx}" cy="${geo.bubble.cy}" r="${geo.bubble.r}"/>`);

  const dotCls = output === null ? 'unknown' : (output ? 'on' : 'off');
  parts.push(`<line class="wire ${output ? 'on' : 'off'}" x1="${geo.outX}" y1="40" x2="108" y2="40"/>`);
  parts.push(`<circle class="out-dot ${dotCls}${pulse ? ' pulse' : ''}" cx="112" cy="40" r="5.5"/>`);
  parts.push(`<text class="wlbl y-lbl" x="100" y="29">Y</text>`);

  const label = output === null ? 'unknown' : `${output} (${output ? 'HIGH' : 'LOW'})`;
  return `<svg viewBox="0 0 120 80" class="gate-diagram" role="img" aria-label="${gate} gate diagram, output ${label}">${parts.join('')}</svg>`;
}

/* Compact gate symbol (no wires) for picker buttons and quiz cards */
function gateMiniSVG(gate) {
  const geo = GATE_GEO[gate];
  const extra = geo.extra ? `<path class="gate-body" d="${geo.extra}"/>` : '';
  const bubble = geo.bubble
    ? `<circle class="gate-body" cx="${geo.bubble.cx}" cy="${geo.bubble.cy}" r="${geo.bubble.r}"/>` : '';
  return `<svg viewBox="26 6 62 68" class="gate-mini" aria-hidden="true"><path class="gate-body" d="${geo.body}"/>${extra}${bubble}</svg>`;
}

/* ------------------------------
   Boolean expressions (HTML)
   Scales with the number of inputs.
   ------------------------------ */
function expressionHTML(gate, n) {
  const L = INPUT_LABELS.slice(0, n);
  switch (gate) {
    case 'AND':    return `Y = ${L.join(' <span class="op" data-tip="Logical AND (dot operator)">·</span> ')}`;
    case 'OR':     return `Y = ${L.join(' <span class="op" data-tip="Logical OR (plus operator)">+</span> ')}`;
    case 'NOT':    return `Y = <span class="overline" data-tip="Overline = logical NOT (inversion)">A</span>`;
    case 'NAND':   return `Y = <span class="overline" data-tip="Overline = logical NOT (inversion)">${L.join(' <span class="op">·</span> ')}</span>`;
    case 'NOR':    return `Y = <span class="overline" data-tip="Overline = logical NOT (inversion)">${L.join(' <span class="op">+</span> ')}</span>`;
    case 'XOR':    return `Y = ${L.join(' <span class="op" data-tip="Exclusive OR — odd parity">⊕</span> ')}`;
    case 'XNOR':   return `Y = <span class="overline" data-tip="Overline = logical NOT (inversion)">${L.join(' <span class="op">⊕</span> ')}</span>`;
    case 'Buffer': return `Y = ${L[0]}`;
    default:       return '';
  }
}

/* ------------------------------
   Truth table generation — pure binary enumeration.
   For n inputs this yields exactly 2^n unique combinations,
   ordered from 0…0 to 1…1 (MSB = input A).
   ------------------------------ */
function generateCombos(n) {
  const rows = [];
  const total = 2 ** n;
  for (let i = 0; i < total; i++) {
    const inputs = [];
    for (let b = 0; b < n; b++) inputs.push((i >> (n - 1 - b)) & 1);
    rows.push(inputs);
  }
  return rows;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* Encouraging feedback based on the percentage score */
function feedbackFor(pct) {
  if (pct === 100) return 'Excellent! You mastered this truth table.';
  if (pct >= 75) return 'Great job! Review the mistakes to improve.';
  if (pct >= 50) return 'Good effort! Practice a little more.';
  return 'Keep learning! Review the gate rules and try again.';
}

/* ------------------------------
   Audio — shared WebAudio context.
   Sound effects AND background music are both disabled by default.
   ------------------------------ */
let soundOn = false;
let audioCtx = null;

/* Lazily create (and resume) one shared AudioContext.
   Browsers only allow audio after a user gesture — every call
   originates from a button click, so this is always permitted. */
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

/* Short UI beep (output changes, quiz answers) */
function playTone(freq) {
  if (!soundOn) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (err) { /* audio unavailable — stay silent */ }
}

/* ------------------------------
   Background music — generative chiptune loop (WebAudio, no audio files).
   Calm Am – F – C – G progression: bass + pad + 8th-note arpeggio.
   Volume is kept low so it stays in the background.
   ------------------------------ */
let musicOn = false;
let musicState = null; // { ctx, master, timer, step, chordIdx, nextTime }

const MUSIC = {
  bpm: 92,
  stepsPerChord: 8, // one chord per bar of 8th notes
  // root frequency + chord tones (Hz)
  chords: [
    { root: 110.00, notes: [220.00, 261.63, 329.63] }, // A minor: A3 C4 E4
    { root: 87.31,  notes: [174.61, 220.00, 261.63] }, // F major:  F3 A3 C4
    { root: 130.81, notes: [261.63, 329.63, 392.00] }, // C major:  C4 E4 G4
    { root: 98.00,  notes: [196.00, 246.94, 293.66] }, // G major:  G3 B3 D4
  ],
  // arpeggio pattern per bar: index into chord.notes (3 = root octave up, null = rest)
  pattern: [0, 1, 2, 1, 3, 2, 1, null],
};

function musicStart() {
  const ctx = getAudioCtx();
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 1.2); // gentle fade-in
  master.connect(ctx.destination);
  musicState = {
    ctx, master,
    step: 0,
    chordIdx: 0,
    nextTime: ctx.currentTime + 0.08,
    timer: setInterval(() => scheduleMusic(), 30), // lookahead scheduler
  };
}

function scheduleMusic() {
  if (!musicState) return;
  const stepDur = 60 / MUSIC.bpm / 2; // 8th note duration in seconds
  // schedule notes up to 150 ms ahead of the audio clock
  while (musicState.nextTime < musicState.ctx.currentTime + 0.15) {
    playMusicStep(musicState.step, musicState.nextTime, stepDur);
    musicState.nextTime += stepDur;
    musicState.step++;
    if (musicState.step % MUSIC.stepsPerChord === 0) {
      musicState.chordIdx = (musicState.chordIdx + 1) % MUSIC.chords.length;
    }
  }
}

function playMusicStep(step, t, stepDur) {
  const chord = MUSIC.chords[musicState.chordIdx];
  const s = step % MUSIC.stepsPerChord;

  // bass: root note on beats 1 and 3 (sine, warm)
  if (s === 0 || s === 4) musicNote(chord.root, t, stepDur * 1.9, 'sine', 0.50);

  // pad: soft chord tones held for the whole bar (triangle, quiet)
  if (s === 0) chord.notes.forEach((f) => musicNote(f / 2, t, stepDur * 8, 'triangle', 0.14));

  // melody: 8th-note arpeggio, one octave up (triangle, music-box feel)
  const pat = MUSIC.pattern[s];
  if (pat !== null) {
    const f = chord.notes[pat % chord.notes.length] * (pat === 3 ? 2 : 1) * 2;
    musicNote(f, t, stepDur * 0.92, 'triangle', 0.20);
  }
}

/* Schedule one note on the music master bus */
function musicNote(freq, t, dur, type, vol) {
  const { ctx, master } = musicState;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function musicStop() {
  if (!musicState) return;
  clearInterval(musicState.timer);
  const { ctx, master } = musicState;
  // fade out over 0.6 s, then disconnect
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  setTimeout(() => { try { master.disconnect(); } catch (err) { /* already stopped */ } }, 700);
  musicState = null;
}

/* ------------------------------
   Session progress (sessionStorage)
   ------------------------------ */
const PROGRESS_KEY = 'logiclab-progress-v1';

function loadProgress() {
  const fallback = { answered: 0, correct: 0, incorrect: 0, bestPct: 0, gates: [] };
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw);
    return { ...fallback, ...p, gates: Array.isArray(p.gates) ? p.gates : [] };
  } catch (err) {
    return fallback;
  }
}

let progress = loadProgress();

function saveProgress() {
  try { sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (err) { /* private mode */ }
}

function recordAnswers(total, correctCount) {
  progress.answered += total;
  progress.correct += correctCount;
  progress.incorrect += total - correctCount;
  saveProgress();
}

function recordGates(gateNames) {
  gateNames.forEach((g) => {
    if (!progress.gates.includes(g)) progress.gates.push(g);
  });
  saveProgress();
}

/* =========================================================
   TAB 1 — LEARN LOGIC GATES
   ========================================================= */
const demoState = {}; // per-gate demo switch values

function learnTruthTable(gate, n) {
  const combos = generateCombos(n);
  const rows = combos.map((inputs) => {
    const out = GATES[gate].compute(inputs);
    return `<tr class="${out ? 'out-1' : ''}">${inputs.map((v) => `<td>${v}</td>`).join('')}<td class="y-cell ${out ? 'y1' : ''}">${out}</td></tr>`;
  }).join('');
  const head = INPUT_LABELS.slice(0, n).map((l) => `<th>${l}</th>`).join('') + '<th>Y</th>';
  return `<table class="tt-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function demoSwitchesHTML(gate) {
  const g = GATES[gate];
  const n = g.unary ? 1 : 2;
  demoState[gate] = demoState[gate] || Array(n).fill(0);
  return demoState[gate].map((v, i) => `
    <button class="switch" role="switch" aria-checked="${v === 1}" data-gate="${gate}" data-index="${i}"
      data-tip="Toggle input ${INPUT_LABELS[i]} between LOW (0) and HIGH (1)">
      <span class="switch-label">${INPUT_LABELS[i]}</span>
      <span class="track"><span class="knob"></span></span>
      <span class="switch-state ${v ? 'high' : 'low'}">${v ? 'HIGH · 1' : 'LOW · 0'}</span>
    </button>`).join('');
}

function renderLearn() {
  $('#gateCards').innerHTML = Object.values(GATES).map((g) => {
    const n = g.unary ? 1 : 2;
    const inputs = demoState[g.name] || Array(n).fill(0);
    const out = g.compute(inputs);
    return `
    <article class="card gate-card" data-gate="${g.name}">
      <div class="gate-card-head">
        <div class="gate-symbol-box">${gateDiagramSVG(g.name, inputs, out)}</div>
        <div>
          <h3>${g.name} Gate</h3>
          <p class="expr" data-tip="Boolean expression">${expressionHTML(g.name, n)}</p>
        </div>
      </div>
      <p class="gate-desc">${g.description}</p>
      <dl class="gate-meta">
        <div><dt>Required inputs</dt><dd>${g.inputsInfo}</dd></div>
        <div><dt>Application</dt><dd>${g.application}</dd></div>
      </dl>
      <h4>Truth table (${n} input${n > 1 ? 's' : ''})</h4>
      ${learnTruthTable(g.name, n)}
      <h4>Interactive demo</h4>
      <div class="gate-demo">
        <div class="demo-switches">${demoSwitchesHTML(g.name)}</div>
        <div class="demo-output">
          <span class="demo-label">Y =</span>
          <span class="output-badge ${out ? 'high' : 'low'}">
            <span class="output-value">${out}</span>
            <span class="output-state">${out ? 'HIGH' : 'LOW'}</span>
          </span>
        </div>
      </div>
      <button class="btn btn-secondary open-sim" data-gate="${g.name}">Open in Simulator</button>
      <button class="btn btn-ghost open-kmap" data-gate="${g.name}">Open in K-Map Solver</button>
    </article>`;
  }).join('');
}

/* Update only the demo parts of one learn card (keeps keyboard focus intact) */
function updateDemoCard(card) {
  const gate = card.dataset.gate;
  const g = GATES[gate];
  const inputs = demoState[gate];
  const out = g.compute(inputs);
  $('.gate-symbol-box', card).innerHTML = gateDiagramSVG(gate, inputs, out);
  $$('.switch', card).forEach((sw, i) => {
    const v = inputs[i];
    sw.setAttribute('aria-checked', String(v === 1));
    const state = $('.switch-state', sw);
    state.textContent = v ? 'HIGH · 1' : 'LOW · 0';
    state.className = `switch-state ${v ? 'high' : 'low'}`;
  });
  const badge = $('.demo-output .output-badge', card);
  badge.className = `output-badge ${out ? 'high' : 'low'}`;
  badge.innerHTML = `<span class="output-value">${out}</span><span class="output-state">${out ? 'HIGH' : 'LOW'}</span>`;
}

/* =========================================================
   TAB 2 — LOGIC GATE SIMULATOR
   ========================================================= */
const sim = { gate: 'AND', n: 2, inputs: [0, 0] };
let lastSimOutput = null; // used to detect output changes (animation + sound)

function fitInputs(arr, n) {
  const out = arr.slice(0, n);
  while (out.length < n) out.push(0);
  return out;
}

function simCompute() {
  return GATES[sim.gate].compute(sim.inputs);
}

function renderSimGatePicker() {
  $('#simGateButtons').innerHTML = Object.values(GATES).map((g) => `
    <button class="gate-btn ${g.name === sim.gate ? 'active' : ''}" data-gate="${g.name}"
      aria-pressed="${g.name === sim.gate}" data-tip="${g.name}: ${g.description}">
      ${gateMiniSVG(g.name)}
      <span class="gate-btn-name">${g.name}</span>
    </button>`).join('');
}

function renderSimControls() {
  const g = GATES[sim.gate];
  const seg = $('#simInputCount');
  setSegActive(seg, sim.n);
  setSegDisabled(seg, g.unary);
  $('#simUnaryNote').classList.toggle('hidden', !g.unary);
  $('#simFixedBadge').classList.toggle('hidden', !g.unary);
}

function renderSimSwitches() {
  $('#simSwitches').innerHTML = sim.inputs.map((v, i) => `
    <button class="switch" role="switch" aria-checked="${v === 1}" data-index="${i}"
      data-tip="Toggle input ${INPUT_LABELS[i]} between LOW (0) and HIGH (1)">
      <span class="switch-label">${INPUT_LABELS[i]}</span>
      <span class="track"><span class="knob"></span></span>
      <span class="switch-state ${v ? 'high' : 'low'}">${v ? 'HIGH · 1' : 'LOW · 0'}</span>
    </button>`).join('');
}

function renderSimOutput() {
  const out = simCompute();
  const changed = out !== lastSimOutput;
  if (changed) {
    if (lastSimOutput !== null) playTone(out ? 540 : 240); // rising tone for HIGH, falling for LOW
    lastSimOutput = out;
  }

  $('#simDiagram').innerHTML = gateDiagramSVG(sim.gate, sim.inputs, out, changed);
  $('#simGateName').textContent = `${GATES[sim.gate].name} Gate`;
  $('#simInputs').textContent = sim.inputs.map((v, i) => `${INPUT_LABELS[i]}=${v}`).join('   ');
  $('#simExpr').innerHTML = expressionHTML(sim.gate, sim.n);

  const badge = $('#simOutputBadge');
  badge.className = `output-badge ${out ? 'high' : 'low'}${changed ? ' pulse' : ''}`;
  $('#simOutputValue').textContent = String(out);
  $('#simOutputState').textContent = out ? 'HIGH' : 'LOW';
}

function renderSimulator() {
  renderSimGatePicker();
  renderSimControls();
  renderSimSwitches();
  renderSimOutput();
}

function simSetGate(gate) {
  sim.gate = gate;
  const g = GATES[gate];
  sim.n = g.unary ? 1 : Math.max(2, sim.n);
  sim.inputs = fitInputs(sim.inputs, sim.n);
  renderSimulator();
  renderGeneratorTable(); // refresh "current inputs" row highlight
}

/* =========================================================
   TAB 3 — TRUTH TABLE GENERATOR
   ========================================================= */
const gen = { gate: 'AND', n: 2, visible: true };

function renderGeneratorTable() {
  const g = GATES[gen.gate];
  const combos = generateCombos(gen.n);
  const rowsHTML = combos.map((inputs) => {
    const out = g.compute(inputs);
    const isCurrent = sim.inputs.length === gen.n && sim.inputs.every((v, i) => v === inputs[i]);
    return `<tr class="${out ? 'out-1' : ''}${isCurrent ? ' current' : ''}">
      ${inputs.map((v) => `<td>${v}</td>`).join('')}
      <td class="y-cell ${out ? 'y1' : ''}">${out}</td>
    </tr>`;
  }).join('');

  const head = INPUT_LABELS.slice(0, gen.n).map((l) => `<th>${l}</th>`).join('') + '<th>Y</th>';
  $('#ttTableWrap').innerHTML = `
    <table class="tt-table">
      <caption>${g.name} gate — ${gen.n} input${gen.n > 1 ? 's' : ''} &nbsp;·&nbsp;
        <span class="expr">${expressionHTML(gen.gate, gen.n)}</span>
      </caption>
      <thead><tr>${head}</tr></thead>
      <tbody>${rowsHTML}</tbody>
    </table>`;

  $('#ttTableWrap').classList.toggle('hidden', !gen.visible);
  $('#genToggleTable').textContent = gen.visible ? 'Hide table' : 'Show table';

  const onesCount = combos.filter((c) => g.compute(c) === 1).length;
  $('#genStats').innerHTML =
    `Total combinations: <strong>${combos.length}</strong> (2<sup>${gen.n}</sup>) &nbsp;·&nbsp; ` +
    `Rows with output 1: <strong>${onesCount}</strong>`;
}

function renderGenControls() {
  const g = GATES[gen.gate];
  const seg = $('#genInputCount');
  setSegActive(seg, gen.n);
  setSegDisabled(seg, g.unary);
  $('#genUnaryNote').classList.toggle('hidden', !g.unary);
  $('#genFixedBadge').classList.toggle('hidden', !g.unary);
}

function genSetGate(gate) {
  gen.gate = gate;
  const g = GATES[gate];
  gen.n = g.unary ? 1 : Math.max(2, gen.n);
  renderGenControls();
  renderGeneratorTable();
}

function downloadCSV() {
  const g = GATES[gen.gate];
  const lines = [INPUT_LABELS.slice(0, gen.n).concat('Y').join(',')];
  for (const combo of generateCombos(gen.n)) {
    lines.push(combo.concat(g.compute(combo)).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${gen.gate}_${gen.n}-input_truth_table.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function printTable() {
  gen.visible = true;
  renderGeneratorTable();
  document.body.classList.add('print-mode');
  window.print();
}
window.addEventListener('afterprint', () => document.body.classList.remove('print-mode'));

/* =========================================================
   TAB 4A — TRUTH TABLE ANSWER MODE (complete the missing outputs)
   ========================================================= */
const ans = { gate: 'AND', n: 2, numMissing: 4, rows: [], submitted: false, revealed: false };

function ansMaxMissing() {
  return 2 ** ans.n;
}

function ansGenerate() {
  const total = ansMaxMissing();
  ans.numMissing = Math.min(Math.max(1, ans.numMissing || total), total);
  const combos = generateCombos(ans.n);
  const blankIdx = new Set(shuffle(combos.map((_, i) => i)).slice(0, ans.numMissing));
  ans.rows = combos.map((inputs, i) => ({
    inputs,
    correct: GATES[ans.gate].compute(inputs),
    blank: blankIdx.has(i),
    user: null,
  }));
  ans.submitted = false;
  ans.revealed = false;
  renderAnswerMode();
}

function renderAnswerMode() {
  // --- controls state ---
  const g = GATES[ans.gate];
  const seg = $('#ansInputCount');
  setSegActive(seg, ans.n);
  setSegDisabled(seg, g.unary);
  $('#ansUnaryNote').classList.toggle('hidden', !g.unary);
  $('#ansFixedBadge').classList.toggle('hidden', !g.unary);
  $('#ansGateSelect').value = ans.gate;

  // --- missing-count options (1 … 2^n) ---
  const total = ansMaxMissing();
  const sel = $('#ansNumMissing');
  const current = Math.min(ans.numMissing, total);
  sel.innerHTML = Array.from({ length: total }, (_, i) =>
    `<option value="${i + 1}"${i + 1 === current ? ' selected' : ''}>${i + 1}</option>`).join('');

  // --- table ---
  const rowsHTML = ans.rows.map((row, i) => {
    const inputCells = row.inputs.map((v) => `<td>${v}</td>`).join('');
    let yCell;
    if (!row.blank) {
      yCell = `<td class="y-cell given">${row.correct}</td>`; // pre-filled (given) answer
    } else if (ans.revealed) {
      yCell = `<td class="cell-revealed">${row.correct}</td>`;
    } else if (ans.submitted) {
      const ok = row.user === row.correct;
      yCell = `<td class="${ok ? 'cell-correct' : 'cell-incorrect'}">${row.correct}` +
        (ok ? '' : `<span class="you-chose">${row.user === null ? 'not answered' : `you chose ${row.user}`}</span>`) +
        `</td>`;
    } else {
      yCell = `<td><select class="ans-select" data-row="${i}" aria-label="Output for row ${i + 1}">
        <option value="">—</option>
        <option value="0">0</option>
        <option value="1">1</option>
      </select></td>`;
    }
    return `<tr>${inputCells}${yCell}</tr>`;
  }).join('');

  const head = INPUT_LABELS.slice(0, ans.n).map((l) => `<th>${l}</th>`).join('') + '<th>Y</th>';
  $('#ansTableWrap').innerHTML = `
    <table class="tt-table">
      <caption>${g.name} gate — fill in the missing outputs (${ans.numMissing} question${ans.numMissing > 1 ? 's' : ''})</caption>
      <thead><tr>${head}</tr></thead>
      <tbody>${rowsHTML}</tbody>
    </table>`;

  // --- buttons ---
  $('#ansSubmit').disabled = ans.submitted || ans.revealed;
  $('#ansShowAnswers').disabled = ans.revealed;

  // --- score ---
  const scoreBox = $('#ansScore');
  const msg = $('#ansMessage');
  if (ans.submitted) {
    const blanks = ans.rows.filter((r) => r.blank);
    const correctCount = blanks.filter((r) => r.user === r.correct).length;
    const pct = Math.round((correctCount / blanks.length) * 100);
    scoreBox.classList.remove('hidden');
    scoreBox.innerHTML = `
      <span class="score-main">Your Score: ${correctCount}/${blanks.length} — ${pct}%</span>
      <span class="score-feedback">${feedbackFor(pct)}</span>`;
    const unanswered = blanks.filter((r) => r.user === null).length;
    msg.textContent = unanswered
      ? `You left ${unanswered} answer${unanswered > 1 ? 's' : ''} blank — blank answers count as incorrect.`
      : 'All questions answered. Great work!';
  } else if (ans.revealed) {
    scoreBox.classList.add('hidden');
    msg.textContent = 'Answers revealed. Generate a new exercise or press Try Again to practice again.';
  } else {
    scoreBox.classList.add('hidden');
    msg.textContent = `Choose an output (0 or 1) for each blank cell, then press Submit Answers. ${ans.numMissing} missing answer${ans.numMissing > 1 ? 's' : ''}.`;
  }
}

function ansGrade() {
  ans.rows.forEach((row, i) => {
    if (!row.blank) return;
    const sel = $(`#ansTableWrap select[data-row="${i}"]`);
    row.user = sel && sel.value !== '' ? Number(sel.value) : null; // unanswered -> null (counts as incorrect)
  });
  ans.submitted = true;
  const blanks = ans.rows.filter((r) => r.blank);
  const correctCount = blanks.filter((r) => r.user === r.correct).length;
  recordAnswers(blanks.length, correctCount);
  recordGates([ans.gate]);
  renderAnswerMode();
}

function ansSetGate(gate) {
  ans.gate = gate;
  const g = GATES[gate];
  ans.n = g.unary ? 1 : Math.max(2, ans.n);
  ans.numMissing = ansMaxMissing();
  ansGenerate();
}

/* =========================================================
   TAB 4B — RANDOMIZED PRACTICE QUIZ
   ========================================================= */
const pz = { count: 5, questions: [], answers: [], index: 0, phase: 'setup', lastScore: null };

function pzRandomQuestion() {
  const keys = Object.keys(GATES);
  const gate = keys[Math.floor(Math.random() * keys.length)];
  const g = GATES[gate];
  const n = g.unary ? 1 : 2 + Math.floor(Math.random() * 3); // 2, 3 or 4 inputs
  const inputs = Array.from({ length: n }, () => (Math.random() < 0.5 ? 1 : 0));
  return { gate, n, inputs, correct: g.compute(inputs) };
}

function pzStart() {
  pz.questions = Array.from({ length: pz.count }, pzRandomQuestion);
  pz.answers = new Array(pz.count).fill(null);
  pz.index = 0;
  pz.phase = 'playing';
  renderPractice();
}

function pzFinish() {
  pz.phase = 'review';
  const correctCount = pz.questions.filter((q, i) => pz.answers[i] === q.correct).length;
  const pct = Math.round((correctCount / pz.count) * 100);
  pz.lastScore = { correct: correctCount, total: pz.count, pct };
  recordAnswers(pz.count, correctCount);
  recordGates(pz.questions.map((q) => q.gate));
  progress.bestPct = Math.max(progress.bestPct, pct);
  saveProgress();
  renderPractice();
}

function renderPractice() {
  const box = $('#pzContainer');

  if (pz.phase === 'setup') {
    box.innerHTML = `
      <div class="pz-setup">
        <h3 class="card-title">Quiz settings</h3>
        <div class="control-group">
          <label class="control-label" for="pzCount">Number of questions</label>
          <select id="pzCount" class="select">
            ${Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}"${i + 1 === pz.count ? ' selected' : ''}>${i + 1}</option>`).join('')}
          </select>
        </div>
        <p class="note">Each question shows a <strong>random gate</strong> with a <strong>random input combination</strong>
        (2–4 inputs for multi-input gates, always 1 for NOT/Buffer). Choose the correct output Y.</p>
        <button id="pzStart" class="btn">Start Quiz</button>
        ${pz.lastScore ? `<p class="last-score">Last quiz: ${pz.lastScore.correct}/${pz.lastScore.total} — ${pz.lastScore.pct}%</p>` : ''}
      </div>`;
    return;
  }

  if (pz.phase === 'playing') {
    const q = pz.questions[pz.index];
    const last = pz.index === pz.count - 1;
    const dots = pz.questions.map((qq, i) => {
      let cls = 'pz-dot';
      if (i === pz.index) cls += ' current';
      else if (i < pz.index) cls += ' done';
      return `<span class="${cls}" aria-hidden="true"></span>`;
    }).join('');

    box.innerHTML = `
      <div class="pz-progress">Question ${pz.index + 1} of ${pz.count}</div>
      <div class="pz-dots">${dots}</div>
      <div class="pz-gate">
        <div class="gate-symbol-box">${gateDiagramSVG(q.gate, q.inputs, null)}</div>
        <div>
          <h3>${q.gate} Gate</h3>
          <p class="expr">${expressionHTML(q.gate, q.n)}</p>
        </div>
      </div>
      <p class="pz-inputs">Inputs: ${q.inputs.map((v, i) => `${INPUT_LABELS[i]} = ${v}`).join(' &nbsp;·&nbsp; ')}</p>
      <p class="pz-q">What is the output Y?</p>
      <div class="quiz-options" role="group" aria-label="Choose the output">
        <button class="quiz-opt${pz.answers[pz.index] === 0 ? ' selected' : ''}" data-val="0">0<small>LOW · FALSE</small></button>
        <button class="quiz-opt${pz.answers[pz.index] === 1 ? ' selected' : ''}" data-val="1">1<small>HIGH · TRUE</small></button>
      </div>
      <div class="pz-actions">
        <button id="pzNext" class="btn" ${pz.answers[pz.index] === null ? 'disabled' : ''}>
          ${last ? 'Submit Quiz' : 'Next Question'}
        </button>
      </div>`;
    return;
  }

  // review phase
  const { correct, total, pct } = pz.lastScore;
  const items = pz.questions.map((q, i) => {
    const ok = pz.answers[i] === q.correct;
    return `<li class="${ok ? 'correct' : 'incorrect'}">
      <strong>Question ${i + 1} — ${q.gate}</strong> (${q.inputs.map((v, j) => `${INPUT_LABELS[j]}=${v}`).join(', ')})<br>
      Your answer: <strong>${pz.answers[i] === null ? '—' : pz.answers[i]}</strong> ·
      Correct answer: <strong>${q.correct}</strong>
      ${ok ? '' : `<p class="explain">${GATES[q.gate].explain(q.inputs, q.correct)}</p>`}
    </li>`;
  }).join('');

  box.innerHTML = `
    <h3 class="card-title">Quiz complete</h3>
    <div class="score-box" aria-live="polite">
      <span class="score-main">Your Score: ${correct}/${total} — ${pct}%</span>
      <span class="score-feedback">${feedbackFor(pct)}</span>
    </div>
    <ul class="pz-review-list">${items}</ul>
    <div class="pz-actions">
      <button id="pzRestart" class="btn">Restart Quiz</button>
      <button id="pzNewSetup" class="btn btn-secondary">Change Settings</button>
    </div>`;
}

/* =========================================================
   TAB 5 — SCORE & PROGRESS
   ========================================================= */
function renderProgress() {
  const overall = progress.answered ? Math.round((progress.correct / progress.answered) * 100) : 0;
  $('#progressStats').innerHTML = `
    <div class="stat-card"><span class="stat-value">${progress.answered}</span><span class="stat-label">Questions answered</span></div>
    <div class="stat-card"><span class="stat-value">${progress.correct}</span><span class="stat-label">Correct answers</span></div>
    <div class="stat-card"><span class="stat-value">${progress.incorrect}</span><span class="stat-label">Incorrect answers</span></div>
    <div class="stat-card"><span class="stat-value">${overall}%</span><span class="stat-label">Overall percentage</span></div>
    <div class="stat-card"><span class="stat-value">${progress.bestPct}%</span><span class="stat-label">Best quiz score</span></div>`;

  $('#progGates').innerHTML = progress.gates.length
    ? progress.gates.map((g) => `<span class="chip">${g} gate</span>`).join('')
    : '<p class="chips-empty">No gates practiced yet — take a quiz to get started!</p>';
}

/* =========================================================
   K-MAP SOLVER MODULE
   Gray-code K-Map grids, Quine–McCluskey minimization
   (SOP & POS with don't-care support), a safe Boolean
   expression parser (no eval()), step-by-step solutions,
   truth-table conversion, circuit preview, and practice mode.
   ========================================================= */

/* ---------- small math helpers ---------- */
function grayCode(k) {
  // Reflected binary Gray code: adjacent values differ by one bit.
  if (k <= 0) return [0];
  if (k === 1) return [0, 1];
  const prev = grayCode(k - 1);
  const hi = 1 << (k - 1);
  return prev.concat(prev.slice().reverse().map((v) => v | hi));
}

function binStr(v, k) {
  let s = '';
  for (let i = k - 1; i >= 0; i--) s += (v >> i) & 1;
  return s;
}

function popcount(v) {
  let c = 0;
  while (v) { c += v & 1; v >>= 1; }
  return c;
}

function mergeSorted(a, b) {
  // merge two sorted arrays of minterm indices, no duplicates
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] < b[j]) { if (out[out.length - 1] !== a[i]) out.push(a[i]); i++; }
    else if (b[j] < a[i]) { if (out[out.length - 1] !== b[j]) out.push(b[j]); j++; }
    else { if (out[out.length - 1] !== a[i]) out.push(a[i]); i++; j++; }
  }
  while (i < a.length) { if (out[out.length - 1] !== a[i]) out.push(a[i]); i++; }
  while (j < b.length) { if (out[out.length - 1] !== b[j]) out.push(b[j]); j++; }
  return out;
}

/* ---------- K-Map geometry ---------- */
function kmapGeometry(n) {
  // 2 vars: rows = A (1 bit), cols = B (1 bit)      -> 2 x 2
  // 3 vars: rows = A (1 bit), cols = BC (2 bits)    -> 2 x 4
  // 4 vars: rows = AB (2 bits), cols = CD (2 bits)  -> 4 x 4
  let rowBits, colBits;
  if (n === 2) { rowBits = 1; colBits = 1; }
  else if (n === 3) { rowBits = 1; colBits = 2; }
  else { rowBits = 2; colBits = 2; }
  return {
    rowBits, colBits,
    rowLabel: n === 2 ? 'A' : n === 3 ? 'A' : 'AB',
    colLabel: n === 2 ? 'B' : n === 3 ? 'BC' : 'CD',
    rows: grayCode(rowBits),
    cols: grayCode(colBits),
    // minterm index of the cell at row-gray-value r and column-gray-value c
    cell: (r, c) => (r << colBits) | c,
  };
}

/* ---------- Quine–McCluskey ---------- */
/* A term is { value, mask, minterms }:
   - mask bit 1  => variable is FIXED and appears in the term
   - mask bit 0  => variable was ELIMINATED (takes both values in the group)
   - value       => the constant value of the fixed bits
   - minterms    => every cell index the group covers                       */
function findPrimeImplicants(allTerms, n) {
  const fullMask = (1 << n) - 1;
  let current = [...new Set(allTerms)].map((v) => ({ value: v, mask: fullMask, minterms: [v] }));
  const primes = [];
  while (current.length > 0) {
    const next = [];
    const combined = new Set();
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const a = current[i], b = current[j];
        if (a.mask !== b.mask) continue; // groups only combine with identical dash positions
        const diff = a.value ^ b.value;
        // combine only when they differ in exactly ONE FIXED bit
        if (diff !== 0 && (diff & (diff - 1)) === 0 && (diff & a.mask) !== 0) {
          combined.add(i); combined.add(j);
          next.push({
            value: a.value & b.value,
            mask: a.mask & ~diff,
            minterms: mergeSorted(a.minterms, b.minterms),
          });
        }
      }
    }
    // terms that never combined are prime implicants
    current.forEach((t, i) => { if (!combined.has(i)) primes.push(t); });
    // de-duplicate before the next round
    const seen = new Set();
    current = next.filter((t) => {
      const key = t.value + ':' + t.mask;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  return primes;
}

/* Exact minimum cover (branch & bound with memoization).
   Returns the smallest set of prime-implicant indices covering every
   required minterm — fewest terms first, then fewest literals. */
function exactMinCover(primes, required) {
  const reqSet = new Set(required);
  const covering = new Map(); // required minterm -> [prime indices]
  primes.forEach((p, pi) => {
    p.minterms.forEach((m) => {
      if (reqSet.has(m)) {
        if (!covering.has(m)) covering.set(m, []);
        covering.get(m).push(pi);
      }
    });
  });
  const memo = new Map();
  function coverCost(cover) {
    let lits = 0;
    cover.forEach((pi) => { lits += popcount(primes[pi].mask); });
    return cover.length * 100 + lits;
  }
  function solve(unc) {
    if (unc.length === 0) return [];
    const key = unc.join(',');
    if (memo.has(key)) return memo.get(key);
    // fail-first: the required minterm with the fewest covering primes
    let bestList = null;
    for (const m of unc) {
      const list = covering.get(m);
      if (!bestList || list.length < bestList.length) bestList = list;
    }
    let best = null;
    for (const pi of bestList) {
      const covered = new Set(primes[pi].minterms);
      const rest = unc.filter((m) => !covered.has(m));
      const cand = [pi].concat(solve(rest));
      if (best === null || coverCost(cand) < coverCost(best)) best = cand;
    }
    memo.set(key, best);
    return best;
  }
  return solve([...required].sort((a, b) => a - b));
}

/* Full minimization. SOP groups the 1s, POS groups the 0s.
   Don't-care cells may join groups but are never required. */
function minimizeFunction(ones, zeros, dontcares, n, mode) {
  const sol = { mode, n, ones, zeros, dontcares, constant: null, cover: [], primes: [] };
  const target = mode === 'SOP' ? ones : zeros;
  const other = mode === 'SOP' ? zeros : ones;
  if (target.length === 0) {           // nothing to group
    sol.constant = mode === 'SOP' ? 0 : 1;
    return sol;
  }
  if (other.length === 0) {            // every cell is a target (or don't-care)
    sol.constant = mode === 'SOP' ? 1 : 0;
    return sol;
  }
  sol.primes = findPrimeImplicants(target.concat(dontcares), n);
  sol.cover = exactMinCover(sol.primes, target);
  return sol;
}

/* ---------- term rendering ---------- */
function piTermText(pi, n) {
  // plain text, e.g. "A'B" — used for comparisons and multiple-choice options
  const parts = [];
  for (let i = 0; i < n; i++) {
    const bit = n - 1 - i;
    if (pi.mask & (1 << bit)) {
      parts.push(INPUT_LABELS[i] + ((pi.value & (1 << bit)) ? '' : "'"));
    }
  }
  return parts.length === 0 ? '1' : parts.join('');
}

function piTermHTML(pi, n) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const bit = n - 1 - i;
    if (pi.mask & (1 << bit)) {
      const name = INPUT_LABELS[i];
      parts.push(pi.value & (1 << bit) ? name : `<span class="overline">${name}</span>`);
    }
  }
  return parts.length === 0 ? '1' : parts.join(' <span class="op">·</span> ');
}

/* sum-term literals of a POS factor (each literal is the complement
   of the corresponding product-term literal of the zero-groups) */
function posSumLits(pi, n) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const bit = n - 1 - i;
    if (pi.mask & (1 << bit)) {
      parts.push(INPUT_LABELS[i] + ((pi.value & (1 << bit)) ? "'" : ''));
    }
  }
  return parts;
}

function solutionExpressionText(sol) {
  if (sol.constant !== null) return String(sol.constant);
  const n = sol.n;
  if (sol.mode === 'SOP') {
    return sol.cover.map((piIdx) => piTermText(sol.primes[piIdx], n)).join(' + ');
  }
  return sol.cover.map((piIdx) => '(' + posSumLits(sol.primes[piIdx], n).join(' + ') + ')').join('');
}

/* pretty-print a plain-text expression ("A'B + C") as HTML with overlines */
function exprTextToHTML(text) {
  let html = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/[A-D]/.test(ch)) {
      if (text[i + 1] === "'") {
        html += `<span class="overline">${ch}</span>`;
        i++;
      } else {
        html += ch;
      }
    } else if (ch === '+') {
      html += ' <span class="op">+</span> ';
    } else {
      html += ch;
    }
  }
  return html;
}

function piCellsText(pi) {
  return pi.minterms.map((m) => 'm' + m).join(', ');
}

/* ---------- grouping analysis ---------- */
function isCyclicallyContiguous(vals, gray) {
  // A set of positions forms a cyclic arc (contiguous with wraparound)
  // iff at most ONE gap — including the wrap-around gap — is larger than 1.
  if (vals.length <= 1) return { linear: true, cyclic: true };
  const idx = vals.map((v) => gray.indexOf(v)).sort((a, b) => a - b);
  const k = idx.length;
  const L = gray.length;
  const gaps = [];
  for (let i = 1; i < k; i++) gaps.push(idx[i] - idx[i - 1]);
  gaps.push(idx[0] + L - idx[k - 1]); // wrap-around gap
  const largeGaps = gaps.filter((g) => g > 1).length;
  const linear = idx[k - 1] - idx[0] === k - 1;
  const cyclic = largeGaps <= 1;
  return { linear, cyclic };
}

function groupWraps(pi, geo) {
  const rows = new Set(), cols = new Set();
  pi.minterms.forEach((m) => {
    rows.add(m >> geo.colBits);
    cols.add(m & ((1 << geo.colBits) - 1));
  });
  const r = isCyclicallyContiguous([...rows], geo.rows);
  const c = isCyclicallyContiguous([...cols], geo.cols);
  return (r.cyclic && !r.linear) || (c.cyclic && !c.linear);
}

function groupExplanation(pi, n, geo) {
  const kept = [], eliminated = [];
  for (let i = 0; i < n; i++) {
    const bit = n - 1 - i;
    if (pi.mask & (1 << bit)) {
      const val = (pi.value >> bit) & 1;
      kept.push({ name: INPUT_LABELS[i], val, html: val ? INPUT_LABELS[i] : `<span class="overline">${INPUT_LABELS[i]}</span>` });
    } else {
      eliminated.push(INPUT_LABELS[i]);
    }
  }
  return { kept, eliminated, wraps: groupWraps(pi, geo) };
}

function findEssentialPrimes(primes, required) {
  const reqSet = new Set(required);
  const essential = [];
  primes.forEach((p, pi) => {
    const unique = p.minterms.some((m) => {
      if (!reqSet.has(m)) return false;
      return !primes.some((q, qi) => qi !== pi && q.minterms.includes(m));
    });
    if (unique) essential.push(pi);
  });
  return essential;
}

/* ---------- verification ---------- */
function piCoversMinterm(pi, m) {
  return (m & pi.mask) === pi.value;
}

function evaluateSolution(sol, m) {
  if (sol.constant !== null) return sol.constant;
  const covered = sol.cover.some((piIdx) => piCoversMinterm(sol.primes[piIdx], m));
  return sol.mode === 'SOP' ? (covered ? 1 : 0) : (covered ? 0 : 1);
}

/* Compare the simplified function against the original K-Map cells for every
   required 0 and 1 assignment. Don't-care (X) cells are ignored. */
function verifySolution(sol, cells) {
  const mismatches = [];
  const total = 2 ** sol.n;
  for (let m = 0; m < total; m++) {
    const orig = cells[m];
    if (orig === 'X') continue;
    if (evaluateSolution(sol, m) !== orig) mismatches.push(m);
  }
  return mismatches;
}

/* ---------- Boolean expression parser ----------
   Tokenizer + recursive-descent parser. Never uses eval().
   Supports:  AND (·, *, AB)   OR (+, OR)   NOT (', !, NOT)   XOR   parentheses
   Precedence (loosest to tightest): OR  <  XOR  <  AND  <  NOT
----------------------------------------------------------------------------- */
function tokenizeExpr(src) {
  const tokens = [];
  const KEYWORDS = ['AND', 'OR', 'XOR', 'NOT'];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '(' || ch === ')') { tokens.push({ t: 'paren', v: ch }); i++; continue; }
    if (ch === '*' || ch === '+') { tokens.push({ t: 'op', v: ch }); i++; continue; }
    if (ch === "'" || ch === '!') { tokens.push({ t: 'op', v: 'NOT' }); i++; continue; }
    if (ch >= '0' && ch <= '1') { tokens.push({ t: 'const', v: Number(ch) }); i++; continue; }
    // whole-word keywords (case-insensitive)
    let matched = false;
    for (const kw of KEYWORDS) {
      if (i + kw.length <= src.length && src.slice(i, i + kw.length).toUpperCase() === kw) {
        const after = src[i + kw.length];
        if (after === undefined || !/[A-Za-z0-9_]/.test(after)) {
          tokens.push({ t: 'op', v: kw });
          i += kw.length;
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;
    if (/^[a-dA-D]/.test(ch)) { tokens.push({ t: 'var', v: ch.toUpperCase() }); i++; continue; }
    throw new Error(`unexpected character "${ch}"`);
  }
  return tokens;
}

function parseExpression(src) {
  const tokens = tokenizeExpr(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpr() { return parseOR(); }

  function parseOR() {
    let left = parseXOR();
    while (peek() && peek().t === 'op' && (peek().v === 'OR' || peek().v === '+')) {
      next();
      left = { op: 'OR', args: [left, parseXOR()] };
    }
    return left;
  }

  function parseXOR() {
    let left = parseAND();
    while (peek() && peek().t === 'op' && peek().v === 'XOR') {
      next();
      left = { op: 'XOR', args: [left, parseAND()] };
    }
    return left;
  }

  function parseAND() {
    let left = parseNOT();
    while (true) {
      const t = peek();
      if (!t) break;
      if (t.t === 'op' && (t.v === '*' || t.v === 'AND')) {
        next();
        left = { op: 'AND', args: [left, parseNOT()] };
        continue;
      }
      // implicit juxtaposition: "AB" or "A(B+C)" means AND
      if (t.t === 'var' || t.t === 'const' || (t.t === 'paren' && t.v === '(')) {
        left = { op: 'AND', args: [left, parseNOT()] };
        continue;
      }
      break;
    }
    return left;
  }

  function parseNOT() {
    if (peek() && peek().t === 'op' && peek().v === 'NOT') {
      next(); // prefix NOT:  NOT A,  NOT (A+B)
      return { op: 'NOT', args: [parseNOT()] };
    }
    let node = parsePrimary();
    while (peek() && peek().t === 'op' && peek().v === 'NOT') {
      next(); // postfix NOT:  A',  A!,  (A+B)'
      node = { op: 'NOT', args: [node] };
    }
    return node;
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error('unexpected end of expression');
    if (t.t === 'var') { next(); return { op: 'VAR', name: t.v }; }
    if (t.t === 'const') { next(); return { op: 'CONST', value: t.v }; }
    if (t.t === 'paren' && t.v === '(') {
      next();
      const node = parseExpr();
      const close = next();
      if (!close || close.t !== 'paren' || close.v !== ')') {
        throw new Error('missing closing parenthesis');
      }
      return node;
    }
    throw new Error(`unexpected token "${t.v}"`);
  }

  const ast = parseExpr();
  if (pos < tokens.length) throw new Error(`unexpected token "${tokens[pos].v}"`);
  return ast;
}

function evalAST(node, env) {
  switch (node.op) {
    case 'VAR': return env[node.name];
    case 'CONST': return node.value;
    case 'NOT': return evalAST(node.args[0], env) ? 0 : 1;
    case 'AND': return node.args.every((a) => evalAST(a, env)) ? 1 : 0;
    case 'OR': return node.args.some((a) => evalAST(a, env)) ? 1 : 0;
    case 'XOR': return node.args.reduce((acc, a) => acc ^ evalAST(a, env), 0);
    default: throw new Error('unknown node type');
  }
}

function collectVars(node, out) {
  if (node.op === 'VAR') {
    if (!out.includes(node.name)) out.push(node.name);
    return;
  }
  node.args.forEach((a) => collectVars(a, out));
}

/* Parse an expression and evaluate it over all 2^n combinations.
   The map size is chosen from the highest variable used (min 2). */
function analyzeExpression(src) {
  const ast = parseExpression(src);
  const vars = [];
  collectVars(ast, vars);
  vars.sort();
  if (vars.length === 0) throw new Error('the expression must use at least one variable (A–D).');
  const n = Math.max(2, INPUT_LABELS.indexOf(vars[vars.length - 1]) + 1);
  const cells = [];
  for (let m = 0; m < 2 ** n; m++) {
    const env = {};
    for (let i = 0; i < n; i++) env[INPUT_LABELS[i]] = (m >> (n - 1 - i)) & 1;
    cells.push(evalAST(ast, env));
  }
  return { ast, vars, n, cells };
}

/* Does a proposed expression match the K-Map cells for every
   required 0 and 1 assignment? (Don't-cares are free.) */
function expressionMatchesCells(src, cells, n) {
  try {
    const ast = parseExpression(src);
    for (let m = 0; m < 2 ** n; m++) {
      if (cells[m] === 'X') continue;
      const env = {};
      for (let i = 0; i < n; i++) env[INPUT_LABELS[i]] = (m >> (n - 1 - i)) & 1;
      if (evalAST(ast, env) !== cells[m]) return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

/* Toggle the complement of the first literal — used to build
   plausible-but-wrong multiple-choice distractors. */
function alterExpression(text) {
  for (let i = 0; i < text.length; i++) {
    if (/[A-D]/.test(text[i])) {
      if (text[i + 1] === "'") {
        const cand = text.slice(0, i) + text[i] + text.slice(i + 2);
        if (cand !== text) return cand;
      } else {
        const cand = text.slice(0, i) + text[i] + "'" + text.slice(i + 1);
        if (cand !== text) return cand;
      }
    }
  }
  return text;
}

/* ---------- K-Map state ---------- */
const kmap = {
  n: 4,
  cells: new Array(16).fill(0), // each cell: 0 | 1 | 'X'
  mode: 'SOP',
  history: [],                  // undo stack: {index, prev} or {bulk: cells}
  solution: null,
  steps: [],
  stepIdx: 0,
};

const GROUP_COLORS = [
  { solid: '#2563eb' }, { solid: '#16a34a' }, { solid: '#ea580c' }, { solid: '#9333ea' },
  { solid: '#db2777' }, { solid: '#0d9488' }, { solid: '#ca8a04' }, { solid: '#dc2626' },
];

function classifyCells(cells) {
  const ones = [], zeros = [], dontcares = [];
  cells.forEach((v, i) => {
    if (v === 1) ones.push(i);
    else if (v === 'X') dontcares.push(i);
    else zeros.push(i);
  });
  return { ones, zeros, dontcares };
}

function kmapResize(n) {
  kmap.n = n;
  kmap.cells = new Array(2 ** n).fill(0);
  kmap.history = [];
  kmap.solution = null;
  kmap.steps = [];
  kmap.stepIdx = 0;
}

function kmapPushBulk() {
  kmap.history.push({ bulk: kmap.cells.slice() });
  if (kmap.history.length > 300) kmap.history.shift();
}

function kmapUndo() {
  const last = kmap.history.pop();
  if (!last) { playTone(240); return; }
  if (last.bulk) kmap.cells = last.bulk;
  else kmap.cells[last.index] = last.prev;
  kmap.solution = null;
  kmap.steps = [];
  renderKmapGrid();
  renderKmapSolution();
}

function kmapCycleCell(m) {
  kmap.history.push({ index: m, prev: kmap.cells[m] });
  if (kmap.history.length > 300) kmap.history.shift();
  // cycle 0 -> 1 -> X -> 0 (never an invalid value)
  kmap.cells[m] = kmap.cells[m] === 0 ? 1 : kmap.cells[m] === 1 ? 'X' : 0;
  kmap.solution = null;
  kmap.steps = [];
  renderKmapGrid();
  renderKmapSolution();
}

/* ---------- K-Map rendering ---------- */
function kmapGridHTML(n, cells, cellGroup, stepCells) {
  const geo = kmapGeometry(n);
  let html = `<table class="km-grid"><thead><tr>` +
    `<th class="km-corner">${geo.rowLabel} \\ ${geo.colLabel}</th>`;
  geo.cols.forEach((c) => { html += `<th class="km-col-h">${binStr(c, geo.colBits)}</th>`; });
  html += '</tr></thead><tbody>';
  geo.rows.forEach((r) => {
    html += `<tr><th class="km-row-h">${binStr(r, geo.rowBits)}</th>`;
    geo.cols.forEach((c) => {
      const m = geo.cell(r, c);
      const v = cells[m];
      const cls = ['km-cell'];
      if (v === 1) cls.push('km-cell-1');
      else if (v === 'X') cls.push('km-cell-x');
      const g = cellGroup ? cellGroup.get(m) : undefined;
      if (g !== undefined) cls.push('km-group-' + (g % 8));
      if (stepCells && stepCells.includes(m)) cls.push('km-step-hl');
      html += `<td class="${cls.join(' ')}" data-cell="${m}" role="button" tabindex="0" ` +
        `aria-label="Cell m${m}, value ${v}">` +
        `<span class="km-cell-val">${v}</span><span class="km-cell-m">m${m}</span></td>`;
    });
    html += '</tr>';
  });
  return html + '</tbody></table>';
}

function kmapCellGroupMap() {
  const map = new Map();
  const sol = kmap.solution;
  if (sol && sol.cover) {
    sol.cover.forEach((piIdx, gi) => {
      sol.primes[piIdx].minterms.forEach((m) => {
        if (!map.has(m)) map.set(m, gi);
      });
    });
  }
  return map;
}

function renderKmapGrid() {
  const step = kmap.steps[kmap.stepIdx];
  $('#kmGrid').innerHTML = kmapGridHTML(
    kmap.n, kmap.cells, kmapCellGroupMap(), step ? step.cells : null,
  );
  $('#kmMapLabel').textContent =
    `${kmap.n} variable${kmap.n > 2 ? 's' : ''} (${INPUT_LABELS.slice(0, kmap.n).join(', ')})`;
  renderKmapLegend();
}

function renderKmapLegend() {
  const sol = kmap.solution;
  const legend = $('#kmLegend');
  if (!sol || sol.constant !== null || !sol.cover || sol.cover.length === 0) {
    legend.innerHTML = '';
    return;
  }
  legend.innerHTML = sol.cover.map((piIdx, gi) => {
    const pi = sol.primes[piIdx];
    return `<span class="km-group-chip">
      <span class="km-group-dot" style="background:${GROUP_COLORS[gi % 8].solid}"></span>
      Group ${gi + 1} · ${pi.minterms.length} cell${pi.minterms.length > 1 ? 's' : ''}
      (${piCellsText(pi)}) → ${piTermHTML(pi, sol.n)}
    </span>`;
  }).join('');
}

function renderKmapSolution() {
  const sol = kmap.solution;
  const box = $('#kmSolution');
  if (!sol) {
    box.innerHTML = '<p class="hint">Build a function on the map (click cells), enter minterms / maxterms, ' +
      'or type a Boolean expression — then press <strong>Solve</strong>.</p>';
    return;
  }
  const n = sol.n;
  const varNames = INPUT_LABELS.slice(0, n).join(', ');
  const orig = sol.mode === 'SOP'
    ? `F(${varNames}) = Σm(${sol.ones.join(', ') || '—'})${sol.dontcares.length ? `,  Σd(${sol.dontcares.join(', ')})` : ''}`
    : `F(${varNames}) = ΠM(${sol.zeros.join(', ') || '—'})${sol.dontcares.length ? `,  Σd(${sol.dontcares.join(', ')})` : ''}`;
  const mismatches = verifySolution(sol, kmap.cells);
  let html = `
    <div class="km-sol-row"><span class="readout-label">Original function</span><span class="expr">${orig}</span></div>
    <div class="km-sol-row"><span class="readout-label">Simplified (${sol.mode})</span>
      <span class="expr expr-big">${exprTextToHTML(solutionExpressionText(sol))}</span></div>`;
  if (sol.constant !== null) {
    html += `<p class="note">The function is constant — every valid assignment gives the same output, so no grouping is needed.</p>`;
  } else {
    html += `<h4 class="card-title">Groups (${sol.cover.length})</h4><div class="km-legend">` +
      sol.cover.map((piIdx, gi) => {
        const pi = sol.primes[piIdx];
        return `<span class="km-group-chip">
          <span class="km-group-dot" style="background:${GROUP_COLORS[gi % 8].solid}"></span>
          Group ${gi + 1} · ${pi.minterms.length} cell${pi.minterms.length > 1 ? 's' : ''}
          (${piCellsText(pi)}) → ${piTermHTML(pi, n)}
        </span>`;
      }).join('') + '</div>';
  }
  html += mismatches.length === 0
    ? `<p class="km-solution-ok">✓ Verified: matches the original function for all required assignments.</p>`
    : `<p class="km-solution-bad">✗ Verification failed at minterm(s) ${mismatches.join(', ')}.</p>`;
  box.innerHTML = html;
}

function kmapSolve() {
  const { ones, zeros, dontcares } = classifyCells(kmap.cells);
  kmap.solution = minimizeFunction(ones, zeros, dontcares, kmap.n, kmap.mode);
  kmap.steps = buildSteps(kmap.solution);
  kmap.stepIdx = 0;
  renderKmapGrid();
  renderKmapSolution();
  $('#kmStepsCard').classList.remove('hidden');
  renderKmapStep();
  playTone(540);
}

/* ---------- step-by-step solution ---------- */
function buildSteps(sol) {
  const steps = [];
  const n = sol.n;
  const geo = kmapGeometry(n);
  const target = sol.mode === 'SOP' ? sol.ones : sol.zeros;
  const targetWord = sol.mode === 'SOP' ? '1s (minterms)' : '0s (maxterms)';
  const varNames = INPUT_LABELS.slice(0, n).join(', ');

  // Step 1 — identify the terms
  steps.push({
    title: 'Step 1 · Identify the minterms, maxterms and don\'t-cares',
    html: `
      <p>Variables: <strong>${varNames}</strong>. Mode: <strong>${sol.mode}</strong> — we group the ${targetWord}.</p>
      <p>Minterms (output 1): <strong>Σm(${sol.ones.join(', ') || '—'})</strong></p>
      <p>Maxterms (output 0): <strong>ΠM(${sol.zeros.join(', ') || '—'})</strong></p>
      <p>Don't-care terms: <strong>Σd(${sol.dontcares.join(', ') || 'none'})</strong> — these may be used as 1 or 0
      wherever they simplify the result, but they are never required to be covered.</p>`,
    cells: [],
  });

  // Step 2 — populate the map
  steps.push({
    title: `Step 2 · Populate the K-Map with the ${targetWord}`,
    html: `<p>Place a ${sol.mode === 'SOP' ? '1' : '0'} in every listed cell. Because rows and columns use Gray code,
      every pair of neighbouring cells differs in exactly one variable — that is what makes them groupable.</p>`,
    cells: target,
  });

  // constant functions need no grouping
  if (sol.constant !== null) {
    const why = sol.constant === 1
      ? (sol.mode === 'SOP'
        ? 'Every cell is a 1 (or a don\'t-care), so the whole map is a single group — the variables all cancel out.'
        : 'There are no 0s to group, so the function is always true.')
      : (sol.mode === 'SOP'
        ? 'There are no 1s to group, so the function is always false.'
        : 'Every cell is a 0 (or a don\'t-care); grouping all of them and complementing gives a constant false.');
    steps.push({
      title: 'Step 3 · The function is constant',
      html: `<p>${why}</p><p class="expr expr-big">F = ${sol.constant}</p>`,
      cells: [],
    });
    steps.push({
      title: 'Step 4 · Verify',
      html: `<p class="km-solution-ok">✓ A constant function trivially matches the original for every required assignment.</p>`,
      cells: [],
    });
    return steps;
  }

  // Step 3 — all prime implicants
  const piUnion = [];
  sol.primes.forEach((p) => p.minterms.forEach((m) => { if (!piUnion.includes(m)) piUnion.push(m); }));
  steps.push({
    title: 'Step 3 · Find all prime implicants (all valid groups)',
    html: `
      <p>Combine adjacent ${targetWord} — don\'t-cares may help enlarge a group — into the largest possible
      rectangular groups of 1, 2, 4, 8… cells, wrapping around opposite edges when that helps.</p>
      <p>Prime implicants found: <strong>${sol.primes.length}</strong></p>
      <ul>${sol.primes.map((p) =>
        `<li>${p.minterms.length}-cell group (${piCellsText(p)}) → term <span class="expr">${piTermHTML(p, n)}</span></li>`
      ).join('')}</ul>`,
    cells: piUnion,
  });

  // Step 4 — the minimal cover
  const coverUnion = [];
  sol.cover.forEach((piIdx) => sol.primes[piIdx].minterms.forEach((m) => { if (!coverUnion.includes(m)) coverUnion.push(m); }));
  const essentials = findEssentialPrimes(sol.primes, target);
  steps.push({
    title: `Step 4 · Choose the smallest set of groups covering every required ${sol.mode === 'SOP' ? 'minterm' : 'maxterm'}`,
    html: `
      <p>Essential groups (the only group covering a particular cell):
      ${essentials.length
        ? essentials.map((i) => `<span class="expr">${piTermHTML(sol.primes[i], n)}</span>`).join(', ')
        : 'none — several equally small covers exist, so one minimal cover was chosen.'}</p>
      <p>Selected groups: <strong>${sol.cover.length}</strong> — together they cover all
      ${target.length} required cells${sol.dontcares.length ? ', using don\'t-care cells only where they reduce the expression' : ''}.</p>`,
    cells: coverUnion,
  });

  // Steps 5.. — one per group
  sol.cover.forEach((piIdx, gi) => {
    const pi = sol.primes[piIdx];
    const expl = groupExplanation(pi, n, geo);
    const eliminatedCount = n - popcount(pi.mask);
    steps.push({
      title: `Step ${5 + gi} · Group ${gi + 1} — ${pi.minterms.length} cells`,
      html: `
        <p>Cells: <span class="km-step-cells">${piCellsText(pi)}</span>${
          expl.wraps ? ' — this group <strong>wraps around</strong> the map edges: opposite sides of a Gray-code K-Map are adjacent.' : ''}</p>
        <p>Group size ${pi.minterms.length} = 2<sup>${eliminatedCount}</sup>, so ${
          eliminatedCount} variable${eliminatedCount > 1 ? 's are' : ' is'} eliminated.</p>
        ${expl.eliminated.length
          ? `<p>${expl.eliminated.join(', ')} take${expl.eliminated.length > 1 ? ' both values' : 's both values'} inside the group,
             so ${expl.eliminated.length > 1 ? 'they are' : 'it is'} <strong>eliminated</strong>.</p>` : ''}
        ${expl.kept.length
          ? `<p>${expl.kept.map((k) => `<strong>${k.html}</strong>`).join(', ')} stay${expl.kept.length > 1 ? '' : 's'} constant
             (always ${expl.kept.map((k) => k.val).join(' / ')}) → term
             <span class="expr expr-big">${piTermHTML(pi, n)}</span>.</p>`
          : `<p>No variable stays constant — the group covers the whole map, so the term is 1.</p>`}`,
      cells: pi.minterms,
    });
  });

  // final expression
  steps.push({
    title: `Step ${5 + sol.cover.length} · Combine the terms into the final expression`,
    html: `<p class="expr expr-big">F = ${exprTextToHTML(solutionExpressionText(sol))}</p>`,
    cells: coverUnion,
  });

  // verification
  const mismatches = verifySolution(sol, kmap.cells);
  steps.push({
    title: `Step ${6 + sol.cover.length} · Verify against the original function`,
    html: mismatches.length === 0
      ? `<p class="km-solution-ok">✓ The simplified expression matches the original function for every required 0 and 1
         assignment${sol.dontcares.length ? ' (don\'t-care cells are ignored in the comparison)' : ''}.</p>`
      : `<p class="km-solution-bad">✗ Mismatch at minterm(s) ${mismatches.join(', ')} — this simplification is invalid.</p>`,
    cells: [],
  });

  return steps;
}

function renderKmapStep() {
  const step = kmap.steps[kmap.stepIdx];
  if (!step) return;
  $('#kmStepBody').innerHTML = `<h4 class="km-step-title">${step.title}</h4><div class="km-step-body">${step.html}</div>`;
  $('#kmStepCounter').textContent = `Step ${kmap.stepIdx + 1} of ${kmap.steps.length}`;
  $('#kmStepPrev').disabled = kmap.stepIdx === 0;
  $('#kmStepNext').disabled = kmap.stepIdx === kmap.steps.length - 1;
}

/* ---------- minterm / maxterm / don't-care input ---------- */
function parseTermList(str, maxIndex) {
  // accepts "1, 3, 5", "Σm(1,3,5)", "m1 m3", "1 3 5", …
  const clean = String(str).replace(/[ΣΠ()]/g, ' ').replace(/[md]/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return { list: [], error: null };
  const parts = clean.split(/[, ]+/).filter(Boolean);
  const list = [];
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return { list: null, error: `"${p}" is not a valid whole number.` };
    const v = Number(p);
    if (v >= maxIndex) {
      return { list: null, error: `index ${v} is outside the valid range 0–${maxIndex - 1} for ${kmap.n} variable${kmap.n > 2 ? 's' : ''}.` };
    }
    if (list.includes(v)) return { list: null, error: `duplicate index ${v}.` };
    list.push(v);
  }
  return { list, error: null };
}

function applyTermInputs() {
  const msg = $('#kmTermsMsg');
  const max = 2 ** kmap.n;
  const minterms = parseTermList($('#kmMinterms').value, max);
  const maxterms = parseTermList($('#kmMaxterms').value, max);
  const dontcares = parseTermList($('#kmDontcares').value, max);

  const fail = (text) => { msg.textContent = text; msg.className = 'message km-solution-bad'; };
  if (minterms.error) return fail('Minterms: ' + minterms.error);
  if (maxterms.error) return fail('Maxterms: ' + maxterms.error);
  if (dontcares.error) return fail("Don't-cares: " + dontcares.error);

  // an index may appear in at most one field
  const checkOverlap = (a, b, labelA, labelB) => {
    const dup = a.list.find((v) => b.list.includes(v));
    if (dup !== undefined) {
      fail(`Index ${dup} is listed as both ${labelA} and ${labelB} — each index may only be used once.`);
      return true;
    }
    return false;
  };
  if (checkOverlap(minterms, maxterms, 'a minterm (output 1)', 'a maxterm (output 0)')) return;
  if (checkOverlap(minterms, dontcares, 'a minterm (output 1)', "a don't-care")) return;
  if (checkOverlap(maxterms, dontcares, 'a maxterm (output 0)', "a don't-care")) return;

  kmapPushBulk();
  const total = 2 ** kmap.n;
  // if only maxterms were supplied, unspecified cells default to 1; otherwise 0
  const fill = (minterms.list.length === 0 && maxterms.list.length > 0) ? 1 : 0;
  const cells = new Array(total).fill(fill);
  minterms.list.forEach((m) => { cells[m] = 1; });
  maxterms.list.forEach((m) => { cells[m] = 0; });
  dontcares.list.forEach((m) => { cells[m] = 'X'; });
  kmap.cells = cells;
  kmap.solution = null;
  kmap.steps = [];
  msg.textContent = `Applied — Σm(${minterms.list.join(', ') || '—'}), ΠM(${maxterms.list.join(', ') || '—'}), Σd(${dontcares.list.join(', ') || '—'}).`;
  msg.className = 'message km-solution-ok';
  renderKmapGrid();
  renderKmapSolution();
}

/* ---------- truth table from K-Map ---------- */
function renderKmapTruthTable() {
  const n = kmap.n;
  const combos = generateCombos(n);
  const rows = combos.map((inputs) => {
    let m = 0;
    inputs.forEach((b) => { m = (m << 1) | b; });
    const v = kmap.cells[m];
    return `<tr>${inputs.map((b) => `<td>${b}</td>`).join('')}` +
      `<td class="y-cell ${v === 1 ? 'y1' : ''}">${v}</td></tr>`;
  }).join('');
  const head = INPUT_LABELS.slice(0, n).map((l) => `<th>${l}</th>`).join('') + '<th>Y</th>';
  $('#kmTruthWrap').innerHTML = `
    <table class="tt-table">
      <caption>K-Map function — ${n} variable${n > 1 ? 's' : ''} (X = don't-care)</caption>
      <thead><tr>${head}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  $('#kmTruthCard').classList.remove('hidden');
  $('#kmVerifyResult').innerHTML = '';
  $('#kmCircuitWrap').innerHTML = '';
}

function kmapVerify() {
  const sol = kmap.solution;
  const box = $('#kmVerifyResult');
  if (!sol) { box.innerHTML = '<p class="km-solution-bad">Press Solve first.</p>'; return; }
  const { ones, zeros } = classifyCells(kmap.cells);
  const mismatches = verifySolution(sol, kmap.cells);
  box.innerHTML = mismatches.length === 0
    ? `<p class="km-solution-ok">✓ Verified: the simplified ${sol.mode} expression equals the original
       function for all ${ones.length + zeros.length} required assignments (don't-cares ignored).</p>`
    : `<p class="km-solution-bad">✗ Invalid simplification — mismatches at minterm(s)
       ${mismatches.join(', ')}.</p>`;
}

/* ---------- circuit preview (layers of the existing gate symbols) ---------- */
function circuitLayer(label, chips) {
  return `<div class="circuit-layer">
    <span class="circuit-layer-label">${label}</span>
    <div class="circuit-chips">${chips.join('')}</div>
  </div>`;
}

function circuitChip(name, sub) {
  return `<span class="circuit-chip"><strong>${name}</strong>${sub ? `<span class="circuit-chip-sub">${sub}</span>` : ''}</span>`;
}

function renderKmapCircuit() {
  const sol = kmap.solution;
  const wrap = $('#kmCircuitWrap');
  if (!sol) { wrap.innerHTML = '<p class="hint">Press Solve first.</p>'; return; }
  if (sol.constant !== null) {
    wrap.innerHTML = `<p class="hint">A constant function needs no gates — tie the output to
      ${solutionExpressionText(sol)}.</p>`;
    return;
  }
  const n = sol.n;
  const terms = sol.cover.map((piIdx) => sol.primes[piIdx]);
  const inputs = INPUT_LABELS.slice(0, n);
  const litSet = new Set();
  terms.forEach((pi) => {
    for (let i = 0; i < n; i++) {
      const bit = n - 1 - i;
      if (pi.mask & (1 << bit)) litSet.add(i + ':' + ((pi.value >> bit) & 1));
    }
  });

  let html = '<div class="circuit-flow">';
  html += circuitLayer('Inputs', inputs.map((v) => circuitChip(v)));

  const complemented = [...new Set(
    [...litSet].filter((k) => k.endsWith(':0')).map((k) => inputs[Number(k.split(':')[0])]),
  )];
  if (complemented.length) {
    html += '<div class="circuit-arrow" aria-hidden="true">↓</div>';
    html += circuitLayer('Inverters (NOT)', complemented.map((v) => circuitChip(`NOT ${v}`, `${v} → ${v}'`)));
  }

  if (sol.mode === 'SOP') {
    html += '<div class="circuit-arrow" aria-hidden="true">↓</div>';
    html += circuitLayer('AND gates (product terms)',
      terms.map((pi, i) => circuitChip(`AND ${i + 1}`, piTermText(pi, n))));
    html += '<div class="circuit-arrow" aria-hidden="true">↓</div>';
    html += circuitLayer('OR gate (sum)',
      [circuitChip('OR', 'Y = ' + terms.map((pi) => piTermText(pi, n)).join(' + '))]);
  } else {
    html += '<div class="circuit-arrow" aria-hidden="true">↓</div>';
    html += circuitLayer('OR gates (sum terms)',
      terms.map((pi, i) => circuitChip(`OR ${i + 1}`, '(' + posSumLits(pi, n).join(' + ') + ')')));
    html += '<div class="circuit-arrow" aria-hidden="true">↓</div>';
    html += circuitLayer('AND gate (product)',
      [circuitChip('AND', 'Y = ' + terms.map((pi) => '(' + posSumLits(pi, n).join(' + ') + ')').join(''))]);
  }
  html += '</div>';
  wrap.innerHTML = html;
}

/* ---------- K-Map practice mode ---------- */
const kp = {
  difficulty: 'beginner',
  phase: 'setup', // setup | playing | feedback | results
  questions: [],
  index: 0,
  answers: [],
};
const KP_ROUND = 5;

function kpStartRound() {
  kp.questions = [];
  let guard = 0;
  while (kp.questions.length < KP_ROUND && guard < 80) {
    guard++;
    const q = kpGenerateQuestion(kp.difficulty);
    if (q) kp.questions.push(q);
  }
  kp.index = 0;
  kp.answers = [];
  kp.phase = 'playing';
  renderKmapPractice();
}

function kpGenerateQuestion(difficulty) {
  const n = difficulty === 'beginner' ? 2 : difficulty === 'intermediate' ? 3 : 4;
  const pool = {
    beginner: ['fill', 'expression', 'verify'],
    intermediate: ['fill', 'expression', 'group', 'verify'],
    advanced: ['expression', 'group', 'verify', 'wrap', 'dc'],
  }[difficulty];
  const type = pool[Math.floor(Math.random() * pool.length)];
  const total = 2 ** n;

  // random function
  let ones = [];
  for (let m = 0; m < total; m++) if (Math.random() < 0.45) ones.push(m);
  if (ones.length === 0) ones = [Math.floor(Math.random() * total)];
  let dc = [];
  if (type === 'dc' || (difficulty === 'advanced' && Math.random() < 0.4)) {
    const rest = shuffle([...Array(total).keys()].filter((m) => !ones.includes(m)));
    dc = rest.slice(0, Math.max(1, Math.floor(rest.length / 3)));
  }
  const zeros = [];
  for (let m = 0; m < total; m++) if (!ones.includes(m) && !dc.includes(m)) zeros.push(m);

  const sol = minimizeFunction(ones, zeros, dc, n, 'SOP');
  const correctText = solutionExpressionText(sol);
  if (type !== 'fill' && (correctText === '0' || correctText === '1')) return null;

  const cells = new Array(total).fill(0);
  ones.forEach((m) => { cells[m] = 1; });
  dc.forEach((m) => { cells[m] = 'X'; });
  const varNames = INPUT_LABELS.slice(0, n).join(', ');

  /* ---- type: fill the K-Map from minterms ---- */
  if (type === 'fill') {
    return {
      type, n, cells,
      userCells: new Array(total).fill(0),
      prompt: `Mark the K-Map for F(${varNames}) = Σm(${ones.join(', ')}). ` +
        'Click cells to cycle 0 → 1 → X → 0; all non-minterm cells must stay 0.',
    };
  }

  /* ---- type: choose the correct simplified expression ---- */
  if (type === 'expression' || type === 'dc') {
    const opts = new Map();
    opts.set(correctText, true);
    // distractor: full (unsimplified) minterm expansion
    const fullMask = (1 << n) - 1;
    const expansion = ones.map((m) => piTermText({ value: m, mask: fullMask }, n)).join(' + ');
    if (expansion !== correctText) opts.set(expansion, false);
    // distractor: one literal flipped
    const altered = alterExpression(correctText);
    if (altered !== correctText && !expressionMatchesCells(altered, cells, n)) opts.set(altered, false);
    // distractor: simplification that ignores don't-cares
    if (dc.length) {
      const noDcText = solutionExpressionText(minimizeFunction(ones, zeros, [], n, 'SOP'));
      if (noDcText !== correctText && !opts.has(noDcText)) opts.set(noDcText, false);
    }
    // fallback distractors
    for (const fb of ['A + B', "A' + B", 'AB', '1', '0']) {
      if (opts.size >= 4) break;
      if (!opts.has(fb) && !expressionMatchesCells(fb, cells, n)) opts.set(fb, false);
    }
    const options = shuffle([...opts.entries()]).map(([text, ok]) => ({ text, ok }));
    const usedDc = [];
    sol.cover.forEach((piIdx) => {
      sol.primes[piIdx].minterms.forEach((m) => { if (dc.includes(m) && !usedDc.includes(m)) usedDc.push(m); });
    });
    const noDcText = dc.length ? solutionExpressionText(minimizeFunction(ones, zeros, [], n, 'SOP')) : null;
    return {
      type, n, cells, options,
      prompt: type === 'dc'
        ? `Simplify F(${varNames}) = Σm(${ones.join(', ')}) with don't-cares Σd(${dc.join(', ')}):`
        : `What is the simplified SOP expression for the function shown?`,
      explanation: `The minimal cover gives <span class="expr expr-big">F = ${exprTextToHTML(correctText)}</span>.` +
        (dc.length
          ? ` Don't-care cells ${usedDc.join(', ')} were treated as 1s to enlarge the groups` +
            (noDcText !== correctText ? `; ignoring them would give the more complex F = ${exprTextToHTML(noDcText)}` : '') + '.'
          : ''),
    };
  }

  /* ---- type: identify the largest valid group ---- */
  if (type === 'group') {
    const sorted = [...sol.primes].sort((a, b) => b.minterms.length - a.minterms.length);
    const largest = sorted[0];
    const smaller = sorted.find((p) => p.minterms.length < largest.minterms.length);
    const invalid = { minterms: [...largest.minterms] };
    for (let m = 0; m < total; m++) {
      if (!invalid.minterms.includes(m)) { invalid.minterms.push(m); break; }
    }
    const optSet = new Map();
    optSet.set(piCellsText(largest), true);
    if (smaller) optSet.set(piCellsText(smaller), false);
    optSet.set(piCellsText(invalid), false);
    const single = sol.primes.find((p) => p.minterms.length === 1);
    if (single && optSet.size < 4 && !optSet.has(piCellsText(single))) {
      optSet.set(piCellsText(single), false);
    }
    const options = shuffle([...optSet.entries()]).map(([text, ok]) => ({ text, ok }));
    return {
      type, n, cells, options,
      prompt: 'Which is the LARGEST valid group of 1s in this K-Map?',
      explanation: `<span class="km-step-cells">${piCellsText(largest)}</span> is the largest valid group —
        ${largest.minterms.length} cells (a power of two) forming a rectangle in the Gray-code grid,
        giving the term <span class="expr">${piTermHTML(largest, n)}</span>. A valid group must always
        contain 1, 2, 4, 8… cells, so the ${invalid.minterms.length}-cell option is invalid,
        and smaller groups are correct but not minimal.`,
    };
  }

  /* ---- type: verify a proposed simplification ---- */
  if (type === 'verify') {
    const useCorrect = Math.random() < 0.5;
    let proposed = correctText;
    if (!useCorrect) {
      proposed = alterExpression(correctText);
      if (expressionMatchesCells(proposed, cells, n)) proposed = alterExpression(proposed);
    }
    const isCorrect = expressionMatchesCells(proposed, cells, n);
    return {
      type, n, cells, proposed, isCorrect,
      prompt: `A student claims F(${varNames}) simplifies to
        <span class="expr expr-big">${exprTextToHTML(proposed)}</span>. Is this correct?`,
      explanation: isCorrect
        ? `Yes — the proposed expression matches the original function for every required 0 and 1
           assignment${dc.length ? ' (don\'t-cares ignored)' : ''}.`
        : `No — the proposed expression does not match the original function. The correct
           simplification is <span class="expr">F = ${exprTextToHTML(correctText)}</span>.`,
    };
  }

  /* ---- type: wraparound grouping (advanced) ---- */
  const truth = Math.random() < 0.5;
  let cellSet, answer, expl;
  if (truth) {
    const wraps = [
      { set: [0, 2, 8, 10], term: "B' · D'" },
      { set: [0, 1, 8, 9], term: "B' · C'" },
      { set: [2, 3, 10, 11], term: "B · C'" },
    ];
    const pick = wraps[Math.floor(Math.random() * wraps.length)];
    cellSet = pick.set;
    answer = true;
    expl = `Yes — these 4 cells form a valid group that wraps around the map edges: rows 00 and 10
      are adjacent in Gray code, as are columns 00 and 10. The varying variables are eliminated,
      leaving the term <span class="expr">${pick.term}</span>.`;
  } else {
    const bad = [
      { set: [0, 1, 2], why: 'there are only 3 cells — groups must contain 1, 2, 4, 8… cells (a power of two)' },
      { set: [0, 1, 4, 6], why: 'the cells do not form a rectangle in the Gray-code grid' },
    ];
    const pick = bad[Math.floor(Math.random() * bad.length)];
    cellSet = pick.set;
    answer = false;
    expl = `No — ${pick.why}.`;
  }
  const showCells = new Array(total).fill(0);
  cellSet.forEach((m) => { showCells[m] = 1; });
  return {
    type: 'verify', n, cells: showCells, isCorrect: answer, wrapSet: cellSet,
    prompt: `Can the marked cells (${piCellsText({ minterms: cellSet })}) be combined into a single valid group?`,
    explanation: expl,
  };
}

function renderKmapPractice() {
  const box = $('#kmPractice');

  if (kp.phase === 'setup') {
    box.innerHTML = `
      <div class="pz-setup">
        <div class="control-group">
          <span class="control-label">Difficulty</span>
          <div class="seg" id="kpDifficulty">
            <button class="seg-btn ${kp.difficulty === 'beginner' ? 'active' : ''}" data-d="beginner">Beginner — 2 variables</button>
            <button class="seg-btn ${kp.difficulty === 'intermediate' ? 'active' : ''}" data-d="intermediate">Intermediate — 3 variables</button>
            <button class="seg-btn ${kp.difficulty === 'advanced' ? 'active' : ''}" data-d="advanced">Advanced — 4 variables</button>
          </div>
        </div>
        <p class="note">${KP_ROUND} questions per round: fill K-Maps from minterms, pick the correct
        simplified expression, identify the largest valid group, verify proposed simplifications,
        and handle wraparound and don't-care conditions.</p>
        <button id="kpStart" class="btn">Start Practice Round</button>
      </div>`;
    return;
  }

  if (kp.phase === 'results') {
    const correct = kp.answers.filter((a) => a.ok).length;
    const pct = Math.round((correct / kp.answers.length) * 100);
    box.innerHTML = `
      <div class="score-box" aria-live="polite">
        <span class="score-main">Your Score: ${correct}/${kp.answers.length} — ${pct}%</span>
        <span class="score-feedback">${feedbackFor(pct)}</span>
      </div>
      <ul class="pz-review-list">
        ${kp.questions.map((q, i) => `
          <li class="${kp.answers[i].ok ? 'correct' : 'incorrect'}">
            <strong>Question ${i + 1} (${q.type})</strong> — ${kp.answers[i].ok ? 'Correct' : 'Incorrect'}
            <p class="explain">${q.explanation}</p>
          </li>`).join('')}
      </ul>
      <div class="pz-actions">
        <button id="kpRetry" class="btn">Try Again</button>
        <button id="kpChangeDiff" class="btn btn-secondary">Change Difficulty</button>
      </div>`;
    return;
  }

  const q = kp.questions[kp.index];
  const isLast = kp.index === kp.questions.length - 1;
  const typeLabel = {
    fill: 'Fill the K-Map', expression: 'Simplify (SOP)', group: 'Largest group',
    verify: q.wrapSet ? 'Wraparound' : 'Verify', dc: "Don't-cares",
  }[q.type];
  const meta = `
    <div class="km-practice-meta">
      <span class="km-type-badge">${typeLabel}</span>
      <span class="pz-progress">Question ${kp.index + 1} of ${kp.questions.length} · ${q.n} variable${q.n > 2 ? 's' : ''}</span>
    </div>`;

  if (kp.phase === 'feedback') {
    const a = kp.answers[kp.index];
    box.innerHTML = meta + `
      <p class="${a.ok ? 'km-solution-ok' : 'km-solution-bad'}">${a.ok ? '✓ Correct!' : '✗ Not quite.'}</p>
      <p>${q.explanation}</p>
      <div class="pz-actions">
        <button id="kpNext" class="btn">${isLast ? 'See Results' : 'Next Question'}</button>
      </div>`;
    return;
  }

  // playing
  if (q.type === 'fill') {
    box.innerHTML = meta + `
      <p>${q.prompt}</p>
      <div id="kpFillGrid">${kmapGridHTML(q.n, q.userCells, null, null)}</div>
      <div class="pz-actions"><button id="kpSubmit" class="btn">Submit Answer</button></div>`;
  } else if (q.type === 'verify') {
    const yes = q.wrapSet ? 'Yes — valid group' : 'Correct';
    const no = q.wrapSet ? 'No — invalid group' : 'Incorrect';
    box.innerHTML = meta + `
      <p>${q.prompt}</p>
      <div id="kpQGrid">${kmapGridHTML(q.n, q.cells, null, null)}</div>
      <div class="km-options">
        <button class="km-option" data-opt="yes">${yes}</button>
        <button class="km-option" data-opt="no">${no}</button>
      </div>
      <div class="pz-actions"><button id="kpSubmit" class="btn" disabled>Submit Answer</button></div>`;
  } else {
    box.innerHTML = meta + `
      <p>${q.prompt}</p>
      <div id="kpQGrid">${kmapGridHTML(q.n, q.cells, null, null)}</div>
      <div class="km-options">
        ${q.options.map((o, i) => `<button class="km-option" data-opt="${i}">${exprTextToHTML(o.text)}</button>`).join('')}
      </div>
      <div class="pz-actions"><button id="kpSubmit" class="btn" disabled>Submit Answer</button></div>`;
  }
}

function kpGrade() {
  const q = kp.questions[kp.index];
  let ok = false;
  if (q.type === 'fill') {
    ok = q.userCells.every((v, m) => v === q.cells[m]);
  } else if (q.type === 'verify') {
    ok = (q.selection === 'yes') === q.isCorrect;
  } else {
    const sel = Number(q.selection);
    ok = q.options[sel] && q.options[sel].ok;
  }
  kp.answers[kp.index] = { ok };
  kp.phase = 'feedback';
  renderKmapPractice();
  playTone(ok ? 540 : 240);
}

/* ---------- integration with the rest of LogicLab ---------- */
function kmapCellsFromGate(gate, n) {
  const g = GATES[gate];
  const cells = [];
  for (let m = 0; m < 2 ** n; m++) {
    const inputs = [];
    for (let b = 0; b < n; b++) inputs.push((m >> (n - 1 - b)) & 1);
    cells.push(g.unary ? g.compute([inputs[0]]) : g.compute(inputs));
  }
  return cells;
}

function loadKmapFromCells(cells, n) {
  kmap.n = n;
  kmap.cells = cells.slice();
  kmap.history = [];
  kmap.solution = null;
  kmap.steps = [];
  kmap.stepIdx = 0;
  setSegActive($('#kmVars'), n);
  renderKmapGrid();
  renderKmapSolution();
  kmapSolve();
}

/* ---------- K-Map wiring ---------- */
function initKmap() {
  // variable count
  wireSeg($('#kmVars'), (n) => {
    kmapResize(n);
    setSegActive($('#kmVars'), n);
    $('#kmStepsCard').classList.add('hidden');
    $('#kmTruthCard').classList.add('hidden');
    renderKmapGrid();
    renderKmapSolution();
  });

  // SOP / POS mode
  $('#kmMode').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    $$('#kmMode .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    kmap.mode = btn.dataset.mode;
    if (kmap.solution) kmapSolve(); // re-solve in the new form
  });

  // map actions
  $('#kmSolve').addEventListener('click', kmapSolve);
  $('#kmReset').addEventListener('click', () => {
    kmapPushBulk();
    kmap.cells.fill(0);
    kmap.solution = null;
    kmap.steps = [];
    $('#kmStepsCard').classList.add('hidden');
    renderKmapGrid();
    renderKmapSolution();
  });
  $('#kmFillZeros').addEventListener('click', () => {
    kmapPushBulk();
    kmap.cells.fill(0);
    kmap.solution = null;
    kmap.steps = [];
    renderKmapGrid();
    renderKmapSolution();
  });
  $('#kmFillOnes').addEventListener('click', () => {
    kmapPushBulk();
    kmap.cells.fill(1);
    kmap.solution = null;
    kmap.steps = [];
    renderKmapGrid();
    renderKmapSolution();
  });
  $('#kmRandom').addEventListener('click', () => {
    kmapPushBulk();
    kmap.cells = kmap.cells.map(() => {
      const r = Math.random();
      return r < 0.45 ? 0 : r < 0.9 ? 1 : 'X';
    });
    kmap.solution = null;
    kmap.steps = [];
    renderKmapGrid();
    renderKmapSolution();
  });
  $('#kmUndo').addEventListener('click', kmapUndo);

  // cell interaction (click + keyboard)
  $('#kmGrid').addEventListener('click', (e) => {
    const cell = e.target.closest('.km-cell');
    if (cell) kmapCycleCell(Number(cell.dataset.cell));
  });
  $('#kmGrid').addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('km-cell')) {
      e.preventDefault();
      kmapCycleCell(Number(e.target.dataset.cell));
    }
  });

  // minterm / maxterm / don't-care inputs
  $('#kmApplyTerms').addEventListener('click', applyTermInputs);

  // Boolean expression input
  $('#kmParseExpr').addEventListener('click', () => {
    const msg = $('#kmExprMsg');
    const src = $('#kmExprInput').value.trim();
    if (!src) {
      msg.textContent = 'Enter a Boolean expression first.';
      msg.className = 'message km-solution-bad';
      return;
    }
    try {
      const analysis = analyzeExpression(src);
      kmapPushBulk();
      kmap.n = analysis.n;
      kmap.cells = analysis.cells;
      kmap.history = [];
      kmap.solution = null;
      kmap.steps = [];
      setSegActive($('#kmVars'), kmap.n);
      msg.innerHTML = `Parsed <span class="expr">${src}</span> — built a ${analysis.n}-variable K-Map
        (${INPUT_LABELS.slice(0, analysis.n).join(', ')}) and solved it below.`;
      msg.className = 'message km-solution-ok';
      renderKmapGrid();
      renderKmapSolution();
      kmapSolve();
    } catch (err) {
      msg.textContent = 'Invalid expression: ' + err.message;
      msg.className = 'message km-solution-bad';
    }
  });

  // step-by-step panel
  $('#kmStepsBtn').addEventListener('click', () => {
    if (!kmap.solution) kmapSolve();
    $('#kmStepsCard').classList.toggle('hidden');
    renderKmapStep();
  });
  $('#kmStepPrev').addEventListener('click', () => {
    if (kmap.stepIdx > 0) { kmap.stepIdx--; renderKmapStep(); renderKmapGrid(); }
  });
  $('#kmStepNext').addEventListener('click', () => {
    if (kmap.stepIdx < kmap.steps.length - 1) { kmap.stepIdx++; renderKmapStep(); renderKmapGrid(); }
  });

  // truth table from K-Map + verification + circuit
  $('#kmTruthTable').addEventListener('click', renderKmapTruthTable);
  $('#kmVerify').addEventListener('click', kmapVerify);
  $('#kmCircuit').addEventListener('click', renderKmapCircuit);

  // generator integration: "Generate K-Map from Truth Table"
  $('#genToKmap').addEventListener('click', () => {
    loadKmapFromCells(kmapCellsFromGate(gen.gate, gen.n), gen.n);
    showSection('section-kmap');
  });

  // practice mode
  $('#kmPractice').addEventListener('click', (e) => {
    if (e.target.closest('#kpStart') || e.target.closest('#kpRetry')) {
      kpStartRound();
    } else if (e.target.closest('#kpChangeDiff')) {
      kp.phase = 'setup';
      renderKmapPractice();
    } else if (e.target.closest('#kpNext')) {
      if (kp.index === kp.questions.length - 1) {
        kp.phase = 'results';
        const correct = kp.answers.filter((a) => a.ok).length;
        recordAnswers(kp.answers.length, correct);
      } else {
        kp.index += 1;
        kp.phase = 'playing';
      }
      renderKmapPractice();
    } else if (e.target.closest('#kpSubmit')) {
      kpGrade();
    } else if (e.target.closest('.km-option')) {
      const opt = e.target.closest('.km-option');
      $$('#kmPractice .km-option').forEach((o) => o.classList.toggle('selected', o === opt));
      kp.questions[kp.index].selection = opt.dataset.opt;
      const submit = $('#kpSubmit');
      if (submit) submit.disabled = false;
    } else if (e.target.closest('#kpFillGrid .km-cell')) {
      const cell = e.target.closest('.km-cell');
      const m = Number(cell.dataset.cell);
      const q = kp.questions[kp.index];
      q.userCells[m] = q.userCells[m] === 0 ? 1 : q.userCells[m] === 1 ? 'X' : 0;
      $('#kpFillGrid').innerHTML = kmapGridHTML(q.n, q.userCells, null, null);
    } else if (e.target.closest('#kpDifficulty .seg-btn')) {
      const btn = e.target.closest('#kpDifficulty .seg-btn');
      kp.difficulty = btn.dataset.d;
      $$('#kpDifficulty .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    }
  });

  // initial render
  renderKmapGrid();
  renderKmapSolution();
}

/* =========================================================
   Navigation, theme, sound, global events
   ========================================================= */
function showSection(id) {
  $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.target === id));
  $$('.section').forEach((s) => s.classList.toggle('active', s.id === id));
  closeSidebar();
  if (id === 'section-progress') renderProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openSidebar() {
  $('#sidebar').classList.add('open');
  $('#overlay').classList.add('show');
  $('#menuToggle').setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#overlay').classList.remove('show');
  $('#menuToggle').setAttribute('aria-expanded', 'false');
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('logiclab-theme', theme); } catch (err) { /* private mode */ }
  $('#themeToggle').setAttribute('aria-pressed', String(theme === 'dark'));
  $('#iconSun').style.display = theme === 'dark' ? '' : 'none';
  $('#iconMoon').style.display = theme === 'dark' ? 'none' : '';
}

/* Segmented-control helpers */
function setSegActive(segEl, n) {
  $$('.seg-btn', segEl).forEach((b) => b.classList.toggle('active', Number(b.dataset.n) === n));
}
function setSegDisabled(segEl, disabled) {
  segEl.classList.toggle('disabled', disabled);
  segEl.setAttribute('aria-disabled', String(disabled));
}
function wireSeg(segEl, onChange) {
  segEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn || segEl.classList.contains('disabled')) return;
    onChange(Number(btn.dataset.n));
  });
}

/* Populate the gate <select> dropdowns (simulator uses buttons instead) */
function fillGateSelect(sel) {
  sel.innerHTML = Object.values(GATES)
    .map((g) => `<option value="${g.name}">${g.name} Gate</option>`).join('');
}

/* ------------------------------
   Initialization & event wiring
   ------------------------------ */
function init() {
  /* Theme: remember choice, otherwise follow the OS preference */
  let initialTheme = 'light';
  try {
    initialTheme = localStorage.getItem('logiclab-theme')
      || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch (err) { /* ignore */ }
  setTheme(initialTheme);

  $('#themeToggle').addEventListener('click', () => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  $('#soundToggle').addEventListener('click', () => {
    soundOn = !soundOn;
    $('#soundToggle').setAttribute('aria-pressed', String(soundOn));
    $('#soundWaves').style.display = soundOn ? '' : 'none';
    $('#soundOff').style.display = soundOn ? 'none' : '';
    if (soundOn) playTone(540); // audible confirmation when enabled
  });

  $('#musicToggle').addEventListener('click', () => {
    musicOn = !musicOn;
    $('#musicToggle').setAttribute('aria-pressed', String(musicOn));
    if (musicOn) musicStart();
    else musicStop();
  });

  /* Navigation */
  $$('.nav-item').forEach((b) => b.addEventListener('click', () => showSection(b.dataset.target)));
  $$('.hero-nav [data-target]').forEach((b) => b.addEventListener('click', () => showSection(b.dataset.target)));
  $('#menuToggle').addEventListener('click', () => {
    $('#sidebar').classList.contains('open') ? closeSidebar() : openSidebar();
  });
  $('#overlay').addEventListener('click', closeSidebar);

  /* Learn tab */
  renderLearn();
  $('#gateCards').addEventListener('click', (e) => {
    const sw = e.target.closest('.switch');
    if (sw) {
      const card = sw.closest('.gate-card');
      const gate = sw.dataset.gate;
      const idx = Number(sw.dataset.index);
      demoState[gate][idx] = demoState[gate][idx] === 1 ? 0 : 1;
      updateDemoCard(card);
      playTone(demoState[gate][idx] ? 540 : 240);
      return;
    }
    const openSim = e.target.closest('.open-sim');
    if (openSim) {
      simSetGate(openSim.dataset.gate);
      showSection('section-simulator');
    }
    const openKmap = e.target.closest('.open-kmap');
    if (openKmap) {
      loadKmapFromCells(kmapCellsFromGate(openKmap.dataset.gate, 2), 2);
      showSection('section-kmap');
    }
  });

  /* Simulator tab */
  $('#simGateButtons').addEventListener('click', (e) => {
    const btn = e.target.closest('.gate-btn');
    if (btn) simSetGate(btn.dataset.gate);
  });
  wireSeg($('#simInputCount'), (n) => {
    sim.n = n;
    sim.inputs = fitInputs(sim.inputs, sim.n);
    renderSimulator();
    renderGeneratorTable();
  });
  $('#simSwitches').addEventListener('click', (e) => {
    const sw = e.target.closest('.switch');
    if (!sw) return;
    const idx = Number(sw.dataset.index);
    sim.inputs[idx] = sim.inputs[idx] === 1 ? 0 : 1;
    renderSimSwitches();
    renderSimOutput();
    renderGeneratorTable(); // keep the highlighted row in sync
  });
  $('#simReset').addEventListener('click', () => {
    sim.inputs = sim.inputs.map(() => 0);
    renderSimSwitches();
    renderSimOutput();
    renderGeneratorTable();
  });

  /* Generator tab */
  fillGateSelect($('#genGateSelect'));
  $('#genGateSelect').value = gen.gate;
  $('#genGateSelect').addEventListener('change', (e) => genSetGate(e.target.value));
  wireSeg($('#genInputCount'), (n) => {
    gen.n = n;
    renderGenControls();
    renderGeneratorTable();
  });
  $('#genToggleTable').addEventListener('click', () => {
    gen.visible = !gen.visible;
    renderGeneratorTable();
  });
  $('#genCSV').addEventListener('click', downloadCSV);
  $('#genPrint').addEventListener('click', printTable);
  $('#genReset').addEventListener('click', () => {
    gen.gate = 'AND';
    gen.n = 2;
    gen.visible = true;
    $('#genGateSelect').value = 'AND';
    renderGenControls();
    renderGeneratorTable();
  });

  /* Quiz tab — mode switch */
  $('#quizModeSeg').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    $$('#quizModeSeg .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    const mode = btn.dataset.mode;
    $('#quizAnswerPane').classList.toggle('hidden', mode !== 'answer');
    $('#quizPracticePane').classList.toggle('hidden', mode !== 'practice');
  });

  /* Quiz tab — answer mode */
  fillGateSelect($('#ansGateSelect'));
  $('#ansGateSelect').value = ans.gate;
  $('#ansGateSelect').addEventListener('change', (e) => ansSetGate(e.target.value));
  wireSeg($('#ansInputCount'), (n) => {
    ans.n = n;
    ans.numMissing = ansMaxMissing();
    ansGenerate();
  });
  $('#ansNumMissing').addEventListener('change', (e) => {
    ans.numMissing = Number(e.target.value);
    ansGenerate();
  });
  $('#ansGenerateBtn').addEventListener('click', () => {
    ans.numMissing = Number($('#ansNumMissing').value);
    ansGenerate();
  });
  $('#ansSubmit').addEventListener('click', ansGrade);
  $('#ansShowAnswers').addEventListener('click', () => {
    ans.revealed = true;
    renderAnswerMode();
  });
  $('#ansTryAgain').addEventListener('click', () => ansGenerate());

  /* Quiz tab — randomized practice quiz */
  $('#pzContainer').addEventListener('click', (e) => {
    if (e.target.closest('#pzStart')) {
      pzStart();
    } else if (e.target.closest('.quiz-opt')) {
      pz.answers[pz.index] = Number(e.target.closest('.quiz-opt').dataset.val);
      playTone(pz.answers[pz.index] ? 540 : 240);
      renderPractice();
    } else if (e.target.closest('#pzNext')) {
      if (pz.answers[pz.index] === null) return; // never advance without an answer
      if (pz.index === pz.count - 1) pzFinish();
      else { pz.index += 1; renderPractice(); }
    } else if (e.target.closest('#pzRestart')) {
      pzStart();
    } else if (e.target.closest('#pzNewSetup')) {
      pz.phase = 'setup';
      renderPractice();
    }
  });
  $('#pzContainer').addEventListener('change', (e) => {
    if (e.target.id === 'pzCount') pz.count = Number(e.target.value);
  });

  /* Progress tab */
  $('#progressReset').addEventListener('click', () => {
    if (window.confirm('Reset all session progress? This cannot be undone.')) {
      progress = { answered: 0, correct: 0, incorrect: 0, bestPct: 0, gates: [] };
      saveProgress();
      renderProgress();
    }
  });

  /* First render of every tab */
  renderSimulator();
  renderGenControls();
  renderGeneratorTable();
  ansGenerate();
  renderPractice();
  renderProgress();
  initKmap();
}

document.addEventListener('DOMContentLoaded', init);
