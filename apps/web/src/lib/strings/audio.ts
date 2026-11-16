/**
 * The instrument's voice: a soft plucked string made with the Web Audio API alone (no samples to license).
 *
 * Each note is rendered once, when sound is enabled, with the Karplus–Strong algorithm: a short burst of softened
 * noise circulates in a delay line one period long and is gently low-passed on every pass, which is physically how a
 * plucked string loses its brightness. A first-order all-pass keeps every note exactly in tune. Playback adds a
 * velocity-dependent tone filter (soft plucks are darker), a little stereo placement from where the string was
 * plucked, a short synthetic room, a compressor that prevents clipping when notes overlap, and a voice limit.
 *
 * No AudioContext exists until the visitor turns sound on, so nothing can ever autoplay.
 */
type WebkitWindow = typeof globalThis & {webkitAudioContext?: typeof AudioContext};

const audioContextClass = () => (typeof window === 'undefined' ? undefined : window.AudioContext ?? (window as WebkitWindow).webkitAudioContext);

export const audioSupported = () => Boolean(audioContextClass());

/** Overall level: deliberately quiet. Individual voices peak far below this. */
const LEVEL = 0.5;
const MAX_VOICES = 8;
const NOTE_SECONDS = 3.2;

/** Deterministic noise, so every visit hears the same instrument. */
function noise(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2147483648 - 1;
  };
}

/** One Karplus–Strong note, as raw samples. Exported for tests. */
export function renderPluck(sampleRate: number, frequency: number, seconds = NOTE_SECONDS, seed = 7) {
  const length = Math.floor(sampleRate * seconds);
  const out = new Float32Array(length);
  // The loop (delay line + two-point average) delays by N + 0.5 samples; the all-pass supplies the fraction.
  const period = sampleRate / frequency;
  const n = Math.max(2, Math.floor(period - 0.5));
  const fraction = Math.min(0.999, Math.max(0.001, period - 0.5 - n));
  const allpass = (1 - fraction) / (1 + fraction);
  // Decay: lower strings ring longer, like a guitar. rho is the loss per trip around the loop.
  const t60 = 2.6 * Math.pow(110 / frequency, 0.35);
  const rho = Math.pow(0.001, 1 / (t60 * frequency));

  // Excitation: noise softened by a one-pole low-pass (a fingertip, not a pick), with its average removed.
  const line = new Float32Array(n);
  const random = noise(seed);
  let soft = 0, mean = 0;
  for (let i = 0; i < n; i++) {
    soft += 0.42 * (random() - soft);
    line[i] = soft;
    mean += soft;
  }
  mean /= n;
  let peak = 0;
  for (let i = 0; i < n; i++) {line[i] -= mean; peak = Math.max(peak, Math.abs(line[i]));}
  for (let i = 0; i < n; i++) line[i] /= peak || 1;

  let index = 0, apIn = 0, apOut = 0;
  for (let i = 0; i < length; i++) {
    const current = line[index];
    const next = line[(index + 1) % n];
    const averaged = rho * 0.5 * (current + next);
    // First-order all-pass: y[n] = C·x[n] + x[n−1] − C·y[n−1].
    const tuned = allpass * averaged + apIn - allpass * apOut;
    apIn = averaged;
    apOut = tuned;
    line[index] = tuned;
    out[i] = current;
    index = (index + 1) % n;
  }
  // Soften the first millisecond and the very end: no clicks.
  const attack = Math.floor(sampleRate * 0.0015);
  for (let i = 0; i < attack; i++) out[i] *= i / attack;
  const tail = Math.floor(sampleRate * 0.3);
  for (let i = 0; i < tail; i++) out[length - 1 - i] *= i / tail;
  return out;
}

/** A small synthetic room (exponentially decaying, darkened stereo noise). */
function roomImpulse(ctx: BaseAudioContext, seconds = 1.6) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    const random = noise(97 + channel * 31);
    let soft = 0;
    for (let i = 0; i < length; i++) {
      soft += 0.3 * (random() - soft);
      data[i] = soft * Math.pow(1 - i / length, 3.2);
    }
  }
  return buffer;
}

/** Freezes a parameter at its current value before a new ramp (no jump if a ramp was still running). */
function hold(param: AudioParam, now: number) {
  if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
  else {param.cancelScheduledValues(now); param.setValueAtTime(param.value, now);}
}

type Voice = {string: number; source: AudioBufferSourceNode; gain: GainNode; nodes: AudioNode[]; damped: boolean};

export class PluckSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private send: GainNode | null = null;
  private buffers: AudioBuffer[] = [];
  private voices: Voice[] = [];
  private suspendTimer = 0;
  enabled = false;

  constructor(private readonly frequencies: readonly number[]) {}

  /** Must be called from a user gesture (the sound button). Creates the context on first use. */
  async enable() {
    const Context = audioContextClass();
    if (!Context) throw new Error('Web Audio is not available');
    clearTimeout(this.suspendTimer);
    if (!this.ctx) {
      const ctx = new Context({latencyHint: 'interactive'});
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 14;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      compressor.connect(ctx.destination);
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(compressor);
      const room = ctx.createConvolver();
      room.buffer = roomImpulse(ctx);
      const send = ctx.createGain();
      send.gain.value = 0.26;
      send.connect(room);
      room.connect(master);
      this.buffers = this.frequencies.map((frequency, i) => {
        const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * NOTE_SECONDS), ctx.sampleRate);
        buffer.getChannelData(0).set(renderPluck(ctx.sampleRate, frequency, NOTE_SECONDS, 11 + i * 17));
        return buffer;
      });
      this.ctx = ctx;
      this.master = master;
      this.send = send;
    }
    await this.ctx.resume();
    const now = this.ctx.currentTime;
    hold(this.master!.gain, now);
    this.master!.gain.setTargetAtTime(LEVEL, now, 0.04);
    this.enabled = true;
  }

  /** Fades out and suspends the context (no audio processing while muted). */
  disable() {
    this.enabled = false;
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    hold(this.master.gain, now);
    this.master.gain.setTargetAtTime(0, now, 0.04);
    clearTimeout(this.suspendTimer);
    this.suspendTimer = window.setTimeout(() => {
      if (!this.enabled) void ctx.suspend().catch(() => {});
    }, 300);
  }

  /**
   * One note on string `string`. `intensity` 0–1 shapes loudness and brightness; `pan` −1 (left) to 1 (right).
   * Re-plucking a ringing string damps its previous note first, as a finger does; other strings ring on.
   */
  pluck(string: number, intensity: number, pan = 0) {
    const ctx = this.ctx;
    if (!this.enabled || !ctx || !this.master || !this.send || !this.buffers[string]) return;
    // Plucks are user gestures: if the browser suspended the context meanwhile, this resumes it.
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const level = Math.min(1, Math.max(0.08, intensity));

    for (const voice of this.voices) if (voice.string === string) this.damp(voice, now, 0.025);
    // Voice limit: the oldest ringing notes give way first.
    const ringing = this.voices.filter(v => !v.damped);
    for (let i = 0; i <= ringing.length - MAX_VOICES; i++) this.damp(ringing[i], now, 0.02);

    const source = ctx.createBufferSource();
    source.buffer = this.buffers[string];
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 900 + 5200 * level * level;
    tone.Q.value = 0.4;
    const body = ctx.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = 190;
    body.Q.value = 0.9;
    body.gain.value = 3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1 + 0.34 * Math.pow(level, 1.2), now + 0.004);
    const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    if (panner) panner.pan.value = Math.max(-0.7, Math.min(0.7, pan));
    source.connect(tone).connect(body).connect(gain);
    const output: AudioNode = panner ? gain.connect(panner) : gain;
    output.connect(this.master);
    output.connect(this.send);
    const voice: Voice = {string, source, gain, nodes: [source, tone, body, gain, ...(panner ? [panner] : [])], damped: false};
    source.onended = () => {
      voice.nodes.forEach(node => node.disconnect());
      this.voices = this.voices.filter(v => v !== voice);
    };
    source.start(now);
    this.voices.push(voice);
  }

  private damp(voice: Voice, now: number, time: number) {
    if (voice.damped) return;
    voice.damped = true;
    hold(voice.gain.gain, now);
    voice.gain.gain.setTargetAtTime(0, now, time);
    try {voice.source.stop(now + time * 8);} catch {/* already stopped */}
  }

  dispose() {
    clearTimeout(this.suspendTimer);
    this.enabled = false;
    this.voices = [];
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.master = null;
    this.send = null;
  }
}
