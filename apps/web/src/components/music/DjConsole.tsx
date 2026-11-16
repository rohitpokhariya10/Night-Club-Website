'use client';

import {useEffect, useRef} from 'react';
import {Pause, Play, SkipBack, SkipForward} from 'lucide-react';
import VolumeKnob from './VolumeKnob';
import {useMusic, musicPlayer} from '@/hooks/useMusic';
import {PLAYLIST} from '@/lib/music/playlist';
import {CENTER, PIVOT, REST_ANGLE, STYLUS, angleForProgress, clampAngle, pointerAngle, progressAtAngle, radiusAt} from '@/lib/music/tonearm';

const BANDS = 18;
const SEGMENTS = 11;
const RPM = 33.333;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const pivot = `${PIVOT.x} ${PIVOT.y}`;
const STY = {x: PIVOT.x + STYLUS.x, y: PIVOT.y + STYLUS.y};

/** The arm stays parked in its rest after a visitor returns it there, until the music is played again (per visit). */
let parked = false;

/**
 * Jimmy O's DJ console (DJ-CONSOLE-REPORT.md): a turntable and a control panel, both views of the site's one music
 * player. Every control is real and drives the audio element and its Web Audio graph:
 * - The tonearm turns about its fixed pivot. Lift it (the music pauses, keeping its place), swing it over the record and
 *   lower it onto a groove: the track jumps to that point and plays (outer groove = start, inner = end, measured along
 *   the arm's real arc). Put it back in its rest and the music stays paused. While a track plays, the arm creeps inward
 *   with the actual playback position.
 * - Play/pause, previous/next, the five track keys, the seek slider, the volume knob and mute.
 * The platter turns at 33⅓ only while the element is actually playing; the LED meter and target light read the
 * analyser's real spectrum. One animation loop, only while the console is on screen and something is moving.
 * Reduced motion: no turning platter, meter or arm travel animation; every control still works.
 */
export default function DjConsole() {
  const index = useMusic(s => s.index);
  const status = useMusic(s => s.status);
  const error = useMusic(s => s.error);
  const duration = useMusic(s => s.duration);
  const track = PLAYLIST[index];
  const playing = status === 'playing' || status === 'loading';

  const root = useRef<HTMLDivElement>(null);
  const record = useRef<HTMLDivElement>(null);
  const armSvg = useRef<SVGSVGElement>(null);
  const meter = useRef<HTMLCanvasElement>(null);
  const out = useRef<HTMLCanvasElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const seek = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = root.current, canvas = meter.current, outCanvas = out.current, svg = armSvg.current, seekInput = seek.current;
    if (!el || !canvas || !outCanvas || !svg || !seekInput) return;
    const player = musicPlayer();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const arm = svg.querySelector<SVGGElement>('.dj-arm')!, shadow = svg.querySelector<SVGGElement>('.dj-arm-shadow')!;
    const hit = svg.querySelector<SVGPathElement>('.dj-arm-hit')!, cueRing = svg.querySelector<SVGCircleElement>('.dj-cue')!;
    const ctx2d = canvas.getContext('2d'), outCtx = outCanvas.getContext('2d');
    const bins = new Uint8Array(new ArrayBuffer(player.bins));
    const levels = new Float32Array(BANDS), peaks = new Float32Array(BANDS), holds = new Float32Array(BANDS);
    let angle = 0, speed = 0, bass = 0, master = 0, raf = 0, last = 0, visible = false, shownSecond = -1, width = 0, height = 0, ow = 0, oh = 0;
    let seeking = false;

    // ---- tonearm state -----------------------------------------------------------------------------------------
    type Mode = 'auto' | 'held' | 'returning';
    let mode: Mode = 'auto', lift = 0, held = 0, grabOffset = 0, wasPlaying = false, inverse: DOMMatrix | null = null;
    let pending: {angle: number; seconds: number; until: number} | null = null;
    const autoTarget = () => {
      const s = player.getSnapshot();
      if (!s.activated || parked) return REST_ANGLE;
      const position = player.position;
      if (pending) {
        if (Math.abs(position - pending.seconds) < 0.75 || performance.now() > pending.until) pending = null;
        else return pending.angle;
      }
      return angleForProgress(position / (s.duration || 1));
    };
    let armAngle = autoTarget(); // on arrival the arm already shows the real state (no swing in from the rest)

    const edges = Array.from({length: BANDS + 1}, (_, i) => 45 * Math.pow(14000 / 45, i / BANDS));
    const binOf = (hz: number) => Math.max(1, Math.min(player.bins - 1, Math.round(hz / (player.sampleRate / 2) * player.bins)));

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1), r = canvas.getBoundingClientRect(), o = outCanvas.getBoundingClientRect();
      width = Math.max(1, Math.round(r.width * dpr)); height = Math.max(1, Math.round(r.height * dpr));
      ow = Math.max(1, Math.round(o.width * dpr)); oh = Math.max(1, Math.round(o.height * dpr));
      canvas.width = width; canvas.height = height; outCanvas.width = ow; outCanvas.height = oh;
      draw(); drawOut();
    };
    const draw = () => {
      if (!ctx2d) return;
      ctx2d.clearRect(0, 0, width, height);
      const gap = Math.max(2, width * 0.012), cw = (width - gap * (BANDS - 1)) / BANDS, sh = height / SEGMENTS, seg = sh * 0.62;
      for (let b = 0; b < BANDS; b++) {
        const lit = Math.round(levels[b] * SEGMENTS), peak = Math.min(SEGMENTS - 1, Math.round(peaks[b] * SEGMENTS) - 1);
        for (let s = 0; s < SEGMENTS; s++) {
          const on = s < lit || (s === peak && peaks[b] > 0.04);
          ctx2d.fillStyle = on ? (s >= SEGMENTS - 1 ? '#E6533F' : s >= SEGMENTS - 3 ? '#E3C7A2' : s === peak && s >= lit ? '#F1D7B2' : s >= SEGMENTS - 6 ? '#E08A5A' : '#D9714A') : 'rgba(246,236,222,0.06)';
          ctx2d.fillRect(b * (cw + gap), height - (s + 1) * sh + (sh - seg) / 2, cw, seg);
        }
      }
    };
    /** Master output: what actually reaches the speakers after the knob and mute, −48 to −6 dBFS over 16 LEDs. */
    const drawOut = () => {
      if (!outCtx) return;
      outCtx.clearRect(0, 0, ow, oh);
      const n = 16, gap = Math.max(2, ow * 0.012), w = (ow - gap * (n - 1)) / n, lit = Math.round(master * n);
      for (let i = 0; i < n; i++) {
        outCtx.fillStyle = i < lit ? (i >= n - 2 ? '#E6533F' : i >= n - 5 ? '#E3C7A2' : '#D9714A') : 'rgba(246,236,222,0.08)';
        outCtx.fillRect(i * (w + gap), 0, w, oh);
      }
    };
    const placeArm = () => {
      arm.setAttribute('transform', `rotate(${armAngle.toFixed(3)} ${pivot})`);
      // The shadow falls further from the arm (and fades) as the arm is lifted off the record.
      shadow.setAttribute('transform', `translate(${(0.9 + lift * 2.2).toFixed(2)} ${(1.3 + lift * 3).toFixed(2)}) rotate(${armAngle.toFixed(3)} ${pivot})`);
      shadow.style.opacity = (0.55 - lift * 0.22).toFixed(3);
      svg.dataset.arm = armAngle.toFixed(2);
    };
    const showTime = (t: number, d: number) => {
      const second = Math.floor(t);
      if (mode !== 'held' && second !== shownSecond && time.current) {
        shownSecond = second;
        time.current.textContent = `${clock(t)} / ${clock(d)}`;
        seekInput.setAttribute('aria-valuetext', `${clock(t)} of ${clock(d)}`);
      }
      if (!seeking) seekInput.value = String(Math.round(t));
      seekInput.style.setProperty('--p', `${(Math.min(1, t / d) * 100).toFixed(2)}%`);
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
      const rolling = !player.paused, still = reduce.matches;

      // Platter: a direct-drive deck reaches 33⅓ in about a third of a second and brakes to a stop in about 0.7 s.
      const target = rolling && !still ? RPM * 6 : 0;
      speed = target > speed ? Math.min(target, speed + RPM * 6 / 0.35 * dt) : Math.max(target, speed - RPM * 6 / 0.7 * dt);
      angle = (angle + speed * dt) % 360;
      if (record.current) record.current.style.transform = `rotate(${angle.toFixed(2)}deg)`;

      // Tonearm.
      const d = player.getSnapshot().duration || 1, t = player.position;
      let settled = true;
      if (mode === 'held') {
        armAngle = held;
        lift = still ? 1 : lift + (1 - lift) * (1 - Math.exp(-dt / 0.08));
        settled = false;
      } else {
        const goal = mode === 'returning' ? REST_ANGLE : autoTarget();
        armAngle = still ? goal : armAngle + (goal - armAngle) * (1 - Math.exp(-dt / (mode === 'returning' ? 0.32 : 0.4)));
        if (Math.abs(goal - armAngle) < 0.02) {armAngle = goal; if (mode === 'returning') {mode = 'auto'; svg.dataset.needle = 'rest';}}
        lift = still || lift < 0.01 ? 0 : lift * Math.exp(-dt / 0.11);
        settled = armAngle === goal && lift === 0;
      }
      placeArm();

      // Real spectrum → LED columns (smoothed attack, gentle fall, peak hold). Paused or reduced motion: they settle.
      const live = !still && player.frequencies(bins);
      let energy = 0;
      for (let b = 0; b < BANDS; b++) {
        let sum = 0, n = 0;
        if (live) for (let i = binOf(edges[b]); i <= binOf(edges[b + 1]); i++) {sum += bins[i]; n++;}
        const raw = live && n ? Math.pow(sum / n / 255, 1.35) * (1 + b * 0.035) : 0;
        levels[b] = raw > levels[b] ? levels[b] + (raw - levels[b]) * (1 - Math.exp(-dt / 0.035)) : Math.max(0, levels[b] - dt * 1.5);
        if (levels[b] >= peaks[b]) {peaks[b] = levels[b]; holds[b] = 0.5;} else if ((holds[b] -= dt) < 0) peaks[b] = Math.max(0, peaks[b] - dt * 0.8);
        if (b < 3) energy += levels[b] / 3;
      }
      bass += (energy - bass) * (1 - Math.exp(-dt / 0.07));
      el.style.setProperty('--bass', bass.toFixed(3));
      const rms = live ? player.outputLevel() : 0, db = rms > 0 ? 20 * Math.log10(rms) : -96;
      const outTarget = Math.min(1, Math.max(0, (db + 48) / 42));
      master = outTarget > master ? outTarget : Math.max(0, master - dt * 1.4);
      draw(); drawOut();
      showTime(t, d);

      const moving = speed > 0 || !settled || levels.some(v => v > 0) || peaks.some(v => v > 0) || bass > 0.002 || master > 0;
      if (visible && (rolling || moving)) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const token = {};
    const wake = () => {
      if (!visible) {
        // Not yet reported by the observer (or just remounted): check directly, once, rather than miss a frame.
        const r = el.getBoundingClientRect();
        visible = r.bottom > -80 && r.top < window.innerHeight + 80;
        if (visible) player.setConsoleInView(true, token);
      }
      if (visible && !raf) raf = requestAnimationFrame(frame);
    };

    // ---- tonearm interaction (pointer events on the arm's hit area) ----------------------------------------------
    const refreshMatrix = () => {inverse = svg.getScreenCTM()?.inverse() ?? null;};
    const toSvg = (event: PointerEvent) => {
      if (!inverse) return null;
      const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse);
      return {x: p.x, y: p.y};
    };
    const cue = () => {
      const p = progressAtAngle(held);
      if (p === null) {
        cueRing.style.opacity = '0'; svg.dataset.cue = 'off';
        if (time.current) time.current.textContent = 'Release to rest';
        return;
      }
      cueRing.setAttribute('r', radiusAt(held).toFixed(2)); cueRing.style.opacity = '1'; svg.dataset.cue = p.toFixed(4);
      const d = player.getSnapshot().duration || 1;
      if (time.current) time.current.textContent = `Cue ${clock(p * d)} / ${clock(d)}`;
    };
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || mode === 'held') return;
      event.preventDefault();
      hit.setPointerCapture(event.pointerId);
      refreshMatrix();
      const p = toSvg(event);
      if (!p) return;
      grabOffset = armAngle - pointerAngle(p); // no jump: the arm keeps its angle relative to where it was taken
      held = armAngle;
      wasPlaying = !player.paused;
      if (wasPlaying) player.pause(); // lifting the needle off a playing record pauses it, keeping its place
      mode = 'held'; pending = null;
      svg.dataset.needle = 'held'; el.dataset.arm = 'held';
      window.addEventListener('scroll', refreshMatrix, {passive: true});
      cue();
      wake();
    };
    const onMove = (event: PointerEvent) => {
      if (mode !== 'held') return;
      const p = toSvg(event);
      if (!p) return;
      held = clampAngle(pointerAngle(p) + grabOffset);
      cue();
      wake();
    };
    const release = (drop: boolean) => {
      if (mode !== 'held') return;
      window.removeEventListener('scroll', refreshMatrix);
      cueRing.style.opacity = '0'; delete el.dataset.arm; shownSecond = -1;
      const progress = progressAtAngle(held);
      if (drop && progress !== null) {
        // Needle down on a groove: play from the matching point (the release is a user gesture, so play is allowed).
        const seconds = progress * (player.getSnapshot().duration || 1);
        parked = false; mode = 'auto';
        pending = {angle: held, seconds, until: performance.now() + 4000};
        svg.dataset.needle = 'down';
        void player.cue(seconds, true);
      } else if (drop) {
        // Off the record: the arm goes back to its rest and the music stays paused.
        parked = true; mode = 'returning';
        svg.dataset.needle = 'returning';
      } else {
        // Cancelled (the browser took the pointer): put things back as they were.
        mode = 'auto';
        svg.dataset.needle = player.getSnapshot().activated && !parked ? 'down' : 'rest';
        if (wasPlaying) void player.play();
      }
      wake();
    };
    const onUp = () => release(true);
    const onCancel = () => release(false);
    const onEnter = () => {svg.dataset.hover = 'true';};
    const onLeave = () => {delete svg.dataset.hover;};
    hit.addEventListener('pointerdown', onDown);
    hit.addEventListener('pointermove', onMove);
    hit.addEventListener('pointerup', onUp);
    hit.addEventListener('pointercancel', onCancel);
    hit.addEventListener('lostpointercapture', onCancel);
    hit.addEventListener('pointerenter', onEnter);
    hit.addEventListener('pointerleave', onLeave);

    // ---- seek slider (the keyboard and assistive-technology equivalent of the needle) -----------------------------
    const onSeekInput = () => {seeking = true; void player.seek(Number(seekInput.value)); wake();};
    const onSeekEnd = () => {seeking = false;};
    seekInput.addEventListener('input', onSeekInput);
    seekInput.addEventListener('change', onSeekEnd);
    seekInput.addEventListener('blur', onSeekEnd);

    const onState = () => {
      if (!player.paused) {parked = false; if (mode === 'returning') mode = 'auto'; if (mode === 'auto') svg.dataset.needle = 'down';}
      wake();
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      player.setConsoleInView(visible, token);
      if (visible) wake(); else {cancelAnimationFrame(raf); raf = 0; last = 0;}
    }, {rootMargin: '80px 0px'});
    io.observe(el);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    ro.observe(outCanvas);
    const unsubscribe = player.subscribe(onState);
    reduce.addEventListener('change', wake);
    svg.dataset.needle = player.getSnapshot().activated && !parked ? 'down' : 'rest';
    placeArm();
    resize();
    wake();
    return () => {
      io.disconnect(); ro.disconnect(); unsubscribe(); reduce.removeEventListener('change', wake);
      hit.removeEventListener('pointerdown', onDown); hit.removeEventListener('pointermove', onMove); hit.removeEventListener('pointerup', onUp);
      hit.removeEventListener('pointercancel', onCancel); hit.removeEventListener('lostpointercapture', onCancel);
      hit.removeEventListener('pointerenter', onEnter); hit.removeEventListener('pointerleave', onLeave);
      seekInput.removeEventListener('input', onSeekInput); seekInput.removeEventListener('change', onSeekEnd); seekInput.removeEventListener('blur', onSeekEnd);
      window.removeEventListener('scroll', refreshMatrix);
      cancelAnimationFrame(raf);
      player.setConsoleInView(false, token); // only clears this instance's own report
    };
  }, []);

  const player = musicPlayer;
  const label = status === 'loading' ? 'Loading' : playing ? 'Pause' : 'Play';
  const state = status === 'error' ? 'Check track' : status === 'loading' ? 'Cueing' : playing ? 'Now playing' : status === 'paused' ? 'Paused' : 'Ready';

  return (
    <div ref={root} className="dj" data-status={status} data-playing={playing || undefined} role="region" aria-label="DJ console" aria-describedby="dj-hint">
      <div className="dj-deck">
        <div className="dj-turntable">
          <div className="dj-plinth-light" aria-hidden="true"/>
          <div className="dj-platter" aria-hidden="true">
            <div ref={record} className="dj-record">
              <span className="dj-label"><b>Jimmy O’s</b><small>Del Mar · 33⅓</small></span>
            </div>
            <span className="dj-spindle"/>
          </div>
          <span className="dj-target-light" aria-hidden="true"/>
          {/* The tonearm: pointer-operated (the seek slider is its keyboard and assistive-technology equivalent). */}
          <svg ref={armSvg} className="dj-arm-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="dj-tube" gradientUnits="userSpaceOnUse" x1={PIVOT.x - 1} y1="0" x2={PIVOT.x + 1} y2="0">
                <stop offset="0" stopColor="#7d786f"/><stop offset=".38" stopColor="#f4eee4"/><stop offset=".62" stopColor="#c9c2b6"/><stop offset="1" stopColor="#6b665e"/>
              </linearGradient>
              <radialGradient id="dj-weight" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#d9d3c8"/><stop offset=".55" stopColor="#6e6a63"/><stop offset="1" stopColor="#2a2a2c"/></radialGradient>
              <radialGradient id="dj-hub" cx=".38" cy=".32" r=".75"><stop offset="0" stopColor="#4a4c52"/><stop offset=".7" stopColor="#1b1c20"/><stop offset="1" stopColor="#0d0e10"/></radialGradient>
              <filter id="dj-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".9"/></filter>
            </defs>
            <circle className="dj-cue" cx={CENTER.x} cy={CENTER.y} r="30"/>
            {/* Rest (cradle) for the arm. */}
            <g className="dj-rest"><rect x={PIVOT.x - 2.6} y={PIVOT.y + 47} width="5.2" height="7" rx="1.3"/><rect className="dj-rest-cap" x={PIVOT.x - 2.2} y={PIVOT.y + 47} width="4.4" height="1.4" rx=".7"/></g>
            <g className="dj-arm-shadow" filter="url(#dj-soft)">
              <path d={`M${PIVOT.x} ${PIVOT.y - 12}V${PIVOT.y + 64}L${STY.x - 0.8} ${STY.y - 3.5}L${STY.x + 1.4} ${STY.y + 1.2}L${PIVOT.x + 2.4} ${PIVOT.y + 64.5}`} strokeWidth="2.2"/>
            </g>
            <g className="dj-arm" transform={`rotate(0 ${pivot})`}>
              {/* Counterweight behind the pivot. */}
              <rect className="dj-weight" x={PIVOT.x - 3.6} y={PIVOT.y - 14} width="7.2" height="8.5" rx="1.6" fill="url(#dj-weight)"/>
              <rect x={PIVOT.x - 3.6} y={PIVOT.y - 9.4} width="7.2" height=".7" fill="rgb(0 0 0 / .35)"/>
              {/* Arm tube, then the angled headshell carrying the cartridge; the stylus tip is the tonearm's working point. */}
              <rect className="dj-tube" x={PIVOT.x - 0.95} y={PIVOT.y - 6} width="1.9" height="70.5" rx=".95" fill="url(#dj-tube)"/>
              <g className="dj-headshell" transform={`rotate(-18 ${PIVOT.x} ${PIVOT.y + 64})`}>
                <rect x={PIVOT.x - 2.3} y={PIVOT.y + 62.5} width="4.6" height="11.2" rx="1" className="dj-shell"/>
                <rect x={PIVOT.x - 1.8} y={PIVOT.y + 69} width="3.6" height="4.2" rx=".6" className="dj-cartridge"/>
                <path d={`M${PIVOT.x + 2.2} ${PIVOT.y + 65}l3 .9`} className="dj-lift-tab"/>
              </g>
              <circle className="dj-stylus" cx={STY.x} cy={STY.y} r=".45"/>
              <path className="dj-arm-hit" d={`M${PIVOT.x} ${PIVOT.y + 6}V${PIVOT.y + 64}L${STY.x} ${STY.y}`}/>
            </g>
            {/* Pivot housing and bearing (fixed). */}
            <circle cx={PIVOT.x} cy={PIVOT.y} r="7.4" fill="url(#dj-hub)" className="dj-hub"/>
            <circle cx={PIVOT.x} cy={PIVOT.y} r="3.4" className="dj-bearing"/>
            <circle cx={PIVOT.x} cy={PIVOT.y} r="1.1" className="dj-bearing-cap"/>
          </svg>
        </div>

        <div className="dj-panel">
          <div className="dj-screen">
            <div className="dj-screen-top">
              <span className="dj-onair"><i aria-hidden="true"/>{state}</span>
              <span className="dj-count">{track.demo && <span className="dj-demo">Demo</span>}<span className="dj-num">{String(index + 1).padStart(2, '0')} / {String(PLAYLIST.length).padStart(2, '0')}</span></span>
            </div>
            <p className="dj-title" aria-live="polite">{track.title}</p>
            <p className="dj-sub">{track.direction} · {track.bpm} BPM</p>
            <canvas ref={meter} className="dj-meter" aria-hidden="true"/>
            <input ref={seek} className="dj-seek" type="range" min={0} max={Math.max(1, Math.floor(duration))} step={1} defaultValue={0}
              aria-label="Track position" aria-valuetext={`0:00 of ${clock(duration)}`}/>
            <span ref={time} className="dj-time" aria-hidden="true">0:00 / {clock(track.duration)}</span>
          </div>

          <div className="dj-controls">
            <div className="dj-transport">
              <button type="button" className="dj-btn" aria-label="Previous track" onClick={() => player().previous()}><SkipBack size={17} aria-hidden="true"/></button>
              <button type="button" className="dj-btn dj-play" aria-label={label} aria-pressed={playing} onClick={() => void player().toggle()}>
                {playing ? <Pause size={22} aria-hidden="true"/> : <Play size={22} aria-hidden="true"/>}
              </button>
              <button type="button" className="dj-btn" aria-label="Next track" onClick={() => player().next()}><SkipForward size={17} aria-hidden="true"/></button>
            </div>
            <div className="dj-out" aria-hidden="true"><span>Master</span><canvas ref={out}/></div>
            <VolumeKnob/>
          </div>

          <div className="dj-tracks" role="group" aria-label="Choose a track">
            {PLAYLIST.map((t, i) => (
              <button key={t.id} type="button" className="dj-track" aria-current={i === index ? 'true' : undefined}
                aria-label={`Play track ${i + 1}: ${t.title} (${t.direction})`}
                onClick={() => {const p = player(); if (i === p.getSnapshot().index) {if (p.paused) void p.play();} else p.select(i, true);}}>
                {String(i + 1).padStart(2, '0')}
              </button>
            ))}
          </div>
          {error && <p className="dj-error" role="alert">{error}</p>}
        </div>
      </div>
      <p id="dj-hint" className="dj-hint">Drop the needle to play — or swing a photograph below.</p>
    </div>
  );
}
