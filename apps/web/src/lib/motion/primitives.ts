import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {SplitText} from 'gsap/SplitText';
import {EASE} from './config';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Reveals that played once and can be finished early (keyboard focus, fast jumps).
 * Scroll-scrubbed scenes never need this: their state is always derived from position.
 */
export type RevealRegistry = Map<Element, gsap.core.Animation[]>;

function register(registry: RevealRegistry | undefined, scope: Element, animation: gsap.core.Animation) {
  if (!registry) return;
  registry.set(scope, [...(registry.get(scope) || []), animation]);
}

/**
 * Masked line reveal. Each line rises out of a clip window; negative clip insets let script swashes
 * paint outside the line box, so the reveal never changes layout. When it finishes, the heading is
 * restored to its original markup (no split DOM is left behind). The real text is always in the
 * heading, so SEO and screen readers are unaffected. Call inside a gsap.context/matchMedia.
 */
export function lineReveal(heading: Element | null, {start = 'top 88%', delay = 0, registry}: {start?: string; delay?: number; registry?: RevealRegistry} = {}) {
  if (!heading) return;
  SplitText.create(heading, {
    type: 'lines',
    linesClass: 'mline',
    autoSplit: true,
    onSplit(self) {
      const tween = gsap.fromTo(self.lines,
        {yPercent: 105, clipPath: 'inset(-35% -15% 100% -15%)'},
        {
          yPercent: 0, clipPath: 'inset(-35% -15% -45% -15%)',
          duration: 1.05, delay, ease: EASE.reveal, stagger: 0.085,
          scrollTrigger: {trigger: heading, start, once: true},
          onComplete: () => {self.kill(); self.revert();},
        });
      register(registry, heading, tween);
      return tween;
    },
  });
}

/**
 * Editorial title block: script eyebrow, masked headline, then supporting copy.
 * Supporting elements only rise a short distance; the headline carries the moment.
 */
export function titleReveal(container: Element | null, {start = 'top 85%', registry}: {start?: string; registry?: RevealRegistry} = {}) {
  if (!container) return;
  const script = container.querySelector(':scope > .script, :scope > .eyebrow');
  const heading = container.querySelector(':scope > h2');
  const support = container.querySelectorAll(':scope > p:not(.script):not(.eyebrow), :scope > .button, :scope > .actions, :scope > address, :scope > .catering-callout');
  const timeline = gsap.timeline({scrollTrigger: {trigger: container, start, once: true}, defaults: {ease: EASE.entrance}});
  if (script) timeline.from(script, {y: 18, opacity: 0, duration: 0.7, clearProps: 'transform,opacity'}, 0);
  if (support.length) timeline.from(support, {y: 22, opacity: 0, duration: 0.8, stagger: 0.08, clearProps: 'transform,opacity'}, 0.3);
  register(registry, container, timeline);
  lineReveal(heading, {start, delay: 0.08, registry});
}

/** The movable media layer inside a <Photo>, so frame and image can move independently. */
export const mediaOf = (photo: Element | null) => photo?.querySelector<HTMLElement>(':scope > .photo-media') ?? null;

/** Finishes every pending reveal that contains a newly focused element. */
export function revealOnFocus(root: HTMLElement, registry: RevealRegistry) {
  function finish(event: FocusEvent) {
    const target = event.target as Element;
    registry.forEach((animations, scope) => {
      if (scope.contains(target) || target.contains(scope)) animations.forEach(animation => animation.progress(1));
    });
  }
  root.addEventListener('focusin', finish);
  return () => root.removeEventListener('focusin', finish);
}

/**
 * Runs below-the-fold scene setup when the main thread is idle (SplitText measurement and trigger
 * creation stay out of the page-load critical path). Returns a cancel function.
 */
export function whenIdle(task: () => void, timeout = 700) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(() => task(), {timeout});
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(task, 120);
  return () => clearTimeout(id);
}
