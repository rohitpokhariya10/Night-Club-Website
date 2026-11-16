import {curvePoint, round, type Curve} from './strings/geometry';

/**
 * "Every night has a rhythm" — the homepage's playable strings section (EXPERIENCE-STRINGS-REPORT.md).
 *
 * Moments: approved Jimmy O's photographs only (ASSETS.md), each linked to the existing page it represents.
 * Labels restate verified site content (CONTENT-SOURCES.md); nothing here announces an event, price or offer.
 * Karaoke and game-day photographs were not supplied, so those experiences have no card (see the report).
 */
export type ExperienceMoment = {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Small label above the title: the destination's name. */
  kicker: string;
  title: string;
  href: string;
  /** Frame proportions (CSS aspect-ratio) and crop focus (object-position). */
  ratio: string;
  focus: string;
};

export const experienceMoments: ExperienceMoment[] = [
  {id: 'dance-floor', src: '/images/gallery-1.jpg', width: 800, height: 800, alt: 'A packed dance floor under the disco ball at Jimmy O’s', kicker: 'Nightlife', title: 'DJs & weekend dancing', href: '/nightlife', ratio: '1 / 1', focus: '50% 45%'},
  {id: 'the-bar', src: '/images/hero.jpg', width: 1280, height: 720, alt: 'A cocktail being poured at the Jimmy O’s bar', kicker: 'Drinks', title: 'Pitchers, pints & pours', href: '/drink-menu', ratio: '16 / 10', focus: '50% 50%'},
  {id: 'kitchen', src: '/images/burger.jpg', width: 800, height: 800, alt: 'Jimmy O’s Classic Burger with seasoned fries', kicker: 'Food', title: 'Burgers, tacos & flatbreads', href: '/food-menu', ratio: '4 / 5', focus: '42% 50%'},
  {id: 'specials', src: '/images/gallery-2.jpg', width: 800, height: 800, alt: 'Friends celebrating under red lights at Jimmy O’s', kicker: 'Specials', title: 'Good timing. Great nights.', href: '/specials', ratio: '4 / 5', focus: '50% 40%'},
  {id: 'lounge', src: '/images/venue.jpg', width: 1200, height: 675, alt: 'Teal booths in the Jimmy O’s lounge', kicker: 'Reservations', title: 'Request a table', href: '/reservations', ratio: '3 / 2', focus: '50% 55%'},
  {id: 'the-crowd', src: '/images/gallery-6.jpg', width: 800, height: 800, alt: 'Friends at the bar on a lively night at Jimmy O’s', kicker: 'Events', title: 'What’s coming up', href: '/events', ratio: '1 / 1', focus: '50% 40%'},
  {id: 'celebrations', src: '/images/gallery-4.jpg', width: 800, height: 800, alt: 'A late-night celebration under the neon sign at Jimmy O’s', kicker: 'Private parties', title: 'Big moments. Your people.', href: '/private-parties', ratio: '4 / 5', focus: '55% 35%'},
];

/**
 * The four strings, top to bottom, highest note first: B3, F♯3, D3, A2 (a D6/9 voicing, so any combination of
 * strings sounds consonant). `swing` is the visual fundamental in Hz: lower strings swing more slowly.
 */
export const stringVoices = [
  {note: 'B', name: 'B3', frequency: 246.94, swing: 3.9},
  {note: 'F♯', name: 'F♯3', frequency: 185.0, swing: 3.4},
  {note: 'D', name: 'D3', frequency: 146.83, swing: 3.0},
  {note: 'A', name: 'A2', frequency: 110.0, swing: 2.6},
] as const;

export type LayoutKey = 'desktop' | 'tablet' | 'mobile';
export const layoutKeys: LayoutKey[] = ['desktop', 'tablet', 'mobile'];
/**
 * Must match the CSS breakpoints in globals.css (.night-strings: phones by default, min-width 701px and 1025px).
 * The upper bounds reach to the next breakpoint so a fractional (zoomed) width always has exactly one layout.
 */
export const layoutQueries: Record<LayoutKey, string> = {
  desktop: '(min-width: 1025px)',
  tablet: '(min-width: 701px) and (max-width: 1024.98px)',
  mobile: '(max-width: 700.98px)',
};

/** Where a card hangs: on string `string` where it passes `x`, `w` units wide, `drop` units below, tilted `r`°. */
export type CardPlacement = {string: number; x: number; w: number; drop: number; r: number};
export type InstrumentLayout = {
  w: number;
  h: number;
  strings: Curve[];
  /** One entry per moment; null hides that card at this size. */
  cards: (CardPlacement | null)[];
  /** How far a hand can pull a string (units). */
  maxPull: number;
};

export const instrumentLayouts: Record<LayoutKey, InstrumentLayout> = {
  // A central landscape print, staggered portraits, then two balanced pairs across the full room.
  desktop: {
    w: 1440, h: 1300, maxPull: 92,
    strings: [
      [[-30, 36], [380, 108], [1040, -24], [1470, 64]],
      [[-30, 440], [460, 392], [980, 498], [1470, 430]],
      [[-30, 850], [420, 910], [1060, 810], [1470, 870]],
      [[-30, 1190], [560, 1240], [1080, 1150], [1470, 1200]],
    ],
    cards: [
      {string: 0, x: 244, w: 250, drop: 28, r: -1.8},
      {string: 0, x: 720, w: 340, drop: 22, r: 1.2},
      {string: 0, x: 1210, w: 224, drop: 32, r: -1.4},
      {string: 1, x: 440, w: 232, drop: 26, r: 1.6},
      {string: 1, x: 1020, w: 310, drop: 24, r: -1.2},
      {string: 2, x: 300, w: 244, drop: 24, r: 1.4},
      {string: 2, x: 984, w: 224, drop: 28, r: -1.6},
    ],
  },
  tablet: {
    w: 1024, h: 1300, maxPull: 80,
    strings: [
      [[-24, 38], [300, 100], [720, 0], [1048, 52]],
      [[-24, 435], [340, 400], [700, 480], [1048, 440]],
      [[-24, 845], [300, 900], [740, 800], [1048, 865]],
      [[-24, 1190], [400, 1240], [720, 1150], [1048, 1200]],
    ],
    cards: [
      {string: 0, x: 165, w: 220, drop: 28, r: -1.6},
      {string: 0, x: 510, w: 292, drop: 22, r: 1.2},
      {string: 0, x: 858, w: 210, drop: 30, r: -1.4},
      {string: 1, x: 280, w: 230, drop: 26, r: 1.6},
      {string: 1, x: 760, w: 296, drop: 24, r: -1.2},
      {string: 2, x: 214, w: 234, drop: 24, r: 1.4},
      {string: 2, x: 725, w: 222, drop: 28, r: -1.6},
    ],
  },
  // A single lead photograph at phone scale, then paired supporting moments in reading order.
  mobile: {
    w: 390, h: 1430, maxPull: 46,
    strings: [
      [[-12, 36], [120, 74], [270, 10], [402, 44]],
      [[-12, 390], [130, 365], [260, 415], [402, 388]],
      [[-12, 730], [140, 766], [250, 704], [402, 738]],
      [[-12, 1080], [130, 1110], [270, 1060], [402, 1090]],
    ],
    cards: [
      {string: 0, x: 195, w: 236, drop: 24, r: -1.2},
      {string: 1, x: 99, w: 152, drop: 24, r: 1},
      {string: 1, x: 290, w: 148, drop: 26, r: -1},
      {string: 2, x: 99, w: 150, drop: 24, r: 1},
      {string: 2, x: 290, w: 156, drop: 26, r: -1},
      {string: 3, x: 99, w: 152, drop: 24, r: 1},
      {string: 3, x: 290, w: 150, drop: 26, r: -1},
    ],
  },
};

/**
 * The curve parameter (0–1) where a card hangs: where its string passes the card's x. Every string runs left to
 * right, so x grows with t and a bisection finds it. Deterministic, so server and client agree.
 */
export function cardParam(layout: InstrumentLayout, placement: CardPlacement) {
  const curve = layout.strings[placement.string];
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (curvePoint(curve, mid)[0] < placement.x) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** A card's anchor on its string, as percentages of the instrument (server-rendered CSS variables). */
export function cardAnchor(layout: InstrumentLayout, placement: CardPlacement) {
  const [x, y] = curvePoint(layout.strings[placement.string], cardParam(layout, placement));
  return {x: round((x / layout.w) * 100, 3), y: round((y / layout.h) * 100, 3)};
}
