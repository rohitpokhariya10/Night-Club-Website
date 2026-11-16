import gsap from 'gsap';
import {nearestSample, restPath, sampleCurve, smoothPath, type Samples} from './geometry';
import {StringModel} from './physics';
import {cardParam, type InstrumentLayout} from '../experience';

/**
 * Binds one instrument layout (its server-rendered SVG strings and hanging cards) to the string physics.
 *
 * - Pointer (mouse/pen): grab a string and pull it; let go and it rings. Click it for a pluck. Press on the empty
 *   stage and drag across strings to strum them. Approaching a string brightens it, with a light that follows the
 *   pointer along it; hovering or focusing a card lets its string answer softly.
 * - Touch: a tap on a string plucks it. Vertical swipes stay native scrolling (touch-action: pan-y), and a swipe
 *   never plucks: a pluck needs a short, still tap.
 * - Every pluck answers ("The Night Responds"): the string rings, a pulse of violet light runs from the pluck to
 *   both ends, its cards sway and glow, the room around the pluck brightens briefly, and `onPluck` lets the
 *   page play a note when sound is on.
 * - Reduced motion: nothing moves. A pluck brightens the string and its cards instead (and still plays a note).
 *
 * One GSAP ticker callback drives everything while something is moving and is removed when all is still, so an
 * idle section costs nothing per frame. No React state is touched per frame.
 */
export type PluckEvent = {string: number; intensity: number; pan: number};
export type Instrument = {
  /** Plucks string `index` (keyboard and touch controls). */
  pluck(index: number, options?: {s?: number; intensity?: number}): void;
  /** A soft, silent ripple along every string, once the entrance has settled. */
  shimmer(): void;
  /** Lets a card swing in from `degrees` (entrance). */
  swingCard(index: number, degrees: number): void;
  destroy(): void;
};
type Options = {
  root: HTMLElement;
  svg: SVGSVGElement;
  layout: InstrumentLayout;
  motion: boolean;
  onPluck?: (event: PluckEvent) => void;
};

const SEGMENTS = 56;
/** Hover reach around a string, in layout units. */
const NEAR = 70;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

type StringState = {
  index: number;
  model: StringModel;
  rest: Samples;
  restD: string;
  u: Float64Array;
  x: Float64Array;
  y: Float64Array;
  group: SVGGElement;
  paths: SVGPathElement[];
  pulses: SVGPathElement[];
  gradient: SVGRadialGradientElement | null;
  near: number;
  nearTarget: number;
  dirty: boolean;
  side: number;
  lastStrum: number;
};
type CardState = {index: number; el: HTMLElement; swing: HTMLElement; string: number; s: number; nx: number; ny: number; theta: number; omega: number; written: boolean};

export function createInstrument({root, svg, layout, motion, onPluck}: Options): Instrument {
  const strings: StringState[] = [];
  svg.querySelectorAll<SVGGElement>('.ns-string').forEach(group => {
    const index = Number(group.dataset.string);
    const curve = layout.strings[index];
    if (!curve) return;
    const rest = sampleCurve(curve, SEGMENTS);
    const voices = Number(group.dataset.swing) || 3;
    strings[index] = {
      index, rest, restD: restPath(curve), group,
      model: new StringModel(SEGMENTS + 1, {frequency: voices, damping: 0.085, maxPull: layout.maxPull}),
      u: new Float64Array(SEGMENTS + 1), x: Float64Array.from(rest.x), y: Float64Array.from(rest.y),
      paths: Array.from(group.querySelectorAll<SVGPathElement>('path:not(.ns-hit)')),
      pulses: Array.from(group.querySelectorAll<SVGPathElement>('.ns-pulse')),
      gradient: svg.querySelector<SVGRadialGradientElement>(`#${group.dataset.gradient}`),
      near: 0, nearTarget: 0, dirty: false, side: 0, lastStrum: 0,
    };
  });

  const cards: CardState[] = [];
  root.querySelectorAll<HTMLElement>('.ns-card').forEach(el => {
    const index = Number(el.dataset.index);
    const placement = layout.cards[index];
    const swing = el.querySelector<HTMLElement>('.ns-swing');
    if (!placement || !swing || !strings[placement.string]) return;
    const rest = strings[placement.string].rest;
    const s = cardParam(layout, placement);
    const k = Math.round(s * SEGMENTS);
    cards.push({index, el, swing, string: placement.string, s, nx: rest.nx[k], ny: rest.ny[k], theta: 0, omega: 0, written: false});
  });

  const responses = Array.from(root.querySelectorAll<HTMLElement>('.ns-response'));
  let nextResponse = 0;
  const tweens = new Set<gsap.core.Animation>();
  const track = <T extends gsap.core.Animation>(animation: T) => {
    tweens.add(animation);
    animation.eventCallback('onComplete', () => tweens.delete(animation));
    return animation;
  };

  // Pixels per layout unit, and the inverse for stroke widths that stay the same on screen at any size.
  let scale = 1;
  const measure = () => {
    const width = svg.getBoundingClientRect().width;
    if (!width) return;
    scale = width / layout.w;
    svg.style.setProperty('--u', (1 / scale).toFixed(4));
  };
  measure();
  const resize = new ResizeObserver(measure);
  resize.observe(svg);

  // ---- The loop: runs only while something moves. ----
  let awake = false;
  let visible = true;
  const wake = () => {
    if (awake || !visible) return;
    awake = true;
    gsap.ticker.add(tick);
  };
  const sleep = () => {
    if (!awake) return;
    awake = false;
    gsap.ticker.remove(tick);
  };

  function tick(_time: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 1 / 20);
    let busy = false;
    for (const st of strings) {
      if (!st) continue;
      if (st.model.active) {
        st.model.step(dt);
        st.model.fill(st.u);
        const {x, y, nx, ny} = st.rest;
        for (let i = 0; i <= SEGMENTS; i++) {
          st.x[i] = x[i] + nx[i] * st.u[i];
          st.y[i] = y[i] + ny[i] * st.u[i];
        }
        const d = smoothPath(st.x, st.y);
        for (const path of st.paths) path.setAttribute('d', d);
        st.dirty = true;
        busy = true;
      } else if (st.dirty) {
        // Settled: back to the exact server-rendered curve.
        st.x.set(st.rest.x);
        st.y.set(st.rest.y);
        for (const path of st.paths) path.setAttribute('d', st.restD);
        st.dirty = false;
      }
      const gap = st.nearTarget - st.near;
      if (Math.abs(gap) > 0.003) {
        st.near += gap * (1 - Math.exp(-dt * 9));
        st.group.style.setProperty('--near', st.near.toFixed(3));
        busy = true;
      } else if (st.near !== st.nearTarget) {
        st.near = st.nearTarget;
        st.group.style.setProperty('--near', st.near.toFixed(3));
      }
    }
    for (const card of cards) {
      const model = strings[card.string].model;
      const moving = model.active;
      const bob = moving ? model.displacementAt(card.s) : 0;
      // The clip is fixed to the string, so the card follows the string's tilt there, with a little lag and sway.
      const target = moving ? clamp((Math.atan(model.slopeAt(card.s) / strings[card.string].rest.length) * 180) / Math.PI * 1.15, -5, 5) : 0;
      const steps = 4, h = dt / steps;
      for (let k = 0; k < steps; k++) {
        card.omega += (95 * (target - card.theta) - 7.5 * card.omega) * h;
        card.theta += card.omega * h;
      }
      card.theta = clamp(card.theta, -7, 7);
      if (!moving && Math.abs(card.theta) < 0.01 && Math.abs(card.omega) < 0.02) {
        card.theta = 0;
        card.omega = 0;
        if (card.written) {card.swing.style.transform = ''; card.written = false;}
        continue;
      }
      busy = true;
      card.swing.style.transform = `translate3d(${(card.nx * bob * scale).toFixed(2)}px,${(card.ny * bob * scale).toFixed(2)}px,0) rotate(${card.theta.toFixed(3)}deg)`;
      card.written = true;
    }
    if (!busy) sleep();
  }

  // ---- Responses ----
  const pointOn = (st: StringState, s: number) => {
    const k = clamp(Math.round(s * SEGMENTS), 0, SEGMENTS);
    return {x: st.x[k], y: st.y[k], k};
  };

  function respond(st: StringState, s: number, intensity: number) {
    const {x, y} = pointOn(st, s);
    track(gsap.fromTo(st.group, {'--hit': 0.35 + 0.65 * intensity}, {'--hit': 0, duration: 1.3, ease: 'power2.out', overwrite: 'auto'}));
    if (motion) {
      // The pulse: one short dash per direction, starting at the pluck and running out to each end.
      const dash = 0.07;
      st.pulses.forEach(path => {
        const toEnd = path.dataset.dir === '1';
        track(gsap.fromTo(path,
          {strokeDashoffset: dash / 2 - s, opacity: 0.55 + 0.45 * intensity},
          {strokeDashoffset: toEnd ? -1.02 : dash + 0.02, opacity: 0, duration: 0.85 + 0.6 * (toEnd ? 1 - s : s), ease: 'power1.out', overwrite: 'auto'}));
      });
    }
    const glow = responses[nextResponse++ % Math.max(1, responses.length)];
    if (glow) {
      glow.style.left = `${((x / layout.w) * 100).toFixed(2)}%`;
      glow.style.top = `${((y / layout.h) * 100).toFixed(2)}%`;
      track(gsap.timeline()
        .fromTo(glow, {opacity: 0, scale: motion ? 0.7 : 1}, {opacity: 0.35 + 0.5 * intensity, scale: 1, duration: 0.22, ease: 'power2.out'})
        .to(glow, {opacity: 0, duration: 1.5, ease: 'power2.inOut'}));
    }
    for (const card of cards) if (card.string === st.index) track(gsap.fromTo(card.el, {'--resp': intensity}, {'--resp': 0, duration: 1.5, ease: 'power2.out', overwrite: 'auto'}));
    onPluck?.({string: st.index, intensity, pan: clamp((x / layout.w) * 2 - 1, -1, 1)});
    wake();
  }

  // ---- Pointer ----
  const toUnits = (event: PointerEvent): [number, number] => {
    const box = svg.getBoundingClientRect();
    return [((event.clientX - box.left) / box.width) * layout.w, ((event.clientY - box.top) / box.height) * layout.h];
  };
  /** Signed distance from the string's resting point at sample k, along its normal. */
  const across = (st: StringState, k: number, ux: number, uy: number) => (ux - st.rest.x[k]) * st.rest.nx[k] + (uy - st.rest.y[k]) * st.rest.ny[k];

  let grab: {st: StringState; s: number; k: number; id: number; x0: number; y0: number; moved: boolean} | null = null;
  let strum: {id: number; ux: number; uy: number; time: number} | null = null;
  let tap: {st: StringState; s: number; id: number; x: number; y: number; time: number} | null = null;

  const setNear = (st: StringState, amount: number, ux?: number, uy?: number) => {
    st.nearTarget = amount;
    if (amount > 0 && st.gradient && ux !== undefined && uy !== undefined) {
      st.gradient.setAttribute('cx', ux.toFixed(1));
      st.gradient.setAttribute('cy', uy.toFixed(1));
    }
  };

  function hover(event: PointerEvent) {
    const [ux, uy] = toUnits(event);
    for (const st of strings) {
      if (!st) continue;
      const {index, distance} = nearestSample(st.x, st.y, ux, uy);
      const k = Math.round(index);
      setNear(st, distance < NEAR ? Math.pow(1 - distance / NEAR, 1.4) : 0, st.x[k], st.y[k]);
    }
    wake();
  }

  function letGo(sound = true) {
    if (!grab) return;
    const {st, s, moved} = grab;
    const held = st.model.displacementAt(s);
    let intensity: number;
    if (!moved && Math.abs(held) < 12) {
      // A click: a fingertip pluck from where it is.
      st.model.release();
      st.model.strike(s, 0.42 * layout.maxPull);
      intensity = 0.55;
    } else {
      st.model.release();
      intensity = clamp(Math.abs(held) / layout.maxPull, 0.18, 1);
    }
    if (root.hasPointerCapture(grab.id)) root.releasePointerCapture(grab.id);
    delete root.dataset.grabbing;
    grab = null;
    if (sound) respond(st, s, intensity);
    else wake();
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || grab || strum) return;
    const target = event.target as Element;
    if (target.closest('.ns-card, a, button')) return;
    const hit = target.closest<SVGPathElement>('.ns-hit');
    const [ux, uy] = toUnits(event);
    if (hit) {
      const st = strings[Number(hit.dataset.string)];
      if (!st) return;
      const {index} = nearestSample(st.rest.x, st.rest.y, ux, uy);
      const s = index / SEGMENTS;
      if (event.pointerType === 'touch' || !motion) {
        // Touch keeps native scrolling: decide on release whether this was a tap.
        tap = {st, s, id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp};
        return;
      }
      event.preventDefault();
      root.setPointerCapture(event.pointerId);
      root.dataset.grabbing = '';
      const k = Math.round(index);
      grab = {st, s, k, id: event.pointerId, x0: event.clientX, y0: event.clientY, moved: false};
      st.model.hold(s, across(st, k, ux, uy));
      wake();
      return;
    }
    if (event.pointerType !== 'touch' && motion) {
      event.preventDefault();
      root.setPointerCapture(event.pointerId);
      strum = {id: event.pointerId, ux, uy, time: event.timeStamp};
      for (const st of strings) {
        if (!st) continue;
        const k = Math.round(nearestSample(st.rest.x, st.rest.y, ux, uy).index);
        st.side = Math.sign(across(st, k, ux, uy));
      }
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (grab && event.pointerId === grab.id) {
      const [ux, uy] = toUnits(event);
      const pull = across(grab.st, grab.k, ux, uy);
      if (Math.hypot(event.clientX - grab.x0, event.clientY - grab.y0) > 4) grab.moved = true;
      // Pulled past its limit, the string slips from the finger: a full pluck.
      if (Math.abs(pull) > layout.maxPull * 1.18) letGo();
      else {grab.st.model.hold(grab.s, pull); wake();}
      return;
    }
    if (strum && event.pointerId === strum.id) {
      const [ux, uy] = toUnits(event);
      const dt = Math.max(1, event.timeStamp - strum.time) / 1000;
      const speed = Math.hypot(ux - strum.ux, uy - strum.uy) / dt;
      for (const st of strings) {
        if (!st) continue;
        const {index, distance} = nearestSample(st.rest.x, st.rest.y, ux, uy);
        const side = Math.sign(across(st, Math.round(index), ux, uy));
        if (st.side && side && side !== st.side && distance < 80 && event.timeStamp - st.lastStrum > 90) {
          const intensity = clamp(speed / 2600, 0.2, 1);
          st.model.strike(index / SEGMENTS, side * (0.22 + 0.4 * intensity) * layout.maxPull);
          st.lastStrum = event.timeStamp;
          respond(st, index / SEGMENTS, intensity);
        }
        if (side) st.side = side;
      }
      strum = {id: strum.id, ux, uy, time: event.timeStamp};
    }
    if (event.pointerType !== 'touch') hover(event);
  }

  function onPointerUp(event: PointerEvent) {
    if (grab && event.pointerId === grab.id) letGo(event.type !== 'pointercancel');
    if (strum && event.pointerId === strum.id) {
      if (root.hasPointerCapture(strum.id)) root.releasePointerCapture(strum.id);
      strum = null;
    }
    if (tap && event.pointerId === tap.id) {
      const still = Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < 10 && event.timeStamp - tap.time < 600;
      if (event.type === 'pointerup' && still) {
        if (motion) tap.st.model.strike(tap.s, 0.5 * layout.maxPull);
        respond(tap.st, tap.s, 0.6);
      }
      tap = null;
    }
  }

  function onPointerLeave() {
    for (const st of strings) if (st) setNear(st, 0);
    wake();
  }

  // Cards: hovering or focusing one lets its string answer softly (no sound).
  const cardListeners: [HTMLElement, string, EventListener][] = [];
  for (const card of cards) {
    const st = strings[card.string];
    const answer = () => {
      const {x, y} = pointOn(st, card.s);
      setNear(st, 0.7, x, y);
      if (motion && !st.model.held) st.model.strike(card.s, 0.07 * layout.maxPull);
      wake();
    };
    const quiet = () => {setNear(st, 0); wake();};
    for (const [type, fn] of [['pointerenter', answer], ['focusin', answer], ['pointerleave', quiet], ['focusout', quiet]] as const) {
      card.el.addEventListener(type, fn);
      cardListeners.push([card.el, type, fn]);
    }
  }

  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerup', onPointerUp);
  root.addEventListener('pointercancel', onPointerUp);
  root.addEventListener('pointerleave', onPointerLeave);
  // A drag that starts on a string must never become a native drag or a text selection.
  const noDrag = (event: Event) => event.preventDefault();
  root.addEventListener('dragstart', noDrag);

  // Off screen, nothing runs; coming back, everything is at rest.
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) return;
    if (grab) letGo(false);
    strum = null;
    tap = null;
    for (const st of strings) if (st) {st.model.reset(); st.nearTarget = 0;}
    for (const card of cards) {card.theta = 0; card.omega = 0;}
    tick(0, 16);
    sleep();
  });
  observer.observe(root);

  const delays: gsap.core.Tween[] = [];
  return {
    pluck(index, {s = 0.32, intensity = 0.6} = {}) {
      const st = strings[index];
      if (!st) return;
      if (motion) st.model.strike(s, (0.28 + 0.4 * intensity) * layout.maxPull);
      respond(st, s, intensity);
    },
    shimmer() {
      if (!motion || !visible) return;
      strings.forEach((st, i) => {
        if (!st) return;
        delays.push(gsap.delayedCall(i * 0.13, () => {if (!visible) return; st.model.strike(0.5, 0.09 * layout.maxPull); wake();}));
      });
    },
    swingCard(index, degrees) {
      const card = cards.find(c => c.index === index);
      if (!card || !motion || !visible) return;
      card.theta = degrees;
      card.omega = 0;
      wake();
    },
    destroy() {
      sleep();
      observer.disconnect();
      resize.disconnect();
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerUp);
      root.removeEventListener('pointerleave', onPointerLeave);
      root.removeEventListener('dragstart', noDrag);
      cardListeners.forEach(([el, type, fn]) => el.removeEventListener(type, fn));
      delays.forEach(d => d.kill());
      tweens.forEach(t => t.kill());
      delete root.dataset.grabbing;
      svg.style.removeProperty('--u');
      for (const st of strings) {
        if (!st) continue;
        st.model.reset();
        for (const path of st.paths) path.setAttribute('d', st.restD);
        st.group.style.removeProperty('--near');
        st.group.style.removeProperty('--hit');
        st.pulses.forEach(path => gsap.set(path, {clearProps: 'strokeDashoffset,opacity'}));
      }
      for (const card of cards) {
        card.swing.style.transform = '';
        card.el.style.removeProperty('--resp');
      }
      responses.forEach(glow => gsap.set(glow, {clearProps: 'opacity,transform,left,top'}));
    },
  };
}
