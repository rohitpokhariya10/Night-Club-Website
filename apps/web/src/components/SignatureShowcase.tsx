'use client';

import {useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {Arrow} from './ui';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {CustomEase} from 'gsap/CustomEase';
import {EASE, MEASURED_EASE, QUERIES} from '@/lib/motion/config';
import {revealOnFocus, whenIdle, type RevealRegistry} from '@/lib/motion/primitives';
import type {FeaturedItem} from '@/lib/featured';

/**
 * Section B: Signature Selections (FOOD-REFERENCE-MOTION.md, reference B).
 * A large plated dish rises from the section's lower edge into the page, the way the reference's bowl does:
 * each photograph is sized from its measured plate width (so every dish renders at the same scale) and turns
 * around the plate's own centre, with its surroundings dissolving into the page. Verified detail labels sit on
 * the reference's arc (40°, 51°, 63° from vertical) clear of the plate; round previous/next buttons sit on the
 * lower spokes. A change is the reference's measured turntable (fitted 1.1 s ease, direction-aware): the
 * outgoing dish turns away while fading and easing back in depth, the incoming dish turns in to rest; labels
 * swap with a 10 px outward drift; the copy hands off in sequence. Top-down shots turn the reference's full 90°,
 * angled shots a restrained swing (FeaturedItem.turn). Server-rendered and complete without JavaScript.
 */
const ANGLES = [40, 51, 63];
const slots = ANGLES.map(a => ({sx: Math.sin((a * Math.PI) / 180).toFixed(4), cy: Math.cos((a * Math.PI) / 180).toFixed(4)}));
const pad = (n: number) => String(n).padStart(2, '0');
const DEFAULT_PLATE = {size: 0.9, x: 0.5, y: 0.5};

export default function SignatureShowcase({items}: {items: FeaturedItem[]}) {
  const count = items.length;
  const [active, setActive] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const previous = useRef(0);
  const direction = useRef(1);
  const root = useRef<HTMLElement>(null);
  const change = useRef<gsap.core.Timeline | null>(null);
  const entrance = useRef<gsap.core.Animation | null>(null);
  const swipe = useRef<{x: number; y: number; id: number} | null>(null);

  const go = (index: number, dir?: number) => {
    const next = (index + count) % count;
    if (next === active) return;
    entrance.current?.progress(1);
    direction.current = dir ?? (next > active ? 1 : -1);
    previous.current = active;
    setActive(next);
    setAnnouncement(`${items[next].title}, ${next + 1} of ${count}`);
  };

  useLayoutEffect(() => {
    const section = root.current;
    const from = previous.current;
    if (!section || from === active) return;
    previous.current = active;
    change.current?.progress(1).kill();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(CustomEase);
    const turn = CustomEase.create('jo-turn', MEASURED_EASE.turn.path);
    const dir = direction.current;
    const of = (selector: string, index: number) => Array.from(section.querySelectorAll<HTMLElement>(`${selector}[data-item="${index}"]`));
    const outgoing = [...of('.sig-dish', from), ...of('.sig-item', from), ...of('.sig-group', from)];
    const incoming = [...of('.sig-dish', active), ...of('.sig-item', active), ...of('.sig-group', active)];
    const tl = gsap.timeline({
      defaults: {duration: MEASURED_EASE.turn.duration, ease: turn},
      // Clear only what the timeline set: the dishes also carry React's inline plate-geometry variables.
      onComplete: () => gsap.set([...outgoing, ...incoming, section.querySelector('.sig-glow')], {clearProps: 'transform,opacity,visibility'}),
    });
    // The outgoing state stays visible (inline) while it leaves; CSS already shows only the new item.
    tl.set(outgoing, {visibility: 'visible', opacity: 1}, 0)
      .fromTo(of('.sig-dish', from), {rotation: 0, scale: 1, opacity: 1}, {rotation: dir * items[from].turn * 1.6, scale: 0.93, opacity: 0}, 0)
      .fromTo(of('.sig-dish', active), {rotation: -dir * items[active].turn, scale: 1.04, opacity: 0}, {rotation: 0, scale: 1, opacity: 1}, 0)
      // The copy hands off in sequence (the reference cross-fades one-line titles; ours carry a description).
      .fromTo(of('.sig-item', from), {y: 0, opacity: 1}, {y: 10, opacity: 0, duration: 0.42, ease: 'power2.in'}, 0)
      .fromTo(of('.sig-item', active), {y: 10, opacity: 0}, {y: 0, opacity: 1, duration: 0.7, ease: EASE.entrance}, 0.4);
    for (const side of ['left', 'right'] as const) {
      const out = side === 'left' ? -10 : 10;
      tl.fromTo(section.querySelectorAll(`.sig-group[data-side="${side}"][data-item="${from}"]`), {x: 0, opacity: 1}, {x: out, opacity: 0}, 0)
        .fromTo(section.querySelectorAll(`.sig-group[data-side="${side}"][data-item="${active}"]`), {x: out, opacity: 0}, {x: 0, opacity: 1}, 0);
    }
    // A soft light swells behind the plate at the changeover (no flash, no empty frame).
    tl.fromTo(section.querySelector('.sig-glow'), {opacity: 0.6, scale: 1}, {opacity: 0.9, scale: 1.06, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1}, 0.1);
    change.current = tl;
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll: the plate is set down as the section arrives and eases back as it leaves (one scrubbed timeline);
  // the heading, labels and controls assemble once. Built at idle time; focus completes the reveals.
  useLayoutEffect(() => {
    const section = root.current;
    if (!section) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add({motion: QUERIES.motion, mobile: QUERIES.mobile}, context => {
      const {motion, mobile} = context.conditions as {motion: boolean; mobile: boolean};
      if (!motion) return;
      const registry: RevealRegistry = new Map();
      const cancel = whenIdle(() => context.add(() => {
        gsap.timeline({scrollTrigger: {id: 'signature-plate', trigger: section, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true}, defaults: {ease: EASE.scrub}})
          .fromTo(section.querySelector('.sig-plate'), {yPercent: mobile ? 8 : 14, rotation: -18, scale: 0.94}, {yPercent: 0, rotation: 0, scale: 1, duration: 0.42, ease: 'power2.out'}, 0)
          .to(section.querySelector('.sig-plate'), {yPercent: mobile ? -3 : -5, scale: 0.97, duration: 0.3}, 0.7);
        // Play once without `once: true`: a passed once-trigger kills itself during ScrollTrigger's refresh,
        // which crashed GSAP when another scene was created in the same tick (phones, page scrolled to the end).
        const tl = gsap.timeline({scrollTrigger: {trigger: section, start: 'top 72%', toggleActions: 'play none none none'}, defaults: {ease: EASE.reveal}})
          .from(section.querySelector('.sig-pill'), {opacity: 0, y: 10, duration: 0.8, clearProps: 'opacity,transform'}, 0)
          .from(section.querySelector('.sig-items'), {opacity: 0, y: 18, duration: 0.9, ease: EASE.entrance, clearProps: 'opacity,transform'}, 0.15);
        if (!mobile) {
          // Labels assemble along their spokes, from the outside in.
          section.querySelectorAll<HTMLElement>('.sig-group[data-active] .sig-chip').forEach((chip, i) => {
            const left = chip.closest('[data-side="left"]');
            tl.from(chip, {x: left ? -26 : 26, opacity: 0, duration: 0.9, ease: EASE.entrance, clearProps: 'opacity,transform'}, 0.45 + (i % 3) * 0.08);
          });
        }
        tl.from(section.querySelectorAll('.sig-nav, .sig-index, .sig-counter'), {opacity: 0, duration: 0.8, ease: EASE.entrance, clearProps: 'opacity'}, 0.6);
        entrance.current = tl;
        registry.set(section, [tl]);
        section.dataset.motion = 'ready';
      }));
      const release = revealOnFocus(section, registry);
      return () => {cancel(); release(); delete section.dataset.motion;};
    });
    return () => media.revert();
  }, []);

  // Touch swipe on the plate (vertical scrolling stays native: touch-action pan-y).
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {swipe.current = {x: event.clientX, y: event.clientY, id: event.pointerId};};
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(event.clientY - start.y) * 1.2) go(active + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  };

  return <section ref={root} className="sig" aria-roledescription="carousel" aria-labelledby="sig-heading">
    <span className="sig-backdrop" aria-hidden="true" />
    <div className="sig-head">
      <h2 id="sig-heading" className="sig-pill">Signature Selections</h2>
      <div className="sig-items">
        {items.map((item, i) => <div key={item.id} className="sig-item" data-item={i} data-active={i === active || undefined}
          role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`} aria-hidden={i !== active || undefined}>
          <h3 className="sig-title">{item.title}</h3>
          <p className="sig-description">{item.description}</p>
          <Link className="sig-cta" href={item.cta.href} tabIndex={i === active ? undefined : -1}>{item.cta.label}<Arrow dir="up-right" size={15} /></Link>
        </div>)}
      </div>
      <ol className="sig-index" aria-label="Signature selections">
        {items.map((item, i) => <li key={item.id}><button type="button" aria-label={item.title} title={item.title} aria-current={i === active || undefined} onClick={() => go(i)}><span /></button></li>)}
      </ol>
    </div>
    <div className="sig-stage">
      {/* The dish layer: faded to nothing inside the stage, so the scene never reaches the section's edge. */}
      <div className="sig-scene">
        <div className="sig-plate">
          <span className="sig-glow" aria-hidden="true" />
          {items.map((item, i) => {
            const plate = item.image.plate ?? DEFAULT_PLATE;
            return <div key={item.id} className="sig-dish" data-item={i} data-active={i === active || undefined} data-cutout={item.image.cutout || undefined} aria-hidden={i !== active || undefined}
              style={{'--pf': plate.size, '--px': plate.x, '--py': plate.y, '--ar': item.image.width / item.image.height} as CSSProperties}>
              <Image src={item.image.src} alt={item.image.alt} fill sizes="(max-width: 700px) 96vw, (max-width: 1100px) 80vw, 900px" style={{objectPosition: item.image.focus}} />
            </div>;
          })}
        </div>
      </div>
      <div className="sig-orbit" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => {swipe.current = null;}}>
        <svg className="sig-guides" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          {/* The rings fade by height (drawn into their stroke, so nothing is clipped): steady around the dish, a touch
              stronger as they sweep into the breathing space below it, gone by the orbit's lower edge (the section's). */}
          <defs>
            <linearGradient id="sig-arc-fade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
              <stop offset="0" style={{stopColor: 'var(--accent-readable)'}} stopOpacity="0.09" />
              <stop offset="0.72" style={{stopColor: 'var(--accent-readable)'}} stopOpacity="0.09" />
              <stop offset="0.86" style={{stopColor: 'var(--accent-readable)'}} stopOpacity="0.16" />
              <stop offset="1" style={{stopColor: 'var(--accent-readable)'}} stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="59" />
          <circle cx="50" cy="50" r="68" />
          {[...slots, {sx: Math.sin((78 * Math.PI) / 180).toFixed(4), cy: Math.cos((78 * Math.PI) / 180).toFixed(4)}].flatMap(({sx, cy}, k) => [-1, 1].map(side =>
            <line key={`${k}${side}`} x1={50 + side * Number(sx) * 53} y1={50 - Number(cy) * 53} x2={50 + side * Number(sx) * 76} y2={50 - Number(cy) * 76} />))}
        </svg>
        {(['left', 'right'] as const).map(side => <div key={side} className={`sig-labels sig-labels-${side}`}>
          {items.map((item, i) => {
            const labels = side === 'left' ? item.labels.filter((_, k) => k % 2 === 0) : item.labels.filter((_, k) => k % 2 === 1);
            return <ul key={item.id} className="sig-group" data-side={side} data-item={i} data-active={i === active || undefined}
              aria-label={side === 'left' ? `${item.title} details` : undefined} aria-hidden={i !== active || undefined}>
              {labels.slice(0, 3).map((label, k) => <li key={label} className="sig-chip" style={{'--sx': slots[k].sx, '--cy': slots[k].cy} as CSSProperties}><span className="sig-dot" aria-hidden="true" />{label}</li>)}
            </ul>;
          })}
        </div>)}
        <div className="sig-nav">
          <button type="button" className="sig-arrow sig-prev" aria-label="Previous selection" onClick={() => go(active - 1, -1)}><Arrow dir="left" size={20} /></button>
          <button type="button" className="sig-arrow sig-next" aria-label="Next selection" onClick={() => go(active + 1, 1)}><Arrow dir="right" size={20} /></button>
        </div>
      </div>
    </div>
    <p className="sig-counter" aria-hidden="true"><span>{pad(active + 1)}</span> / {pad(count)}</p>
    <p className="sr-only" aria-live="polite">{announcement}</p>
  </section>;
}
