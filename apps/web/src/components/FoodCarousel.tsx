'use client';

import {useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {Arrow} from './ui';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {CustomEase} from 'gsap/CustomEase';
import {EASE, MEASURED_EASE, QUERIES} from '@/lib/motion/config';
import {revealOnFocus, whenIdle, type RevealRegistry} from '@/lib/motion/primitives';
import type {FoodCategory} from '@/lib/featured';

/**
 * Section A: Food & Drinks carousel (FOOD-REFERENCE-MOTION.md, reference A).
 * One featured card in the centre with its neighbours at 0.8× behind it. A change moves every card in one
 * GSAP timeline with the reference's measured settle (0.62 s, ~6% overshoot); the outgoing headline leaves
 * through its mask, the incoming headline rises in, the copy and call to action follow and the section's
 * light shifts tone. Arrows, category tabs (arrow keys), a click on a neighbour, drag and touch swipe all
 * change it; vertical scrolling stays native (touch-action: pan-y, no wheel handling).
 * The resting layout is pure CSS (each card's --slot), so it is complete without JavaScript.
 */
const TONES: Record<string, string> = {food: '#6e32a8', drinks: '#4b5bd6', 'after-dark': '#9259c5'};
const SIDE_SCALE = 0.8;

export default function FoodCarousel({categories, eyebrow, title}: {categories: FoodCategory[]; eyebrow: string; title: string}) {
  const count = categories.length;
  const [active, setActive] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const previous = useRef(0);
  const root = useRef<HTMLElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusTab = useRef(false);
  const change = useRef<gsap.core.Timeline | null>(null);
  const entrance = useRef<gsap.core.Animation | null>(null);
  const drag = useRef<{x: number; y: number; moved: boolean; id: number} | null>(null);
  const suppressClick = useRef(false);

  /** Position of card `i` relative to the active one: 0 centre, -1 left, 1 right (wrapping). */
  const slotOf = (i: number, current: number) => {
    let d = (i - current) % count;
    if (d > count / 2) d -= count;
    if (d < -count / 2) d += count;
    return d;
  };
  const go = (index: number, viaTab = false) => {
    const next = (index + count) % count;
    if (next === active) return;
    entrance.current?.progress(1);
    previous.current = active;
    focusTab.current = viaTab;
    setActive(next);
    setAnnouncement(`${categories[next].label}, ${next + 1} of ${count}`);
  };

  // The change: one coordinated timeline, built before paint so the new slots never flash.
  useLayoutEffect(() => {
    const section = root.current;
    const from = previous.current;
    if (focusTab.current) tabs.current[active]?.focus();
    if (!section || from === active) return;
    previous.current = active;
    change.current?.progress(1).kill();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      section.style.setProperty('--fd-tone', TONES[categories[active].id] ?? TONES.food);
      return;
    }
    gsap.registerPlugin(CustomEase);
    const settle = CustomEase.create('jo-carousel', MEASURED_EASE.carousel.path);
    const spread = parseFloat(getComputedStyle(section).getPropertyValue('--fd-spread')) || 57;
    const at = (slot: number) => ({xPercent: slot * spread, scale: slot === 0 ? 1 : SIDE_SCALE});
    const cards = Array.from(section.querySelectorAll<HTMLElement>('.fd-card'));
    const tl = gsap.timeline({
      defaults: {duration: MEASURED_EASE.carousel.duration, ease: settle},
      onComplete: () => {
        gsap.set(cards, {clearProps: 'transform,opacity,zIndex'});
        gsap.set(section.querySelectorAll('.fd-shade, .fd-title, .fd-line > span, .fd-body'), {clearProps: 'all'});
      },
    });
    cards.forEach((card, i) => {
      const a = slotOf(i, from);
      const b = slotOf(i, active);
      tl.set(card, {zIndex: b === 0 ? 3 : a === 0 ? 2 : 1}, 0);
      if (Math.abs(b - a) > 1) {
        // The card that wraps around leaves past the edge and comes back in from the other side.
        tl.fromTo(card, {...at(a), opacity: 1}, {xPercent: a * spread * 1.7, scale: 0.7, opacity: 0, duration: 0.26, ease: 'power2.in'}, 0)
          .set(card, {xPercent: b * spread * 1.7}, 0.26)
          .to(card, {...at(b), opacity: 1, duration: 0.5}, 0.28);
      } else {
        tl.fromTo(card, at(a), at(b), 0);
      }
      tl.fromTo(card.querySelector('.fd-shade'), {opacity: a === 0 ? 0 : 0.5}, {opacity: b === 0 ? 0 : 0.5, duration: 0.5, ease: 'power2.out'}, 0);
      const lines = card.querySelectorAll('.fd-line > span');
      const body = card.querySelector('.fd-body');
      if (a === 0) {
        // Outgoing headline leaves through its mask; its copy and call to action fade up and away.
        tl.set([card.querySelector('.fd-title'), body], {opacity: 1}, 0)
          .fromTo(lines, {yPercent: 0}, {yPercent: -112, duration: 0.36, stagger: 0.04, ease: 'power2.in'}, 0)
          .fromTo(body, {opacity: 1, y: 0}, {opacity: 0, y: -10, duration: 0.3, ease: 'power2.in'}, 0);
      }
      if (b === 0) {
        tl.fromTo(lines, {yPercent: 112}, {yPercent: 0, duration: 0.8, stagger: 0.07, ease: EASE.reveal}, 0.24)
          .fromTo(body, {opacity: 0, y: 16}, {opacity: 1, y: 0, duration: 0.6, ease: EASE.entrance}, 0.36);
      }
    });
    tl.to(section, {'--fd-tone': TONES[categories[active].id] ?? TONES.food, duration: 0.9, ease: 'power2.inOut'}, 0);
    change.current = tl;
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll entrance (once): the heading rises through its masks, the neighbours fan out from behind the
  // featured card and the controls follow. Built at idle time; keyboard focus completes it at once.
  useLayoutEffect(() => {
    const section = root.current;
    if (!section) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add(QUERIES.motion, context => {
      const registry: RevealRegistry = new Map();
      const cancel = whenIdle(() => context.add(() => {
        const spread = parseFloat(getComputedStyle(section).getPropertyValue('--fd-spread')) || 57;
        const inners = Array.from(section.querySelectorAll<HTMLElement>('.fd-card'));
        // Play once without `once: true`: a once-trigger that is already passed kills itself during ScrollTrigger's
        // refresh, which crashed GSAP when another scene was created in the same tick (phones, page scrolled to the end).
        const tl = gsap.timeline({scrollTrigger: {trigger: section, start: 'top 78%', toggleActions: 'play none none none'}, defaults: {ease: EASE.reveal}})
          .from(section.querySelectorAll('.fd-heading .nw > span'), {yPercent: 112, duration: 1.1, stagger: 0.07, clearProps: 'transform'}, 0)
          .from(section.querySelector('.fd-eyebrow'), {opacity: 0, y: 12, duration: 0.8, clearProps: 'opacity,transform'}, 0);
        inners.forEach(card => {
          const slot = Number(card.dataset.slot);
          tl.from(card.querySelector('.fd-card-in'), {
            xPercent: -slot * spread * 0.9, y: slot === 0 ? 70 : 40, opacity: slot === 0 ? 1 : 0, duration: 1.2,
            clearProps: 'transform,opacity',
          }, slot === 0 ? 0.1 : 0.32);
        });
        tl.from(section.querySelector('.fd-controls'), {opacity: 0, y: 16, duration: 0.8, ease: EASE.entrance, clearProps: 'opacity,transform'}, 0.6);
        entrance.current = tl;
        registry.set(section, [tl]);
        section.dataset.motion = 'ready';
      }));
      const release = revealOnFocus(section, registry);
      return () => {cancel(); release(); delete section.dataset.motion;};
    });
    return () => media.revert();
  }, []);

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    const keys: Record<string, number> = {ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: count - 1};
    if (!(event.key in keys)) return;
    event.preventDefault();
    go(keys[event.key], true);
  }
  // Drag and swipe: horizontal gestures change the slide; vertical ones stay with the page (pan-y).
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    drag.current = {x: event.clientX, y: event.clientY, moved: false, id: event.pointerId};
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    const dx = event.clientX - state.x;
    if (!state.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(event.clientY - state.y)) {
      state.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (state.moved) gsap.set(event.currentTarget.querySelector('.fd-track'), {x: dx * 0.45});
  }
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    drag.current = null;
    if (!state?.moved) return;
    const dx = event.clientX - state.x;
    suppressClick.current = true;
    setTimeout(() => {suppressClick.current = false;}, 0);
    gsap.to(event.currentTarget.querySelector('.fd-track'), {x: 0, duration: 0.5, ease: 'power3.out'});
    if (Math.abs(dx) > 48) go(active + (dx < 0 ? 1 : -1));
  }

  return <section ref={root} className="fd" aria-roledescription="carousel" aria-labelledby="fd-heading" style={{'--fd-tone': TONES[categories[0].id]} as CSSProperties}>
    <span className="fd-light" aria-hidden="true" />
    <div className="fd-head">
      <p className="fd-eyebrow">{eyebrow}</p>
      <h2 id="fd-heading" className="fd-heading">{title.split(' ').map((word, i) => <span key={i}><span className="nw"><span>{word}</span></span>{' '}</span>)}</h2>
    </div>
    <div className="fd-stage" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onClickCapture={event => {if (suppressClick.current) {event.preventDefault(); event.stopPropagation();}}}>
      <div className="fd-track">
        {categories.map((category, i) => {
          const slot = slotOf(i, active);
          return <article key={category.id} id={`fd-card-${category.id}`} className="fd-card" data-slot={slot} style={{'--slot': slot} as CSSProperties}
            role="tabpanel" aria-roledescription="slide" aria-labelledby={`fd-tab-${category.id}`} aria-hidden={slot !== 0 || undefined}
            onClick={() => {if (slot !== 0) go(i);}}>
            <div className="fd-card-in">
              <div className="fd-media"><Image src={category.image.src} alt={category.image.alt} fill sizes="(max-width: 700px) 82vw, (max-width: 1100px) 62vw, 680px" style={{objectPosition: category.image.focus}} /></div>
              <span className="fd-scrim" aria-hidden="true" />
              <span className="fd-shade" aria-hidden="true" />
              <div className="fd-copy">
                <p className="fd-card-eyebrow">{category.eyebrow}</p>
                <h3 className="fd-title">{category.title.split(/(?<=\.)\s+/).map((line, k) => <span className="fd-line" key={line}>{k > 0 && ' '}<span>{line}</span></span>)}</h3>
                <div className="fd-body">
                  <p>{category.description}</p>
                  <Link className="fd-cta" href={category.cta.href} tabIndex={slot === 0 ? undefined : -1}>{category.cta.label}<span className="fd-cta-arrow" aria-hidden="true"><Arrow dir="up-right" size={16} /></span></Link>
                </div>
              </div>
            </div>
          </article>;
        })}
      </div>
    </div>
    <div className="fd-controls">
      <button type="button" className="fd-arrow" aria-label="Previous category" aria-controls={`fd-card-${categories[(active - 1 + count) % count].id}`} onClick={() => go(active - 1)}><Arrow dir="left" size={18} /></button>
      <div className="fd-tabs" role="tablist" aria-label="Food and drinks">
        {categories.map((category, i) => <button key={category.id} type="button" role="tab" id={`fd-tab-${category.id}`} className="fd-tab"
          ref={el => {tabs.current[i] = el;}} aria-selected={i === active} aria-controls={`fd-card-${category.id}`} tabIndex={i === active ? 0 : -1}
          onClick={() => go(i)} onKeyDown={onTabKey}><span className="fd-tab-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>{category.label}</button>)}
      </div>
      <button type="button" className="fd-arrow" aria-label="Next category" aria-controls={`fd-card-${categories[(active + 1) % count].id}`} onClick={() => go(active + 1)}><Arrow dir="right" size={18} /></button>
    </div>
    <p className="sr-only" aria-live="polite">{announcement}</p>
  </section>;
}
