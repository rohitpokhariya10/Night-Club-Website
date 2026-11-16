// Five original demo pop instrumentals, synthesised from scratch in this file: no samples, loops, presets or third-party
// recordings, so the DJ console has real, rights-clear audio to play until the client supplies licensed tracks
// (see MUSIC-LICENSES.md). Deterministic: the same script always renders the same audio.
// Renders 44.1 kHz stereo WAV to a temporary folder, then AAC (.m4a, 160 kb/s) with macOS `afconvert`.
// usage: node scripts/audio/demo-tracks.mjs [outDir=apps/web/public/audio/demo] [tmpDir]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const SR = 44100;
const outDir = process.argv[2] || 'apps/web/public/audio/demo';
const tmpDir = process.argv[3] || fs.mkdtempSync(path.join(os.tmpdir(), 'jo-demo-'));
fs.mkdirSync(outDir, {recursive: true});

// ---------------------------------------------------------------------------------------------------------------
// DSP building blocks
const hz = note => 440 * 2 ** ((note - 69) / 12);
function noiseGen(seed) {let s = seed >>> 0 || 1; return () => {s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 2147483648 - 1;};}
const blep = (t, dt) => t < dt ? (t /= dt, t + t - t * t - 1) : t > 1 - dt ? (t = (t - 1) / dt, t * t + t + t + 1) : 0;
/** Zero-delay-feedback state-variable filter (lp / bp / hp), cutoff modulable per sample. */
function svf() {
  let ic1 = 0, ic2 = 0, lastFc = -1, g = 0;
  return (x, fc, q = 0.707, mode = 'lp') => {
    if (fc !== lastFc) {lastFc = fc; g = Math.tan(Math.PI * Math.min(Math.max(fc, 10), SR * 0.45) / SR);}
    const k = 1 / q, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    return mode === 'lp' ? v2 : mode === 'bp' ? v1 : x - k * v1 - v2;
  };
}
/** Linear attack, exponential decay to sustain, linear release after `hold` seconds. */
function adsr(t, hold, a, d, s, r) {
  const on = t < a ? t / a : s + (1 - s) * Math.exp(-(t - a) / d);
  if (t <= hold) return on;
  const atRelease = hold < a ? hold / a : s + (1 - s) * Math.exp(-(hold - a) / d);
  return Math.max(0, atRelease * (1 - (t - hold) / r));
}
const buf = seconds => new Float32Array(Math.ceil(seconds * SR));

// ---------------------------------------------------------------------------------------------------------------
// Instruments (mono buffers)
function kick({punch = 1, decay = 0.17, tone = 48} = {}) {
  const out = buf(0.5), n = noiseGen(7); let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, f = tone + 120 * punch * Math.exp(-t / 0.032);
    ph += f / SR;
    const body = Math.sin(2 * Math.PI * ph) * Math.exp(-t / decay);
    out[i] = Math.tanh(1.6 * (body + n() * 0.25 * Math.exp(-t / 0.0025))) * 0.95;
  }
  return out;
}
function snare({tone = 190, snap = 0.6, decay = 0.13} = {}) {
  const out = buf(0.35), n = noiseGen(11), hp = svf(), bp = svf();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, x = n();
    const noise = (hp(x, 1800, 0.7, 'hp') * 0.7 + bp(x, 4200, 0.9, 'bp') * 0.5) * Math.exp(-t / decay);
    const body = Math.sin(2 * Math.PI * tone * t * (1 + 0.4 * Math.exp(-t / 0.01))) * Math.exp(-t / 0.05);
    out[i] = Math.tanh(1.4 * (noise * snap + body * 0.55));
  }
  return out;
}
function clap() {
  const out = buf(0.4), n = noiseGen(23), bp = svf(), hp = svf();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let env = Math.exp(-t / 0.11) * 0.55;
    for (const at of [0, 0.011, 0.023]) if (t >= at) env += Math.exp(-(t - at) / 0.0045) * 0.8;
    out[i] = hp(bp(n(), 1250, 1.1, 'bp'), 600, 0.7, 'hp') * env * 1.6;
  }
  return out;
}
function hat(open = false, bright = 1) {
  const out = buf(open ? 0.45 : 0.08), n = noiseGen(open ? 31 : 37), hp = svf(), bp = svf();
  const decay = open ? 0.2 : 0.028;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, x = n();
    out[i] = (hp(x, 7000 * bright, 0.8, 'hp') * 0.7 + bp(x, 10500, 2, 'bp') * 0.4) * Math.exp(-t / decay);
  }
  return out;
}
function shaker() {
  const out = buf(0.12), n = noiseGen(41), bp = svf();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, env = Math.min(1, t / 0.012) * Math.exp(-t / 0.045);
    out[i] = bp(n(), 6500, 1.4, 'bp') * env * 0.9;
  }
  return out;
}
function riser(seconds) {
  const out = buf(seconds), n = noiseGen(53), bp = svf();
  for (let i = 0; i < out.length; i++) {
    const p = i / out.length;
    out[i] = bp(n(), 300 * 30 ** p, 1.6, 'bp') * p * p * 0.9;
  }
  return out;
}
/** Bass: polyBLEP saw or square plus a sine fundamental, through an enveloped low-pass. */
function bass(note, dur, {wave = 'saw', cutoff = 320, env = 1400, q = 1.1, sub = 0.6, decay = 0.11} = {}) {
  const out = buf(dur + 0.08), f = hz(note), dt = f / SR, lp = svf(); let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += dt; if (ph >= 1) ph -= 1;
    const osc = wave === 'saw' ? 2 * ph - 1 - blep(ph, dt) : (ph < 0.5 ? 1 : -1) + blep(ph, dt) - blep((ph + 0.5) % 1, dt);
    const filtered = lp(osc, cutoff + env * Math.exp(-t / decay), q);
    out[i] = (filtered * 0.7 + Math.sin(2 * Math.PI * ph) * sub) * adsr(t, dur, 0.004, 0.25, 0.85, 0.05);
  }
  return out;
}
/** Detuned saw stack (supersaw / string section); returns [left, right] with independent detune for width. */
function saws(notes, dur, {voices = 5, detune = 0.11, cutoff = 4200, env = 0, q = 0.8, a = 0.02, d = 0.4, s = 0.75, r = 0.3, vib = 0, seed = 1} = {}) {
  const L = buf(dur + r), R = buf(dur + r), lpL = svf(), lpR = svf(), n = noiseGen(seed);
  const osc = [];
  for (const note of notes) for (let v = 0; v < voices; v++) {
    const spread = voices === 1 ? 0 : (v / (voices - 1) - 0.5) * 2 * detune;
    osc.push({f: hz(note + spread), ph: (n() + 1) / 2, side: v % 2});
  }
  const gain = 1 / Math.sqrt(osc.length);
  for (let i = 0; i < L.length; i++) {
    const t = i / SR, wob = vib ? 1 + vib * Math.sin(2 * Math.PI * 5.2 * t) * Math.min(1, t / 0.6) : 1;
    let l = 0, rr = 0;
    for (const o of osc) {
      const dt = o.f * wob / SR; o.ph += dt; if (o.ph >= 1) o.ph -= 1;
      const v = 2 * o.ph - 1 - blep(o.ph, dt);
      if (o.side) rr += v; else l += v;
    }
    const e = adsr(t, dur, a, d, s, r), fc = cutoff + env * Math.exp(-t / 0.18);
    L[i] = lpL(l * gain * 1.4, fc, q) * e; R[i] = lpR(rr * gain * 1.4, fc, q) * e;
  }
  return [L, R];
}
/** Plucked saw: bright attack closing quickly (arps, hooks). */
function pluck(note, dur, {cutoff = 700, env = 5200, decay = 0.09, amp = 0.3, wave = 'saw'} = {}) {
  const out = buf(dur + 0.25), f = hz(note), dt = f / SR, lp = svf(); let ph = 0, ph2 = 0.37;
  const dt2 = hz(note + 0.07) / SR;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += dt; if (ph >= 1) ph -= 1; ph2 += dt2; if (ph2 >= 1) ph2 -= 1;
    const osc = wave === 'saw' ? (2 * ph - 1 - blep(ph, dt)) * 0.6 + (2 * ph2 - 1 - blep(ph2, dt2)) * 0.4
      : (ph < 0.5 ? 1 : -1) + blep(ph, dt) - blep((ph + 0.5) % 1, dt);
    out[i] = lp(osc, cutoff + env * Math.exp(-t / decay), 1.2) * Math.exp(-t / Math.max(0.12, dur * 1.4)) * adsr(t, dur, 0.002, 1, 1, 0.12) * amp;
  }
  return out;
}
/** Two-operator FM electric piano: a warm tine with a bell-like attack. */
function ePiano(note, dur, {bright = 1} = {}) {
  const out = buf(dur + 0.6), f = hz(note);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const index = (1.9 * Math.exp(-t / 0.55) + 0.25) * bright;
    const mod = Math.sin(2 * Math.PI * f * t) * index;
    const bell = Math.sin(2 * Math.PI * f * 14 * t) * 0.18 * Math.exp(-t / 0.03);
    const trem = 1 + 0.08 * Math.sin(2 * Math.PI * 4.6 * t);
    out[i] = (Math.sin(2 * Math.PI * f * t + mod) + bell) * Math.exp(-t / 2.2) * adsr(t, dur, 0.003, 1, 1, 0.45) * trem * 0.3;
  }
  return out;
}
/** Bright pop piano: stretched, decaying partials and a short hammer. */
function piano(note, dur) {
  const out = buf(dur + 0.5), f = hz(note), n = noiseGen(note * 13), hp = svf();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR; let v = 0;
    for (let k = 1; k <= 8; k++) v += Math.sin(2 * Math.PI * f * k * Math.sqrt(1 + 0.00035 * k * k) * t) * Math.exp(-t * (0.7 + k * 0.55)) / k ** 1.15;
    out[i] = (v + hp(n(), 2500, 0.7, 'hp') * 0.25 * Math.exp(-t / 0.006)) * adsr(t, dur, 0.002, 1, 1, 0.25) * 0.32;
  }
  return out;
}
/** Funk clav stab: narrow pulse through a closing band-pass. */
function clav(note, dur) {
  const out = buf(dur + 0.05), f = hz(note), dt = f / SR, bp = svf(); let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR; ph += dt; if (ph >= 1) ph -= 1;
    const pulse = (ph < 0.22 ? 1 : -0.3) + blep(ph, dt) - blep((ph + 0.78) % 1, dt) * 1.3;
    out[i] = Math.tanh(bp(pulse, 900 + 2600 * Math.exp(-t / 0.05), 1.6, 'bp') * 2.2) * Math.exp(-t / 0.16) * adsr(t, dur, 0.001, 1, 1, 0.03) * 0.32;
  }
  return out;
}
/** Whistle / flute-like lead with delayed vibrato and a little breath. */
function whistle(note, dur, {vib = 0.25, breath = 0.05, tri = false} = {}) {
  const out = buf(dur + 0.15), f = hz(note), n = noiseGen(note), bp = svf(); let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, v = 2 ** (vib * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, Math.max(0, t - 0.12) / 0.25) / 12);
    ph += f * v / SR; if (ph >= 1) ph -= 1;
    const tone = tri ? 1 - 4 * Math.abs(ph - 0.5) : Math.sin(2 * Math.PI * ph) + 0.08 * Math.sin(4 * Math.PI * ph);
    out[i] = (tone + bp(n(), f * 2, 2, 'bp') * breath) * adsr(t, dur, 0.03, 0.3, 0.85, 0.1) * 0.28;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Mix engine: buses, sends, sidechain, reverb, delay, master
function createMix(seconds, bpm) {
  const len = Math.ceil(seconds * SR), beat = 60 / bpm;
  const bus = () => [new Float32Array(len), new Float32Array(len)];
  const m = {len, beat, bar: beat * 4, drums: bus(), bass: bus(), music: bus(), verb: bus(), echo: bus(), kicks: []};
  m.at = beats => Math.round(beats * beat * SR);
  /** Add a mono (or [L, R]) source at `beats`, panned (-1..1), with optional reverb / delay sends. */
  m.add = (target, beats, src, {gain = 1, pan = 0, verb = 0, echo = 0} = {}) => {
    const start = m.at(beats);
    const [l, r] = Array.isArray(src) ? src : [src, src];
    const gl = Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2 * gain, gr = Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2 * gain;
    const [L, R] = m[target];
    for (let i = 0; i < l.length && start + i < len; i++) {
      const a = l[i] * gl, b = r[i] * gr;
      L[start + i] += a; R[start + i] += b;
      if (verb) {m.verb[0][start + i] += a * verb; m.verb[1][start + i] += b * verb;}
      if (echo) {m.echo[0][start + i] += a * echo; m.echo[1][start + i] += b * echo;}
    }
  };
  return m;
}
function freeverb([inL, inR], {room = 0.84, damp = 0.25, wet = 1} = {}) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], alls = [556, 441, 341, 225];
  const run = (input, spread) => {
    const out = new Float32Array(input.length);
    const cs = combs.map(c => ({b: new Float32Array(c + spread), i: 0, s: 0}));
    const as = alls.map(a => ({b: new Float32Array(a + spread), i: 0}));
    for (let n = 0; n < input.length; n++) {
      const x = input[n] * 0.015; let y = 0;
      for (const c of cs) {const o = c.b[c.i]; c.s = o * (1 - damp) + c.s * damp; c.b[c.i] = x + c.s * room; c.i = (c.i + 1) % c.b.length; y += o;}
      for (const a of as) {const o = a.b[a.i]; a.b[a.i] = y + o * 0.5; a.i = (a.i + 1) % a.b.length; y = o - y;}
      out[n] = y * wet;
    }
    return out;
  };
  return [run(inL, 0), run(inR, 23)];
}
function pingPong([inL, inR], delaySeconds, feedback = 0.38, tone = 3500) {
  const d = Math.round(delaySeconds * SR), L = new Float32Array(inL.length), R = new Float32Array(inR.length), lpL = svf(), lpR = svf();
  for (let i = 0; i < inL.length; i++) {
    const fromR = i >= d ? R[i - d] : 0, fromL = i >= d ? L[i - d] : 0;
    L[i] = lpL(inR[i] + fromR * feedback, tone);
    R[i] = lpR(inL[i] + fromL * feedback, tone);
  }
  return [L, R];
}
function master(m, {pump = 0.55, release = 0.13, fadeIn = 0.4, fadeOut = 5, introFilter = null, loudness = -12.5} = {}) {
  const {len} = m;
  const sc = new Float32Array(len).fill(1);
  for (const k of m.kicks) {
    const s = m.at(k);
    for (let i = s; i < len && i < s + SR * 0.5; i++) {const t = (i - s) / SR; sc[i] = Math.min(sc[i], 1 - pump * Math.exp(-t / release) * Math.min(1, t / 0.004 + 0.2));}
  }
  const verb = freeverb(m.verb), echo = pingPong(m.echo, m.beat * 0.75);
  const L = new Float32Array(len), R = new Float32Array(len), fL = svf(), fR = svf();
  let hpL = 0, hpR = 0, xL = 0, xR = 0;
  for (let i = 0; i < len; i++) {
    let l = m.drums[0][i] + (m.bass[0][i] + m.music[0][i] + echo[0][i] * 0.6) * sc[i] + verb[0][i] * 0.9;
    let r = m.drums[1][i] + (m.bass[1][i] + m.music[1][i] + echo[1][i] * 0.6) * sc[i] + verb[1][i] * 0.9;
    if (introFilter) {const fc = introFilter(i / SR); if (fc < 18000) {l = fL(l, fc, 0.9); r = fR(r, fc, 0.9);}}
    hpL = 0.9987 * (hpL + l - xL); xL = l; hpR = 0.9987 * (hpR + r - xR); xR = r; // ~9 Hz DC / rumble high-pass
    L[i] = hpL; R[i] = hpR;
  }
  // Loudness: scale RMS toward the target, then a look-ahead peak limiter at -1 dBFS and gentle soft clip.
  let sum = 0; for (let i = 0; i < len; i++) sum += L[i] * L[i] + R[i] * R[i];
  const rms = Math.sqrt(sum / (2 * len)), pre = 10 ** (loudness / 20) / Math.max(rms, 1e-6);
  const ceiling = 10 ** (-1 / 20), look = Math.round(0.003 * SR), rel = Math.exp(-1 / (0.09 * SR));
  const peak = new Float32Array(len);
  for (let i = 0; i < len; i++) peak[i] = Math.max(Math.abs(L[i]), Math.abs(R[i])) * pre;
  let g = 1;
  for (let i = 0; i < len; i++) {
    let p = 0; for (let j = i; j < Math.min(len, i + look); j += 4) p = Math.max(p, peak[j]);
    const want = p > ceiling ? ceiling / p : 1;
    g = want < g ? want : want + (g - want) * rel;
    const fade = Math.min(1, i / (fadeIn * SR)) * Math.min(1, (len - i) / (fadeOut * SR));
    L[i] = Math.tanh(L[i] * pre * g * 1.05) * fade * 0.95;
    R[i] = Math.tanh(R[i] * pre * g * 1.05) * fade * 0.95;
  }
  return [L, R];
}
function writeWav(file, [L, R]) {
  const n = L.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  const q = v => Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
  for (let i = 0; i < n; i++) {b.writeInt16LE(q(L[i]), 44 + i * 4); b.writeInt16LE(q(R[i]), 46 + i * 4);}
  fs.writeFileSync(file, b);
}

// ---------------------------------------------------------------------------------------------------------------
// Arrangement helpers
/** Sections by bar: intro 4, verse 8, build 4, chorus 8, break 4, chorus 8, outro 4 (40 bars). */
const SECTIONS = [['intro', 4], ['verse', 8], ['build', 4], ['chorus', 8], ['break', 4], ['chorus', 8], ['outro', 4]];
function sectionAt(bar, sections = SECTIONS) {let start = 0; for (const [name, n] of sections) {if (bar < start + n) return {name, local: bar - start, length: n}; start += n;} return {name: 'end', local: 0, length: 1};}
const barsOf = sections => sections.reduce((s, [, n]) => s + n, 0);
const cache = new Map();
const memo = (key, make) => {if (!cache.has(key)) cache.set(key, make()); return cache.get(key);};

// ---------------------------------------------------------------------------------------------------------------
// The five demos (genre directions from the brief; titles say plainly that these are demos).
const TRACKS = [
  {
    file: '01-dance-pop-demo', bpm: 124,
    // A minor: Am – F – C – G
    chords: [[57, 60, 64, 69], [57, 60, 65, 69], [55, 60, 64, 67], [55, 59, 62, 67]], roots: [33, 29, 36, 31],
    hook: [[0, 76, 0.5], [0.5, 74, 0.5], [1, 72, 0.5], [1.5, 69, 1], [3, 72, 0.5], [3.5, 74, 0.5], [4, 76, 0.75], [4.75, 79, 0.75], [5.5, 76, 0.5], [6, 74, 1], [7, 72, 0.5], [7.5, 69, 0.5]],
    render(m, t) {
      const K = memo('k1', () => kick({punch: 1.1})), C = memo('c1', clap), H = memo('ho1', () => hat(true)), h = memo('hc1', () => hat(false));
      for (let bar = 0; bar < t.bars; bar++) {
        const s = sectionAt(bar), b0 = bar * 4, ch = bar % 4, full = s.name === 'chorus';
        const drums = s.name !== 'intro' && s.name !== 'break' && !(s.name === 'build' && s.local === 3);
        for (let q = 0; q < 4; q++) {
          if (drums || (s.name === 'intro' && s.local >= 2) || s.name === 'build') {m.add('drums', b0 + q, K, {gain: 0.95}); m.kicks.push(b0 + q);}
          if (drums && (q === 1 || q === 3)) m.add('drums', b0 + q, C, {gain: 0.55, verb: 0.18});
          if (drums || s.name === 'break') m.add('drums', b0 + q + 0.5, H, {gain: 0.22, pan: 0.15});
          if (drums) for (const x of [0.25, 0.75]) m.add('drums', b0 + q + x, h, {gain: 0.12, pan: -0.25});
        }
        if (s.name === 'build' && s.local === 0) m.add('music', b0, riser(m.bar * 4 / 1), {gain: 0.35});
        if (s.name !== 'intro' && s.name !== 'break') for (let e = 0; e < 8; e++) m.add('bass', b0 + e * 0.5 + 0.0, bass(t.roots[ch] + (e % 2 ? 12 : 0), m.beat * 0.42, {cutoff: 260, env: full ? 1800 : 1100}), {gain: 0.5});
        // verse arp; chorus supersaw + hook
        const tones = t.chords[ch];
        for (let e = 0; e < 16; e++) if (s.name !== 'chorus' || e % 2 === 0) {
          const note = tones[[0, 1, 2, 3, 2, 1, 3, 2][e % 8]] + 12;
          m.add('music', b0 + e * 0.25, pluck(note, m.beat * 0.22, {env: s.name === 'intro' ? 2500 : 4800}), {gain: full ? 0.25 : 0.42, pan: e % 2 ? 0.35 : -0.35, echo: 0.22, verb: 0.15});
        }
        if (full || s.name === 'build' || s.name === 'break') m.add('music', b0, saws(tones, m.bar - 0.02, {cutoff: full ? 5200 : 2200, a: 0.01, s: 0.8, seed: bar}), {gain: full ? 0.5 : 0.32, verb: 0.25});
        if (full) for (const [at, note, d] of t.hook) if ((at >= 4) === (bar % 2 === 1)) m.add('music', b0 + at - (bar % 2 ? 4 : 0), pluck(note, m.beat * d, {cutoff: 1500, env: 4500, decay: 0.15, amp: 0.4}), {gain: 0.7, echo: 0.25, verb: 0.2});
      }
    },
    master: {pump: 0.6, introFilter: t => t < 7.7 ? 500 * 36 ** (t / 7.7) : 20000},
  },
  {
    file: '02-funky-disco-pop-demo', bpm: 116,
    // D minor funk: Dm9 – G9 – Dm9 – G9 / Bbmaj7 – A7
    chords: [[62, 65, 69, 72], [59, 62, 65, 69], [62, 65, 69, 72], [59, 62, 65, 69], [58, 62, 65, 69], [57, 61, 64, 67], [58, 62, 65, 69], [57, 61, 64, 67]], roots: [38, 43, 38, 43, 34, 33, 34, 33],
    hook: [[0, 69, 0.5], [0.75, 72, 0.5], [1.5, 74, 1], [3, 72, 0.25], [3.25, 74, 0.25], [3.5, 77, 0.5], [4, 76, 1.5], [6, 74, 0.5], [6.5, 72, 0.5], [7, 69, 1]],
    render(m, t) {
      const K = memo('k2', () => kick({decay: 0.15})), S = memo('s2', snare), H = memo('ho2', () => hat(true, 0.9)), h = memo('hc2', () => hat(false));
      for (let bar = 0; bar < t.bars; bar++) {
        const s = sectionAt(bar), b0 = bar * 4, ch = bar % 8, chorus = s.name === 'chorus', band = s.name !== 'intro' && s.name !== 'break';
        for (let q = 0; q < 4; q++) {
          if (band || s.name === 'build') {m.add('drums', b0 + q, K, {gain: 0.85}); m.kicks.push(b0 + q);}
          if (band && (q === 1 || q === 3)) m.add('drums', b0 + q, S, {gain: 0.5, verb: 0.15});
          m.add('drums', b0 + q + 0.5, H, {gain: s.name === 'intro' ? 0.12 : 0.2, pan: 0.2});
          for (const x of [0, 0.25, 0.75]) m.add('drums', b0 + q + x, h, {gain: x ? 0.1 : 0.07, pan: -0.3});
        }
        if (band || s.name === 'break') for (let e = 0; e < 8; e++) {
          const octave = e % 2 ? 12 : 0;
          m.add('bass', b0 + e * 0.5, bass(t.roots[ch] + octave, m.beat * 0.36, {wave: 'square', cutoff: 380, env: 1300, decay: 0.07}), {gain: 0.5});
          if (e % 4 === 3) m.add('bass', b0 + e * 0.5 + 0.25, bass(t.roots[ch] + 12, m.beat * 0.15, {wave: 'square', cutoff: 500, env: 900}), {gain: 0.25});
        }
        for (const at of [0.5, 1.25, 2, 2.75, 3.5]) if (s.name !== 'intro' || s.local >= 2) m.add('music', b0 + at, t.chords[ch].map(n => clav(n, m.beat * 0.2)).reduce((a, b) => a.map((v, i) => v + (b[i] || 0))), {gain: 0.5, pan: -0.3, verb: 0.08});
        if (chorus || s.name === 'build' || s.name === 'intro' || s.name === 'break') m.add('music', b0, saws(t.chords[ch], m.bar, {voices: 3, detune: 0.07, cutoff: 2600, a: 0.35, s: 0.9, r: 0.5, vib: 0.002, seed: bar + 9}), {gain: chorus ? 0.42 : 0.3, pan: 0.25, verb: 0.35});
        if (chorus) for (const [at, note, d] of t.hook) if ((at >= 4) === (bar % 2 === 1)) m.add('music', b0 + at - (bar % 2 ? 4 : 0), saws([note, note + 12], m.beat * d, {voices: 2, detune: 0.05, cutoff: 3800, a: 0.02, s: 0.85, r: 0.15, vib: 0.003}), {gain: 0.5, echo: 0.18, verb: 0.25});
        if (s.name === 'build' && s.local === 0) m.add('music', b0, riser(m.bar * 4), {gain: 0.3});
      }
    },
    master: {pump: 0.35, introFilter: t => t < 8.2 ? 900 * 20 ** (t / 8.2) : 20000},
  },
  {
    file: '03-electronic-pop-demo', bpm: 128,
    // F minor: Fm – Db – Ab – Eb
    chords: [[53, 56, 60, 65], [53, 56, 61, 65], [51, 56, 60, 63], [51, 55, 58, 63]], roots: [29, 25, 32, 27],
    hook: [[0, 72, 0.75], [0.75, 75, 0.75], [1.5, 77, 0.5], [2, 75, 0.5], [2.5, 72, 1], [4, 68, 0.75], [4.75, 72, 0.75], [5.5, 75, 0.5], [6, 72, 0.5], [6.5, 70, 1.5]],
    render(m, t) {
      const K = memo('k3', () => kick({punch: 1.25, decay: 0.2, tone: 46})), C = memo('c3', clap), S = memo('s3', () => snare({tone: 210, decay: 0.1})), h = memo('hc3', () => hat(false, 1.1)), H = memo('ho3', () => hat(true, 1.1));
      for (let bar = 0; bar < t.bars; bar++) {
        const s = sectionAt(bar), b0 = bar * 4, ch = bar % 4, drop = s.name === 'chorus';
        const beat4 = s.name === 'verse' || drop || (s.name === 'build' && s.local < 3) || s.name === 'outro';
        for (let q = 0; q < 4; q++) {
          if (beat4) {m.add('drums', b0 + q, K, {gain: 0.95}); m.kicks.push(b0 + q);}
          if (beat4 && (q === 1 || q === 3)) {m.add('drums', b0 + q, C, {gain: 0.45, verb: 0.2}); m.add('drums', b0 + q, S, {gain: 0.3});}
          if (s.name !== 'intro') for (let x = 0; x < 4; x++) m.add('drums', b0 + q + x * 0.25, x === 2 ? H : h, {gain: x === 2 ? 0.15 : 0.08, pan: x % 2 ? 0.3 : -0.3});
        }
        if (s.name === 'build') {for (let e = 0; e < 4 * (s.local + 1); e++) m.add('drums', b0 + e * 4 / (4 * (s.local + 1)), S, {gain: 0.15 + 0.08 * s.local}); if (s.local === 0) m.add('music', b0, riser(m.bar * 4), {gain: 0.4});}
        if (s.name !== 'intro' && s.name !== 'break') m.add('bass', b0, bass(t.roots[ch], m.bar - 0.05, {wave: 'saw', cutoff: drop ? 420 : 260, env: drop ? 900 : 400, decay: 0.3, sub: 0.8}), {gain: 0.55});
        const pads = saws(t.chords[ch], m.bar, {voices: 7, detune: drop ? 0.16 : 0.1, cutoff: drop ? 6500 : 1600, a: drop ? 0.005 : 0.4, s: 0.85, r: 0.2, seed: bar * 3});
        m.add('music', b0, pads, {gain: drop ? 0.55 : 0.4, verb: 0.3});
        if (s.name !== 'intro') for (let e = 0; e < 16; e++) {
          const note = t.chords[ch][[0, 2, 3, 2, 1, 3, 2, 3][e % 8]] + (e % 4 === 3 ? 24 : 12);
          m.add('music', b0 + e * 0.25, pluck(note, m.beat * 0.2, {wave: 'square', cutoff: 900, env: drop ? 6000 : 3000, decay: 0.06, amp: 0.22}), {gain: 0.6, pan: Math.sin(e) * 0.5, echo: 0.3});
        }
        if (drop) for (const [at, note, d] of t.hook) if ((at >= 4) === (bar % 2 === 1)) m.add('music', b0 + at - (bar % 2 ? 4 : 0), saws([note, note - 12], m.beat * d, {voices: 3, detune: 0.09, cutoff: 5200, a: 0.004, s: 0.9, r: 0.12}), {gain: 0.45, echo: 0.3, verb: 0.2});
      }
    },
    master: {pump: 0.75, release: 0.16, introFilter: t => t < 7.5 ? 400 * 45 ** (t / 7.5) : 20000},
  },
  {
    file: '04-feel-good-party-pop-demo', bpm: 120,
    // G major: G – D – Em – C
    chords: [[55, 59, 62, 67], [54, 57, 62, 66], [55, 59, 64, 67], [55, 60, 64, 67]], roots: [31, 38, 40, 36],
    hook: [[0, 74, 0.5], [0.5, 71, 0.5], [1, 74, 0.5], [1.5, 79, 1.5], [3.5, 78, 0.5], [4, 76, 0.5], [4.5, 74, 0.5], [5, 71, 1], [6, 69, 0.5], [6.5, 71, 0.5], [7, 74, 1]],
    render(m, t) {
      const K = memo('k4', () => kick({decay: 0.16})), C = memo('c4', clap), S = memo('s4', () => snare({tone: 200, snap: 0.7})), Sh = memo('sh4', shaker), H = memo('ho4', () => hat(true));
      for (let bar = 0; bar < t.bars; bar++) {
        const s = sectionAt(bar), b0 = bar * 4, ch = bar % 4, chorus = s.name === 'chorus', band = s.name !== 'intro' && s.name !== 'break';
        for (let q = 0; q < 4; q++) {
          if (band || (s.name === 'intro' && s.local >= 2)) {m.add('drums', b0 + q, K, {gain: 0.85}); m.kicks.push(b0 + q);}
          if ((band || s.name === 'break') && (q === 1 || q === 3)) {m.add('drums', b0 + q, C, {gain: 0.5, verb: 0.2}); if (band) m.add('drums', b0 + q, S, {gain: 0.3});}
          for (let x = 0; x < 4; x++) m.add('drums', b0 + q + x * 0.25, Sh, {gain: x % 2 ? 0.16 : 0.1, pan: 0.35});
          if (chorus) m.add('drums', b0 + q + 0.5, H, {gain: 0.14, pan: -0.2});
        }
        if (band) for (const [at, oct, d] of [[0, 0, 0.75], [1, 12, 0.4], [1.5, 0, 0.4], [2.5, 12, 0.4], [3, 0, 0.75]]) m.add('bass', b0 + at, bass(t.roots[ch] + oct, m.beat * d, {wave: 'square', cutoff: 420, env: 900, decay: 0.08}), {gain: 0.45});
        for (const [at, d] of [[0, 0.9], [1.5, 0.45], [2.5, 0.45], [3, 0.9]]) m.add('music', b0 + at, t.chords[ch].map(n => piano(n + 12, m.beat * d)).reduce((a, b) => a.map((v, i) => v + (b[i] || 0))), {gain: chorus ? 0.5 : 0.42, verb: 0.2, pan: -0.1});
        if (chorus) m.add('music', b0, saws(t.chords[ch], m.bar, {voices: 3, detune: 0.08, cutoff: 2400, a: 0.25, s: 0.9, r: 0.4, seed: bar}), {gain: 0.25, verb: 0.3, pan: 0.2});
        if (chorus || s.name === 'outro') for (const [at, note, d] of t.hook) if ((at >= 4) === (bar % 2 === 1)) m.add('music', b0 + at - (bar % 2 ? 4 : 0), whistle(note, m.beat * d), {gain: 0.7, echo: 0.2, verb: 0.25});
        if (s.name === 'build' && s.local === 2) m.add('music', b0, riser(m.bar * 2), {gain: 0.3});
      }
    },
    master: {pump: 0.3},
  },
  {
    file: '05-smooth-late-night-pop-demo', bpm: 92, sections: [['intro', 4], ['verse', 8], ['chorus', 8], ['break', 4], ['chorus', 4], ['outro', 4]],
    // Eb major, late night: Ebmaj9 – Cm9 – Abmaj7 – Bb6/9
    chords: [[51, 55, 58, 62, 65], [51, 55, 58, 62], [51, 55, 60, 63], [53, 55, 58, 62]], roots: [39, 36, 32, 34],
    hook: [[0.5, 70, 0.5], [1, 67, 0.5], [1.5, 65, 1], [3, 63, 1], [4.5, 70, 0.5], [5, 72, 0.5], [5.5, 70, 0.5], [6, 67, 2]],
    render(m, t) {
      const K = memo('k5', () => kick({punch: 0.8, decay: 0.22, tone: 50})), S = memo('s5', () => snare({tone: 170, snap: 0.45, decay: 0.16})), Sh = memo('sh5', shaker), h = memo('hc5', () => hat(false, 0.8));
      const sections = t.sections;
      for (let bar = 0; bar < t.bars; bar++) {
        const s = sectionAt(bar, sections), b0 = bar * 4, ch = bar % 4, chorus = s.name === 'chorus', band = s.name === 'verse' || chorus || s.name === 'outro';
        if (band) {for (const k of [0, 2.5, 2.75]) {m.add('drums', b0 + k, K, {gain: 0.8}); m.kicks.push(b0 + k);} m.add('drums', b0 + 2, S, {gain: 0.45, verb: 0.3});}
        for (let e = 0; e < 8; e++) {const swing = e % 2 ? 0.08 : 0; m.add('drums', b0 + e * 0.5 + swing, e % 2 ? Sh : h, {gain: band ? (e % 2 ? 0.13 : 0.07) : 0.06, pan: e % 2 ? 0.3 : -0.25});}
        if (s.name !== 'intro') m.add('bass', b0, bass(t.roots[ch], m.bar * 0.62, {wave: 'saw', cutoff: 180, env: 300, decay: 0.2, sub: 1}), {gain: 0.6});
        if (s.name !== 'intro') m.add('bass', b0 + 2.75, bass(t.roots[ch] + 7, m.beat * 1.1, {wave: 'saw', cutoff: 180, env: 250, sub: 1}), {gain: 0.45});
        for (const [at, d] of [[0, 1.4], [1.5, 0.9], [3.25, 0.7]]) m.add('music', b0 + at, t.chords[ch].map(n => ePiano(n + 12, m.beat * d, {bright: chorus ? 1.15 : 0.9})).reduce((a, b) => a.map((v, i) => v + (b[i] || 0))), {gain: 0.55, verb: 0.35, echo: 0.1, pan: 0.1});
        m.add('music', b0, saws(t.chords[ch], m.bar, {voices: 3, detune: 0.06, cutoff: 1300, a: 0.6, s: 0.9, r: 0.8, seed: bar + 3}), {gain: chorus ? 0.3 : 0.2, verb: 0.4, pan: -0.2});
        if (chorus) for (const [at, note, d] of t.hook) if ((at >= 4) === (bar % 2 === 1)) m.add('music', b0 + at - (bar % 2 ? 4 : 0), whistle(note, m.beat * d, {vib: 0.18, breath: 0.08, tri: true}), {gain: 0.75, echo: 0.3, verb: 0.35});
      }
    },
    master: {pump: 0.2, release: 0.2, fadeOut: 6, introFilter: t => t < 10 ? 700 * 25 ** (t / 10) : 20000, loudness: -14},
  },
];

const results = [];
for (const track of TRACKS) {
  const started = Date.now();
  track.bars = barsOf(track.sections || SECTIONS);
  const seconds = track.bars * 4 * 60 / track.bpm + 1.5;
  const m = createMix(seconds, track.bpm);
  track.render(m, track);
  const out = master(m, track.master);
  const wav = path.join(tmpDir, `${track.file}.wav`), m4a = path.join(outDir, `${track.file}.m4a`);
  writeWav(wav, out);
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '160000', '-q', '127', wav, m4a]);
  let peak = 0, sum = 0; for (let i = 0; i < out[0].length; i++) {const a = Math.abs(out[0][i]), b = Math.abs(out[1][i]); peak = Math.max(peak, a, b); sum += out[0][i] ** 2 + out[1][i] ** 2;}
  const rmsDb = 10 * Math.log10(sum / (2 * out[0].length));
  results.push({file: track.file, bpm: track.bpm, seconds: +seconds.toFixed(2), peakDb: +(20 * Math.log10(peak)).toFixed(2), rmsDb: +rmsDb.toFixed(1), kb: Math.round(fs.statSync(m4a).size / 1024), ms: Date.now() - started});
  console.log(JSON.stringify(results.at(-1)));
}
console.log('wav kept in', tmpDir);
