import {PLAYLIST, type Track} from './playlist';

/**
 * The site's one music player (MUSIC-LICENSES.md, DJ-CONSOLE-REPORT.md).
 *
 * A single HTMLAudioElement lives for the whole visit, outside React, so client-side navigation never interrupts or
 * duplicates it: the homepage DJ console and the floating mini player are two views of this one object. Nothing is
 * created or downloaded until the visitor presses play (no autoplay). On that first press, inside the gesture, one
 * AudioContext is built: element → analyser (the visualiser reads real frequency data here) → master gain (volume and
 * mute; works on iOS, where element.volume is read-only) → output meter → speakers. The strings' plucks join the same
 * context through `output()`, so the knob governs them too.
 *
 * React reads state through `subscribe`/`getSnapshot` (useSyncExternalStore): a new snapshot only on real changes.
 * Fast-changing values (position, levels) are read directly by animation loops, never put into React state.
 *
 * Rules: Previous restarts the current track when more than 3 s in, otherwise goes to the previous track (wrapping
 * from the first to the last). Next always advances (wrapping from the last to the first). A track ending plays the
 * next one; when the fifth ends, the console returns to track 1 and stops. Changing tracks keeps playing if it was
 * playing, and never changes the volume.
 */
export type MusicStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export type MusicState = {
  index: number;
  status: MusicStatus;
  /** Knob position 0–1 (what the visitor set). The gain applied is volume^1.5, a natural loudness taper. */
  volume: number;
  muted: boolean;
  /** True once the visitor has pressed play on this visit (the mini player appears from then on). */
  activated: boolean;
  error: string | null;
  /** Duration of the current track in seconds (from the file once known). */
  duration: number;
  /** Whether the homepage console is on screen (the mini player stays out of its way meanwhile). */
  consoleInView: boolean;
  boardInView: boolean;
};

export const INITIAL_VOLUME = 0.3;
const RESTART_THRESHOLD = 3;
const taper = (v: number) => Math.pow(Math.min(1, Math.max(0, v)), 1.5);

type Ctx = typeof AudioContext;
const contextClass = (): Ctx | undefined => typeof window === 'undefined' ? undefined
  : window.AudioContext ?? (window as typeof window & {webkitAudioContext?: Ctx}).webkitAudioContext;

export const INITIAL_STATE: MusicState = {index: 0, status: 'idle', volume: INITIAL_VOLUME, muted: false, activated: false, error: null, duration: PLAYLIST[0].duration, consoleInView: false, boardInView: false};

export class MusicPlayer {
  readonly tracks: readonly Track[];
  private state: MusicState = INITIAL_STATE;
  private listeners = new Set<() => void>();
  private audio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private meter: AnalyserNode | null = null;
  private master: GainNode | null = null;
  private meterData: Float32Array<ArrayBuffer> | null = null;
  private loadedIndex = -1;
  private loopOwner: object | null = null;
  /** Diagnostics for tests: how many audio elements and contexts this visit has created (always at most 1 each). */
  readonly created = {elements: 0, contexts: 0};

  constructor(tracks: readonly Track[] = PLAYLIST) {this.tracks = tracks;}

  // ---- store ---------------------------------------------------------------------------------------------------
  subscribe = (listener: () => void) => {this.listeners.add(listener); return () => {this.listeners.delete(listener);};};
  getSnapshot = () => this.state;
  private set(patch: Partial<MusicState>) {
    let changed = false;
    for (const key of Object.keys(patch) as (keyof MusicState)[]) if (this.state[key] !== patch[key]) {changed = true; break;}
    if (!changed) return;
    this.state = {...this.state, ...patch};
    this.listeners.forEach(listener => listener());
  }
  get track() {return this.tracks[this.state.index];}
  get currentTime() {return this.audio?.currentTime ?? 0;}
  get paused() {return this.audio ? this.audio.paused : true;}

  // ---- element and graph ---------------------------------------------------------------------------------------
  private element() {
    if (this.audio) return this.audio;
    const audio = new Audio();
    this.created.elements++;
    audio.preload = 'none';
    audio.setAttribute('playsinline', '');
    const sync = () => this.syncStatus();
    for (const type of ['play', 'playing', 'pause', 'waiting', 'stalled', 'canplay', 'seeked']) audio.addEventListener(type, sync);
    audio.addEventListener('loadedmetadata', () => {if (Number.isFinite(audio.duration)) this.set({duration: audio.duration});});
    audio.addEventListener('ended', () => this.onEnded());
    audio.addEventListener('error', () => {
      if (!audio.getAttribute('src')) return;
      this.set({status: 'error', error: `“${this.track.title}” could not be loaded. Try another track.`});
    });
    this.audio = audio;
    return audio;
  }

  /** Called inside the first play gesture: one context and graph for the whole visit. */
  private graph() {
    if (this.ctx || !this.audio) return;
    const Context = contextClass();
    if (!Context) return; // No Web Audio: element volume is used instead, and the visualiser rests.
    try {
      const ctx = new Context({latencyHint: 'playback'});
      this.created.contexts++;
      const source = ctx.createMediaElementSource(this.audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;
      const master = ctx.createGain();
      const meter = ctx.createAnalyser();
      meter.fftSize = 512;
      source.connect(analyser).connect(master).connect(meter).connect(ctx.destination);
      this.ctx = ctx; this.analyser = analyser; this.master = master; this.meter = meter;
      this.meterData = new Float32Array(meter.fftSize);
      this.audio.volume = 1;
      this.applyVolume(true);
    } catch {
      this.ctx = null;
    }
  }

  private applyVolume(instant = false) {
    const level = this.state.muted ? 0 : taper(this.state.volume);
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      if (instant) this.master.gain.setValueAtTime(level, now);
      else {this.master.gain.setValueAtTime(this.master.gain.value, now); this.master.gain.setTargetAtTime(level, now, 0.03);}
    } else if (this.audio) {
      // Without Web Audio (or on a first play the context could not take): the element's own volume.
      try {this.audio.volume = level;} catch {/* read-only (iOS) */}
    }
  }

  private load(index: number) {
    const audio = this.element();
    const track = this.tracks[index];
    this.loadedIndex = index;
    audio.src = track.src;
    audio.load();
    this.set({index, duration: track.duration, error: null});
    this.mediaSession();
  }

  private syncStatus() {
    const audio = this.audio;
    if (!audio) return;
    // A failed source leaves `paused` false with nothing playing, so the media error decides first.
    const status: MusicStatus = audio.error ? 'error' : audio.paused ? (this.state.status === 'error' ? 'error' : 'paused')
      : audio.readyState < 3 ? 'loading' : 'playing';
    this.set({status, ...(status === 'playing' ? {error: null} : {})});
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
  }

  // ---- controls ------------------------------------------------------------------------------------------------
  async play() {
    const audio = this.element();
    if (this.loadedIndex !== this.state.index) this.load(this.state.index);
    this.graph();
    void this.ctx?.resume().catch(() => {});
    this.set({activated: true, status: 'loading', error: null});
    try {
      await audio.play();
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return; // superseded by a track change
      const blocked = (error as DOMException)?.name === 'NotAllowedError';
      this.set({status: 'error', error: blocked ? 'Your browser blocked playback. Press play again.' : `“${this.track.title}” could not be played. Try another track.`});
    }
    this.syncStatus();
  }

  pause() {this.audio?.pause();}
  toggle() {return this.paused ? this.play() : (this.pause(), Promise.resolve());}

  /** Choose a track. Keeps playing if music was playing (or starting); otherwise just cues it. */
  select(index: number, autoplay = this.isRolling()) {
    this.loopOwner = null; // A DJ track change takes playback back from the photo board.
    const next = ((index % this.tracks.length) + this.tracks.length) % this.tracks.length;
    if (next === this.state.index && this.loadedIndex === next) {
      if (this.audio) this.audio.currentTime = 0;
      if (autoplay) void this.play();
      return;
    }
    if (this.audio) {this.audio.pause(); this.load(next);} else this.set({index: next, duration: this.tracks[next].duration, error: null});
    this.set({status: autoplay ? 'loading' : this.state.activated ? 'paused' : 'idle'});
    if (autoplay) void this.play();
  }
  next() {this.select(this.state.index + 1);}
  previous() {
    if (this.audio && this.audio.currentTime > RESTART_THRESHOLD) {this.audio.currentTime = 0; return;}
    this.select(this.state.index - 1);
  }
  private isRolling() {return Boolean(this.audio && (!this.audio.paused || this.state.status === 'loading'));}
  private onEnded() {
    if (this.loopOwner && this.audio) {this.audio.currentTime = 0; void this.play(); return;}
    if (this.state.index < this.tracks.length - 1) this.select(this.state.index + 1, true);
    else {this.select(0, false); this.set({status: 'paused'});}
  }

  /** Photo experiences borrow the single player; their teardown cannot stop music subsequently chosen by the DJ. */
  startLoop(index: number, owner: object) {this.select(index, true); this.loopOwner = owner;}
  ownsLoop(owner: object) {return this.loopOwner === owner;}
  stopLoop(owner: object) {
    if (this.loopOwner !== owner) return;
    this.loopOwner = null;
    this.pause();
  }

  /**
   * Put the current track at `seconds` (the needle drop and the seek control), optionally playing from there.
   * Works before the file has loaded: the position is applied as soon as its metadata arrives. Never past the end.
   */
  cue(seconds: number, play = false) {
    const audio = this.element();
    if (this.loadedIndex !== this.state.index) this.load(this.state.index);
    const apply = () => {
      const d = Number.isFinite(audio.duration) ? audio.duration : this.state.duration;
      audio.currentTime = Math.min(Math.max(0, seconds), Math.max(0, d - 0.5));
    };
    if (audio.readyState >= 1) apply(); else audio.addEventListener('loadedmetadata', apply, {once: true});
    this.cued = Math.max(0, seconds);
    if (play) return this.play();
    if (!this.state.activated) this.set({activated: true, status: 'paused'});
    return Promise.resolve();
  }
  /** Where the player is (or is about to be, when a cue is waiting for the file to load). */
  get position() {
    if (!this.audio) return 0;
    if (this.cued !== null && this.audio.readyState < 1) return this.cued;
    this.cued = null;
    return this.audio.currentTime;
  }
  private cued: number | null = null;
  seek(seconds: number) {return this.cue(seconds, false);}

  /** Knob position 0–1. Turning the volume up from silence unmutes, as on real equipment. */
  setVolume(volume: number) {
    const v = Math.round(Math.min(1, Math.max(0, volume)) * 1000) / 1000;
    this.set({volume: v, ...(v > 0 && this.state.muted ? {muted: false} : {})});
    this.applyVolume();
  }
  setMuted(muted: boolean) {this.set({muted}); this.applyVolume();}
  toggleMute() {this.setMuted(!this.state.muted);}
  /** The console reports itself on/off screen; `owner` stops a stale console instance (a remount) clearing a live one's report. */
  setConsoleInView(consoleInView: boolean, owner?: object) {
    if (consoleInView) this.consoleOwner = owner ?? null;
    else if (owner && this.consoleOwner && owner !== this.consoleOwner) return;
    else this.consoleOwner = null;
    this.set({consoleInView});
  }
  private consoleOwner: object | null = null;
  setBoardInView(boardInView: boolean) {this.set({boardInView});}

  // ---- analysis (read by animation loops) ------------------------------------------------------------------------
  /** Fills `out` with the analyser's frequency bins (0–255); false when there is nothing to read. */
  frequencies(out: Uint8Array<ArrayBuffer>) {
    if (!this.analyser || !this.audio || this.audio.paused) return false;
    this.analyser.getByteFrequencyData(out);
    return true;
  }
  get bins() {return this.analyser?.frequencyBinCount ?? 512;}
  get sampleRate() {return this.ctx?.sampleRate ?? 44100;}
  /** RMS of what actually reaches the speakers (after volume and mute). */
  outputLevel() {
    if (!this.meter || !this.meterData) return 0;
    this.meter.getFloatTimeDomainData(this.meterData);
    let sum = 0; for (const v of this.meterData) sum += v * v;
    return Math.sqrt(sum / this.meterData.length);
  }
  /** Shared output for other site sounds (the strings), after the master volume. */
  output(): {context: AudioContext; destination: AudioNode} | null {
    return this.ctx && this.master ? {context: this.ctx, destination: this.master} : null;
  }

  private mediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    const track = this.track;
    navigator.mediaSession.metadata = new MediaMetadata({title: track.title, artist: track.creator, album: 'Jimmy O’s Del Mar', artwork: [{src: '/images/favicon.png', sizes: '192x192', type: 'image/png'}]});
    const handlers: [MediaSessionAction, () => void][] = [['play', () => void this.play()], ['pause', () => this.pause()], ['previoustrack', () => this.previous()], ['nexttrack', () => this.next()]];
    for (const [action, handler] of handlers) try {navigator.mediaSession.setActionHandler(action, handler);} catch {/* unsupported action */}
  }
}

type MusicGlobal = typeof globalThis & {__jimmyOsMusic?: MusicPlayer};
/** The one player for this page lifetime (kept on globalThis so hot reloads in development cannot create a second). */
export function getMusicPlayer() {
  const g = globalThis as MusicGlobal;
  g.__jimmyOsMusic ??= new MusicPlayer();
  return g.__jimmyOsMusic;
}
