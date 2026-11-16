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
  // Three prints on the top string, two on each of the next, the low A string left open.
  desktop: {
    w: 1440, h: 1020, maxPull: 92,
    strings: [
      [[-30, 64], [380, 176], [1040, -44], [1470, 96]],
      [[-30, 356], [460, 262], [980, 500], [1470, 336]],
      [[-30, 610], [420, 736], [1060, 520], [1470, 720]],
      [[-30, 870], [560, 970], [1080, 830], [1470, 900]],
    ],
    cards: [
      {string: 0, x: 184, w: 226, drop: 36, r: -2.2},
      {string: 0, x: 761, w: 296, drop: 28, r: 1.4},
      {string: 0, x: 1299, w: 192, drop: 44, r: -1.6},
      {string: 1, x: 478, w: 208, drop: 34, r: 2},
      {string: 1, x: 1007, w: 252, drop: 30, r: -1.2},
      {string: 2, x: 191, w: 218, drop: 30, r: 1.8},
      {string: 2, x: 719, w: 198, drop: 40, r: -2.4},
    ],
  },
  // The same score on a narrower stage: larger prints, taller rows.
  tablet: {
    w: 1024, h: 1430, maxPull: 80,
    strings: [
      [[-24, 70], [300, 150], [720, 0], [1048, 90]],
      [[-24, 500], [340, 460], [700, 590], [1048, 500]],
      [[-24, 950], [300, 1020], [740, 900], [1048, 970]],
      [[-24, 1360], [400, 1420], [720, 1320], [1048, 1380]],
    ],
    cards: [
      {string: 0, x: 156, w: 210, drop: 34, r: -2},
      {string: 0, x: 506, w: 284, drop: 28, r: 1.4},
      {string: 0, x: 852, w: 200, drop: 42, r: -1.6},
      {string: 1, x: 330, w: 222, drop: 34, r: 2},
      {string: 1, x: 762, w: 270, drop: 30, r: -1.2},
      {string: 2, x: 172, w: 220, drop: 30, r: 1.8},
      {string: 2, x: 604, w: 210, drop: 38, r: -2.2},
    ],
  },
  // Phones: two prints per string, the last one alone at the centre of the low string.
  mobile: {
    w: 390, h: 1390, maxPull: 46,
    strings: [
      [[-12, 64], [120, 116], [270, 16], [402, 70]],
      [[-12, 390], [130, 340], [260, 440], [402, 380]],
      [[-12, 740], [140, 800], [250, 700], [402, 750]],
      [[-12, 1060], [130, 1110], [270, 1030], [402, 1080]],
    ],
    cards: [
      {string: 0, x: 104, w: 152, drop: 24, r: -2},
      {string: 0, x: 286, w: 154, drop: 30, r: 1.6},
      {string: 1, x: 104, w: 152, drop: 28, r: 1.8},
      {string: 1, x: 286, w: 152, drop: 26, r: -1.8},
      {string: 2, x: 104, w: 154, drop: 26, r: -1.4},
      {string: 2, x: 286, w: 152, drop: 30, r: 2},
      {string: 3, x: 195, w: 160, drop: 26, r: -1.6},
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
