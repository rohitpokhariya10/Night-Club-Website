import Image from 'next/image';
import type {CSSProperties} from 'react';
import {RESTING, slats} from '@/lib/motion/lightShape';

/**
 * Server-rendered hero visuals (PINTEREST-HERO-REFERENCE.md): the fluted-glass light field and
 * the logo orb with its floating labels. The resting composition is computed here, so the hero
 * is complete without JavaScript; HomeMotion animates the same model on the client.
 */
const SLATS = 11;
// Resting values for each layout: 11 slats on desktop, 8 on tablet, 6 on phones.
const large = slats(11, RESTING, 1.6);
const medium = slats(8, RESTING, 0.75);
const small = slats(6, RESTING, 0.46);

function slatStyle(i: number) {
  const vars: Record<string, string> = {};
  for (const [suffix, list] of [['l', large], ['m', medium], ['s', small]] as const) {
    const v = list[i];
    if (!v) continue;
    vars[`--y${suffix}`] = v.y.toFixed(4);
    vars[`--k${suffix}`] = `${v.skew.toFixed(2)}deg`;
    vars[`--t${suffix}`] = v.thick.toFixed(3);
    vars[`--o${suffix}`] = v.light.toFixed(3);
  }
  return vars as CSSProperties;
}

export function LightField() {
  return <div className="lf">
    {Array.from({length: SLATS}, (_, i) => <span className="lf-slat" key={i}><span className="lf-band" style={slatStyle(i)} /></span>)}
    <span className="lf-haze" />
  </div>;
}

/** Existing Jimmy O's experience labels (from the homepage strip), placed like the reference's floating labels. */
const CHIPS: {label: string; x: number; y: number}[] = [
  {label: 'DJ experiences', x: 25, y: 71},
  {label: 'Karaoke nights', x: 13, y: 88},
  {label: 'Catch the game', x: 75, y: 73},
  {label: 'Drinks & good company', x: 85, y: 89},
];
const DOTS = [[8, 64], [18, 79], [31, 93], [37, 66], [44, 90], [58, 94], [63, 68], [69, 86], [79, 63], [91, 76], [96, 92], [5, 95], [52, 70], [88, 54]];

export function HeroOrbit() {
  return <div className="cinema-orbit" aria-hidden="true">
    <svg className="hero-lines" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
      <path data-upper d="M25 74 V79 H43" /><path d="M13 85 V82 H30 L42 82" /><path data-upper d="M75 76 V80 H57" /><path d="M85 86 V84 H63 L58 84" />
    </svg>
    <span className="hero-dots">{DOTS.map(([x, y], i) => <span className="hero-dot" key={i} style={{'--cx': `${x}%`, '--cy': `${y}%`, '--d': `${(i % 5) * 0.7}s`} as CSSProperties} />)}</span>
    {CHIPS.map(chip => <span className="hero-chip" data-upper={chip.y < 80 || undefined} key={chip.label} style={{'--cx': `${chip.x}%`, '--cy': `${chip.y}%`} as CSSProperties}><span>{chip.label}</span></span>)}
    <span className="hero-orb">
      <span className="hero-orb-ring" />
      <Image className="hero-orb-logo" src="/images/logo.png" alt="" width={150} height={72} priority />
    </span>
  </div>;
}
