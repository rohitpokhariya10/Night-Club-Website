import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {EASE} from '../motion/config';
import {revealOnFocus, type RevealRegistry} from '../motion/primitives';
import type {Instrument} from './instrument';
import type {InstrumentLayout} from '../experience';

/**
 * The section's scroll choreography (motion allowed only; call inside a gsap.matchMedia context).
 *
 * Entrance, once, when the section arrives: the room's light comes up; the eyebrow wipes in and the headline words
 * rise through their masks; the lede and controls follow; the strings draw themselves across the room, one after
 * another; each photograph is clipped onto its string (the clip appears, the thread lowers, the print unrolls
 * downward and swings into place under the string physics); captions settle; then the hint, and the strings
 * shimmer once to show they are live. A fast jump past the section, or keyboard focus inside it, finishes it at once.
 *
 * Depth: only the light and the headline drift with scroll (desktop and tablet). The instrument itself never moves
 * with scroll, so the cards stay exactly on their strings. Returns a cleanup for listeners.
 */
export function stringsScene({section, svg, layout, instrument, mobile}: {section: HTMLElement; svg: SVGSVGElement; layout: InstrumentLayout; instrument: Instrument; mobile: boolean}) {
  const q = (selector: string) => section.querySelector<HTMLElement>(selector);
  const qa = (selector: string, root: ParentNode = section) => Array.from(root.querySelectorAll<HTMLElement>(selector));
  const lights = qa('.ns-atmos > span');
  const registry: RevealRegistry = new Map();

  // Cards that hang at this size, in the order they are clipped on: string by string, left to right.
  const cards = qa('.ns-card')
    .map(el => ({el, index: Number(el.dataset.index), at: layout.cards[Number(el.dataset.index)]}))
    .filter(card => card.at)
    .sort((a, b) => a.at!.string - b.at!.string || a.at!.x - b.at!.x);

  const entrance = gsap.timeline({paused: true, defaults: {ease: EASE.reveal}, onComplete: () => instrument.shimmer()})
    .fromTo(lights, {opacity: 0}, {opacity: 1, duration: 1.6, ease: 'power1.out', clearProps: 'opacity'}, 0)
    .from(q('.ns-eyebrow'), {clipPath: 'inset(0% 100% 0% 0%)', duration: 1, ease: 'power3.inOut', clearProps: 'clipPath'}, 0.05)
    .from(qa('.ns-title .nw > span'), {yPercent: 112, rotate: 4, duration: 1.1, stagger: 0.07, clearProps: 'transform'}, 0.12)
    .from(qa('.ns-lede, .ns-controls'), {y: 18, opacity: 0, duration: 0.8, stagger: 0.08, ease: EASE.entrance, clearProps: 'transform,opacity'}, 0.45);

  qa('.ns-string', svg).forEach((group, i) => {
    entrance.fromTo(qa('.ns-air, .ns-halo, .ns-core', group),
      {strokeDasharray: '1 1', strokeDashoffset: 1},
      // pathLength="1" units: no rounding to whole pixels, or the line would pop instead of drawing.
      {strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut', autoRound: false, clearProps: 'strokeDasharray,strokeDashoffset'}, 0.5 + i * 0.14);
  });

  cards.forEach(({el, index}, j) => {
    const at = 1.0 + j * 0.1;
    entrance
      .from(el.querySelector('.ns-bead'), {scale: 0, duration: 0.4, ease: 'back.out(2.2)', clearProps: 'transform'}, at)
      .from(el.querySelector('.ns-thread'), {scaleY: 0, duration: 0.45, ease: 'power2.out', clearProps: 'transform'}, at + 0.06)
      .from(el.querySelector('.ns-plate'), {clipPath: 'inset(0% 0% 100% 0%)', y: -16, duration: 1, clearProps: 'clipPath,transform'}, at + 0.22)
      .call(() => instrument.swingCard(index, j % 2 ? 3.4 : -3.4), [], at + 0.3)
      .from(el.querySelector('.ns-caption'), {opacity: 0, y: 6, duration: 0.6, ease: EASE.entrance, clearProps: 'opacity,transform'}, at + 0.62);
  });
  entrance.from(q('.ns-hint'), {opacity: 0, y: 8, duration: 0.7, ease: EASE.entrance, clearProps: 'opacity,transform'}, '>-0.15');
  registry.set(section, [entrance]);

  // Plays once when the section arrives; jumping past it finishes it, so nothing is ever left hidden.
  ScrollTrigger.create({
    trigger: section, start: 'top 72%', end: 'bottom top',
    onEnter: () => {if (entrance.progress() < 1) entrance.play();},
    onLeave: () => entrance.progress(1),
    onEnterBack: () => entrance.progress(1),
  });

  const depth = {trigger: section, start: 'top bottom', end: 'bottom top', scrub: true};
  if (!mobile) {
    lights.forEach((light, i) => gsap.fromTo(light, {yPercent: i % 2 ? 14 : -12}, {yPercent: i % 2 ? -12 : 16, ease: 'none', scrollTrigger: {...depth}}));
    gsap.fromTo(q('.ns-head'), {y: 12}, {y: -14, ease: 'none', scrollTrigger: {...depth}});
  }
  // The room's light dims as the next section arrives; the strings themselves fade at the edges (CSS mask).
  gsap.fromTo(q('.ns-atmos'), {opacity: 1}, {opacity: 0.35, ease: 'none', immediateRender: false, scrollTrigger: {trigger: section, start: 'bottom 85%', end: 'bottom top', scrub: true}});

  return revealOnFocus(section, registry);
}
