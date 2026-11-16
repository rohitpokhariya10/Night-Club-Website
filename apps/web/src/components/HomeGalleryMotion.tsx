'use client';

import {useLayoutEffect, useRef, type ReactNode} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {EASE, QUERIES} from '@/lib/motion/config';
import {revealOnFocus, whenIdle, type RevealRegistry} from '@/lib/motion/primitives';
import {ringPoint} from '@/lib/gallery';

/**
 * Homepage gallery: eight photographs orbiting the section title, adapted from the reference's ring
 * choreography (GALLERY-REFERENCE-MOTION.md).
 * 1. Burst → settle: cards start enlarged, tilted and pushed outward, then settle into the ring as the
 *    section arrives. Scroll-scrubbed, so it reverses exactly and is never left half-done after a jump.
 * 2. Orbit: the ring keeps turning counter-clockwise with the page and breathes gently (1 → 1.06 → 1);
 *    cards stay upright. Tied to scroll rather than time, so nothing moves on its own (WCAG 2.2.2).
 * 3. Ripple: one card after another, counter-clockwise, dims, tilts and pops above its neighbours. It plays
 *    once each time the ring settles and when the pointer enters the ring (under two seconds).
 * Layout lives in CSS and is complete without JavaScript; each layer below has a single owner.
 */
const BURST_TILT = [-28, 34, -22, 38, -36, 24, -30, 26];
const BURST_SCALE = [1.75, 1.6, 1.9, 1.65, 1.8, 1.7, 1.6, 1.85];
const RIPPLE_TILT = [-14, 18, -12, 16, -18, 12, -16, 14];
/** Degrees the ring turns while settling, and while the visitor scrolls past it (both counter-clockwise). */
const SPIN_IN = 40;
const SPIN_ORBIT = 40;

export default function HomeGalleryMotion({children}: {children: ReactNode}) {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const section = root.current;
    if (!section) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add({motion: QUERIES.motion, mobile: QUERIES.mobile, pointer: '(hover: hover) and (pointer: fine)'}, context => {
      const {motion, mobile, pointer} = context.conditions as {motion: boolean; mobile: boolean; pointer: boolean};
      if (!motion) return;
      const ring = section.querySelector<HTMLElement>('.lens-ring');
      const cards = Array.from(section.querySelectorAll<HTMLElement>('.lens-card'));
      if (!ring || cards.length < 3) return;
      const count = cards.length;
      const inner = cards.map(card => card.querySelector<HTMLElement>('.lens-card-inner')!);
      const pops = cards.map(card => card.querySelector<HTMLElement>('.lens-card-pop')!);
      const registry: RevealRegistry = new Map();
      let removePointer = () => {};
      // Reverting the scene rewinds the spin tweens, whose updates must not move the cards once it is gone.
      let alive = true;

      const build = () => {
        // Orbit: each card's slot is rewritten from the two spin phases (no two tweens share a property).
        const spin = {settle: SPIN_IN, orbit: 0};
        const place = () => alive && cards.forEach((card, i) => {
          const {cx, cy} = ringPoint(i, count, spin.settle - spin.orbit);
          card.style.setProperty('--cx', cx);
          card.style.setProperty('--cy', cy);
        });

        // Ripple: counter-clockwise from `from` (card indices run clockwise). Recorded in this context.
        let wave: gsap.core.Timeline | null = null;
        const ripple = context.add('ripple', (from: number = 0) => {
          if (wave?.isActive()) return;
          wave = gsap.timeline({onComplete: () => gsap.set(cards, {clearProps: 'zIndex'})});
          for (let k = 0; k < count; k++) {
            const i = (((from - k) % count) + count) % count;
            const at = 0.16 + k * 0.1;
            wave
              .to(pops[i], {'--pulse': 0.42, duration: 0.16, ease: 'power1.in'}, at - 0.16)
              .set(cards[i], {zIndex: 20 + k}, at)
              .to(pops[i], {'--pulse': 0, rotation: RIPPLE_TILT[i % RIPPLE_TILT.length], scale: 1.1, duration: 0.28, ease: 'power3.out'}, at)
              .to(pops[i], {rotation: 0, scale: 1, duration: 0.55, ease: 'power3.out'}, at + 0.28);
          }
        }) as (from?: number) => void;

        // 1. Burst → settle, scrubbed as the ring arrives.
        const settle = gsap.timeline({
          defaults: {ease: EASE.scrub},
          scrollTrigger: {
            id: 'home-gallery-settle', trigger: ring,
            start: 'top 96%', end: mobile ? 'bottom 96%' : 'center 58%',
            scrub: true, invalidateOnRefresh: true,
            // The settle has just completed going down: the signature ripple, from the top card.
            onLeave: () => ripple(0),
          },
        });
        settle.fromTo(spin, {settle: SPIN_IN}, {settle: 0, duration: 1, ease: 'power2.out', onUpdate: place}, 0);
        cards.forEach((card, i) => {
          // Pushed outward from where the card starts (the ring is still turned by SPIN_IN at that point).
          const {cx, cy} = ringPoint(i, count, SPIN_IN);
          const push = mobile ? 34 : 55;
          settle.fromTo(inner[i],
            {xPercent: Number(cx) * push, yPercent: Number(cy) * push, scale: BURST_SCALE[i % 8] * (mobile ? 0.82 : 1), rotation: BURST_TILT[i % 8], '--shade': 0.62},
            {xPercent: 0, yPercent: 0, scale: 1, rotation: 0, '--shade': 0, duration: 0.82, ease: 'power2.out'},
            0.04 + (i % 4) * 0.045);
        });

        // 2. Orbit and breathing while the section scrolls past.
        gsap.timeline({
          defaults: {ease: EASE.scrub},
          scrollTrigger: {
            id: 'home-gallery-orbit', trigger: ring,
            start: mobile ? 'bottom 96%' : 'center 58%', end: 'bottom top',
            scrub: true, invalidateOnRefresh: true,
          },
        })
          .fromTo(spin, {orbit: 0}, {orbit: SPIN_ORBIT, duration: 1, onUpdate: place}, 0)
          .fromTo(ring, {'--breath': 1}, {'--breath': 1.06, duration: 0.5, ease: 'sine.inOut'}, 0)
          .to(ring, {'--breath': 1, duration: 0.5, ease: 'sine.inOut'}, 0.5);

        // 3. The title: eyebrow wipes on, each word rises through its mask, the call to action follows.
        const title = section.querySelector('.lens-title');
        if (title) {
          const reveal = gsap.timeline({scrollTrigger: {trigger: title, start: 'top 86%', once: true}, defaults: {ease: EASE.reveal}})
            .from(title.querySelector('.lens-eyebrow'), {clipPath: 'inset(0% 50% 0% 50%)', duration: 0.9, ease: 'power3.inOut', clearProps: 'clipPath'}, 0)
            .from(title.querySelectorAll('.nw > span'), {yPercent: 112, rotate: 4, duration: 1.1, stagger: 0.07, clearProps: 'transform'}, 0.12)
            // Opacity only: the button is positioned with CSS `translate`, which a GSAP transform would take over.
            .from(title.querySelector('.button'), {opacity: 0, duration: 0.8, ease: EASE.entrance, clearProps: 'opacity'}, 0.45);
          registry.set(title, [reveal]);
        }

        // Pointer: entering the ring sends a ripple from the nearest card.
        if (pointer) {
          const enter = (event: PointerEvent) => {
            let nearest = 0;
            let best = Infinity;
            cards.forEach((card, i) => {
              const box = card.getBoundingClientRect();
              const distance = Math.hypot(box.left + box.width / 2 - event.clientX, box.top + box.height / 2 - event.clientY);
              if (distance < best) {best = distance; nearest = i;}
            });
            ripple(nearest);
          };
          ring.addEventListener('pointerenter', enter);
          removePointer = () => ring.removeEventListener('pointerenter', enter);
        }
      };

      // The gallery is far below the fold: build it at the next idle moment, inside this context.
      const cancelIdle = whenIdle(() => {context.add(build); section.dataset.motion = 'ready';});
      const releaseFocus = revealOnFocus(section, registry);
      return () => {
        alive = false;
        cancelIdle(); releaseFocus(); removePointer();
        cards.forEach((card, i) => {
          const {cx, cy} = ringPoint(i, count);
          card.style.setProperty('--cx', cx);
          card.style.setProperty('--cy', cy);
          card.style.removeProperty('z-index');
        });
        ring.style.removeProperty('--breath');
        delete section.dataset.motion;
      };
    });
    return () => media.revert();
  }, []);

  return <section ref={root} className="section home-gallery" aria-labelledby="home-gallery-title">{children}</section>;
}
