'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {EASE, QUERIES} from '@/lib/motion/config';
import {lineReveal, mediaOf} from '@/lib/motion/primitives';
import {footerScene} from '@/lib/motion/footerScene';

/**
 * Site-wide motion for every route: the internal-page intro, generic reveals on internal
 * pages, and the footer's reveal. The homepage choreography lives in HomeMotion.
 */
export default function Motion() {
  const path = usePathname();
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    const frame = requestAnimationFrame(() => media.add(QUERIES.motion, () => {
      const intro = document.querySelector('.page-intro');
      if (intro) {
        // Route entry: the intro photo settles and the title rises out of its mask. Short and non-blocking.
        gsap.timeline({defaults: {ease: EASE.entrance}})
          .from(mediaOf(intro.querySelector(':scope > .photo')), {scale: 1.12, duration: 1.6, ease: 'power2.out', clearProps: 'transform'}, 0)
          .from(intro.querySelectorAll('.breadcrumb, .intro-content > .script'), {y: 14, opacity: 0, duration: 0.6, stagger: 0.08, clearProps: 'transform,opacity'}, 0.1)
          .from(intro.querySelector('.intro-content > p:last-child'), {y: 18, opacity: 0, duration: 0.7, clearProps: 'transform,opacity'}, 0.45);
        lineReveal(intro.querySelector('h1'), {start: 'top bottom', delay: 0.15});
      }
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(el => {
        if (el.closest('[data-home]')) return;
        gsap.from(el, {y: 26, opacity: 0, duration: 0.8, ease: 'power2.out', scrollTrigger: {trigger: el, start: 'top 94%', once: true}, clearProps: 'all'});
      });
      gsap.utils.toArray<HTMLElement>('[data-parallax] img').forEach(el => {
        if (el.closest('[data-home]')) return;
        gsap.fromTo(el, {yPercent: -4, scale: 1.12}, {yPercent: 4, scale: 1.12, ease: 'none', scrollTrigger: {trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1}});
      });
    }));
    // The footer's subtle reveal, in its own context so it is rebuilt for each page without touching the rest.
    const footerFrame = requestAnimationFrame(() => media.add(QUERIES.motion, () => {
      const footer = document.querySelector<HTMLElement>('.footer');
      return footer ? footerScene(footer) : undefined;
    }));
    return () => {cancelAnimationFrame(frame); cancelAnimationFrame(footerFrame); media.revert();};
  }, [path]);
  return null;
}
