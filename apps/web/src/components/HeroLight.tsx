import type {CSSProperties} from 'react';
/**
 * The ceiling rig (HERO-NIGHTCLUB-REBUILD-REPORT.md): warm volumetric beams falling into the room. Each beam is two
 * layers: the rig (.hero-beam, swung by scroll) and the light itself (i, swaying slowly on its own), so the two
 * motions never compete. x = rig position (% of width), r = resting angle, w = beam width (vw), tone = colour.
 */
const BEAMS: {x: number; r: number; w: number; tone: 'spot' | 'amber' | 'ember' | 'steel'}[] = [
  {x: 14, r: -16, w: 15, tone: 'steel'},
  {x: 31, r: -7, w: 12, tone: 'amber'},
  {x: 47, r: 4, w: 10, tone: 'spot'},
  {x: 63, r: -5, w: 12, tone: 'ember'},
  {x: 84, r: 15, w: 16, tone: 'amber'},
];
const DOTS = [[8, 34], [18, 22], [27, 46], [37, 30], [44, 16], [58, 24], [63, 42], [71, 18], [79, 36], [91, 26], [96, 44], [52, 52], [33, 58], [88, 56]];

/** Server-rendered room: soft crowd backlight, overhead beams, scroll wash/sweep and the original crowd. */
export function HeroScene() {
  return <>
    <div className="hero-atmosphere" aria-hidden="true" />
    <div className="hero-beams" aria-hidden="true">
      {BEAMS.map((b, i) => <span className="hero-beam" data-tone={b.tone} key={i} style={{'--bx': `${b.x}%`, '--br': `${b.r}deg`, '--bw': `${b.w}vw`} as CSSProperties}><i /></span>)}
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
