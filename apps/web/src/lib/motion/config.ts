/**
 * Shared motion settings. Values marked "measured" come from the Delta Cafés inspection
 * recorded in DELTA-MOTION-REFERENCE.md. Everything else is tuned for Jimmy O's.
 */
export const QUERIES = {
  motion: '(prefers-reduced-motion: no-preference)',
  /** Richest choreography, including the pinned hero handoff. */
  desktop: '(min-width: 1025px)',
  /** Same scenes with shorter travel. */
  tablet: '(min-width: 701px) and (max-width: 1024px)',
  /** Native scrolling, no pinning, lightweight transforms only. */
  mobile: '(max-width: 700px)',
} as const;

/** Measured: Lenis on the reference settles a wheel step in about 450–500 ms (lerp ≈ 0.1). */
export const SMOOTH_SCROLL = {
  lerp: 0.1,
  // Wheel distance stays equal to native scrolling, so the site never feels slow or fast.
  wheelMultiplier: 1,
  smoothWheel: true,
  // Touch keeps native momentum, as on the reference's mobile pass.
  syncTouch: false,
} as const;

export const EASE = {
  /** Masked line reveals and settles: fast start, long tail. */
  reveal: 'expo.out',
  entrance: 'power3.out',
  /** Scroll-linked progress maps 1:1 to scroll, as measured on the reference. */
  scrub: 'none',
} as const;

/** Extra anchor offset. Lenis already honours the page's scroll-padding-top (the fixed header), like a native jump. */
export const ANCHOR_OFFSET = 0;

/**
 * Measured on the Food & Drinks reference (FOOD-REFERENCE-MOTION.md), fitted to the per-frame samples:
 * the carousel's settle (0.62 s with about 6% overshoot) and the signature showcase's turn (about 1.1 s,
 * slow start, fastest just before the midpoint, long settle). Used with gsap/CustomEase.
 */
export const MEASURED_EASE = {
  carousel: {path: 'M0,0 C0.25,1.2 0.2,1.1 1,1', duration: 0.62},
  turn: {path: 'M0,0 C0.7,0 0.05,1 1,1', duration: 1.1},
} as const;

