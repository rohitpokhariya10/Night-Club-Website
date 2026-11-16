import Lenis from 'lenis';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {SMOOTH_SCROLL} from './config';

/**
 * One Lenis instance for the whole app, driven by GSAP's ticker so ScrollTrigger
 * reads exactly the scroll position Lenis renders. Native scrolling (keyboard,
 * touch, scrollbar, programmatic scrollTo) still works and is picked up by Lenis.
 */
let lenis: Lenis | null = null;
const tick = (time: number) => lenis?.raf(time * 1000);

export function startSmoothScroll() {
  if (lenis) return lenis;
  gsap.registerPlugin(ScrollTrigger);
  lenis = new Lenis({
    ...SMOOTH_SCROLL,
    // Dialogs (navigation menu, photo viewer) keep native scrolling and never move the page behind them.
    prevent: node => Boolean(node.closest?.('dialog, [data-lenis-prevent]')),
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function stopSmoothScroll() {
  if (!lenis) return;
  gsap.ticker.remove(tick);
  lenis.destroy();
  lenis = null;
  gsap.ticker.lagSmoothing(500, 33);
}

export const getSmoothScroll = () => lenis;

/** Drops in-flight wheel momentum so a navigation or focus jump is never overridden by an old target. */
export function haltSmoothScroll() {
  if (!lenis) return;
  lenis.stop();
  lenis.start();
}
