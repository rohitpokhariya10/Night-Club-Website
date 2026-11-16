import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {EASE} from './config';
import {revealOnFocus, type RevealRegistry} from './primitives';

/**
 * The footer's subtle reveal: once, as it comes into view, the logo and tagline settle, the address, phone
 * and email follow in a gentle stagger, and the legal row fades in. No scrubbing, pinning or large movement.
 * Everything is visible without JavaScript and with reduced motion (this never runs there), and keyboard
 * focus finishes the reveal at once. Call inside a gsap.matchMedia/context; returns a cleanup for listeners.
 */
export function footerScene(footer: HTMLElement) {
  gsap.registerPlugin(ScrollTrigger);
  const q = (selector: string) => footer.querySelector<HTMLElement>(selector);
  const qa = (selector: string) => Array.from(footer.querySelectorAll<HTMLElement>(selector));
  const reveal = gsap.timeline({
    defaults: {ease: EASE.entrance, duration: 0.9},
    // Plays once without `once: true` (a passed once-trigger kills itself mid-refresh, which can crash GSAP).
    scrollTrigger: {id: 'footer-reveal', trigger: footer, start: 'top 92%', toggleActions: 'play none none none'},
  })
    .from([q('.ft-logo'), q('.ft-tagline')], {opacity: 0, y: 14, stagger: 0.1, clearProps: 'opacity,transform'}, 0)
    .from(qa('.ft-item'), {opacity: 0, y: 14, stagger: 0.08, clearProps: 'opacity,transform'}, 0.18)
    .from(q('.ft-legal'), {opacity: 0, duration: 0.8, clearProps: 'opacity'}, 0.42);
  const registry: RevealRegistry = new Map([[footer, [reveal]]]);
  const releaseFocus = revealOnFocus(footer, registry);
  footer.dataset.motion = 'ready';
  return () => {releaseFocus(); delete footer.dataset.motion;};
}
