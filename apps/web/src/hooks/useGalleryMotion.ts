'use client';

import {useLayoutEffect, type RefObject} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';

export function useGalleryMotion(root: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const grid = root.current;
    const section = grid?.closest('.gallery-page');
    if (!grid || !section) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add({motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 1025px) and (hover: hover) and (pointer: fine)'}, context => {
      if (!context.conditions?.motion) return;
      const desktop = context.conditions.desktop;
      const heading = section.querySelector('.gallery-heading');
      if (heading) {
        gsap.timeline({scrollTrigger: {trigger: heading, start: 'top 85%', once: true}})
          .from(heading.querySelector('.script'), {y: 14, opacity: 0, duration: .55, ease: 'power3.out', clearProps: 'all'})
          .from(heading.querySelector('.gallery-title-text'), {yPercent: 105, opacity: 0, duration: .8, ease: 'power3.out', clearProps: 'all'}, .12);
      }
      const reveals = new Map<Element, gsap.core.Tween>();
      grid.querySelectorAll<HTMLButtonElement>('.gallery-tile').forEach((tile, i) => {
        const tween = gsap.from(tile, {
          y: desktop ? 42 : 24, opacity: 0, duration: .85,
          delay: (i % (desktop ? 3 : 2)) * .1, ease: 'power3.out', clearProps: 'all',
          scrollTrigger: {trigger: tile, start: 'top 85%', once: true},
        });
        reveals.set(tile, tween);
      });
      // Keyboard navigation must never land on a card waiting to be revealed.
      function revealFocused(event: Event) {
        const tile = (event.target as HTMLElement).closest('.gallery-tile');
        if (tile) reveals.get(tile)?.progress(1);
      }
      grid.addEventListener('focusin', revealFocused);
      if (desktop) grid.querySelectorAll<HTMLElement>('[data-gallery-depth]').forEach(layer => {
        gsap.fromTo(layer, {yPercent: -1.5}, {
          yPercent: 1.5, ease: 'none',
          scrollTrigger: {trigger: layer.closest('.gallery-tile'), start: 'top bottom', end: 'bottom top', scrub: .7},
        });
      });
      return () => grid.removeEventListener('focusin', revealFocused);
    });
    return () => media.revert();
  }, [root]);
}
