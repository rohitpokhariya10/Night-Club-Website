'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {QUERIES, ANCHOR_OFFSET} from '@/lib/motion/config';
import {startSmoothScroll, stopSmoothScroll, getSmoothScroll, haltSmoothScroll} from '@/lib/motion/scroll';

/**
 * Weighted wheel scrolling (Lenis), as measured on the reference. Disabled for reduced motion.
 * Keyboard, touch, scrollbar dragging, browser back/forward and the skip link stay native.
 */
export default function SmoothScroll() {
  const path = usePathname();

  useEffect(() => {
    const motion = matchMedia(QUERIES.motion);
    const apply = () => (motion.matches ? startSmoothScroll() : stopSmoothScroll());
    apply();
    motion.addEventListener('change', apply);

    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      const lenis = getSmoothScroll();
      if (!link || !lenis || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname !== location.pathname || !url.hash) {
        // Leaving the page: never let old wheel momentum fight Next's scroll reset.
        haltSmoothScroll();
        return;
      }
      if (link.classList.contains('skip-link')) return;
      const id = decodeURIComponent(url.hash.slice(1));
      const target = id === 'top' ? null : document.getElementById(id);
      if (id !== 'top' && !target) return;
      event.preventDefault();
      lenis.scrollTo(target ?? 0, {
        offset: target ? ANCHOR_OFFSET : 0,
        duration: 1.3,
        onComplete: () => {
          history.pushState(null, '', url.hash);
          // Match a native jump: the next Tab continues from the target.
          if (target) {
            if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
            target.focus({preventScroll: true});
          }
        },
      });
    }
    document.addEventListener('click', onClick);
    addEventListener('popstate', haltSmoothScroll);
    void document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => {
      motion.removeEventListener('change', apply);
      document.removeEventListener('click', onClick);
      removeEventListener('popstate', haltSmoothScroll);
      stopSmoothScroll();
    };
  }, []);

  useEffect(() => {
    getSmoothScroll()?.resize();
  }, [path]);

  return null;
}
