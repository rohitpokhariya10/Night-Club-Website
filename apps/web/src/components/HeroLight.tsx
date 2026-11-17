import type {CSSProperties} from 'react';
/**
 * The ceiling rig (HERO-NIGHTCLUB-REBUILD-REPORT.md): coloured volumetric beams falling into the room. Each beam is two
 * layers: the rig (.hero-beam, swung by scroll) and the light itself (i, swaying slowly on its own), so the two
 * motions never compete. x = rig position (% of width), r = resting angle, a = the fixture's beam angle (degrees: the
 * cone widens with distance, so each beam has its own spread), w = fallback width (vw) for browsers without the
 * container-unit/trigonometry CSS, tone = colour. A tight centre key light, two medium spots, two broad washes.
 */
const BEAMS: {x: number; r: number; a: number; w: number; tone: 'violet' | 'magenta' | 'blue' | 'red' | 'cyan'}[] = [
  {x: 14, r: -16, a: 14, w: 15, tone: 'violet'},
  {x: 31, r: -7, a: 10, w: 12, tone: 'magenta'},
  {x: 47, r: 4, a: 7, w: 10, tone: 'blue'},
  {x: 63, r: -5, a: 10.5, w: 12, tone: 'red'},
  {x: 84, r: 15, a: 15, w: 16, tone: 'cyan'},
];
const DOTS = [[8, 34], [18, 22], [27, 46], [37, 30], [44, 16], [58, 24], [63, 42], [71, 18], [79, 36], [91, 26], [96, 44], [52, 52], [33, 58], [88, 56]];

/** Server-rendered room: soft crowd backlight, overhead beams, scroll wash/sweep and the original crowd. */
export function HeroScene() {
  return <>
    <div className="hero-atmosphere" aria-hidden="true" />
    <div className="hero-beams" aria-hidden="true">
      {BEAMS.map((b, i) => <span className="hero-beam" data-tone={b.tone} key={i} style={{'--bx': `${b.x}%`, '--br': `${b.r}deg`, '--ba': `${b.a}deg`, '--bw': `${b.w}vw`} as CSSProperties}><i /></span>)}
    </div>
    <span className="hero-wash" aria-hidden="true" />
    <span className="hero-sweep" aria-hidden="true" />
    <div className="hero-crowd" aria-hidden="true"><canvas data-depth="back" /><canvas data-depth="near" /></div>
  </>;
}

export function HeroOrbit() {
  return <div className="cinema-orbit" aria-hidden="true">
    <span className="hero-dots">{DOTS.map(([x, y], i) => <span className="hero-dot" key={i} style={{'--cx': `${x}%`, '--cy': `${y}%`, '--d': `${(i % 5) * 0.7}s`} as CSSProperties} />)}</span>
  </div>;
}
