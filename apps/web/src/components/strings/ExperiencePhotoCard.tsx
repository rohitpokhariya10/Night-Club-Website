import type {CSSProperties} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {Arrow} from '../ui';
import {cardAnchor, instrumentLayouts, layoutKeys, type ExperienceMoment} from '@/lib/experience';

const SHORT = {desktop: 'd', tablet: 't', mobile: 'm'} as const;

/** Per-layout placement as CSS variables (globals.css picks the active set), so the layout is complete without JS. */
function placement(index: number) {
  const style: Record<string, string | number> = {};
  for (const key of layoutKeys) {
    const layout = instrumentLayouts[key];
    const at = layout.cards[index];
    const k = SHORT[key];
    if (!at) {style[`--on-${k}`] = 'none'; continue;}
    const {x, y} = cardAnchor(layout, at);
    Object.assign(style, {[`--x-${k}`]: x, [`--y-${k}`]: y, [`--w-${k}`]: at.w, [`--l-${k}`]: at.drop, [`--r-${k}`]: at.r, [`--s-${k}`]: at.string});
  }
  return style as CSSProperties;
}

/**
 * A photograph clipped onto a string: the clip (bead) sits on the string, a short thread lowers the print, and the
 * print hangs at a slight angle. Layers, each with one owner: .ns-card (CSS position; entrance) > .ns-swing (string
 * physics: follow and sway) > .ns-tilt (resting angle; straightens on hover) > .ns-plate (the print).
 * The print remains a link. Its separate mount button slides the attachment; the print itself swings.
 */
export default function ExperiencePhotoCard({moment, index}: {moment: ExperienceMoment; index: number}) {
  return (
    <div className="ns-card" data-index={index} style={placement(index)}>
      <div className="ns-swing">
        <span className="ns-bead" aria-hidden="true"/>
        <button type="button" className="ns-mount" aria-label={`Slide ${moment.kicker} photograph`} aria-describedby="ns-photo-help" aria-keyshortcuts="ArrowLeft ArrowRight Home End">
          <span aria-hidden="true">↔</span>
        </button>
        <div className="ns-tilt">
          <span className="ns-thread" aria-hidden="true"/>
          <figure className="ns-plate">
            <div className="ns-photo" style={{aspectRatio: moment.ratio}}>
              <Image src={moment.src} alt={moment.alt} fill sizes="(max-width: 700px) 65vw, (max-width: 1024px) 30vw, 400px" quality={65} draggable={false} style={{objectPosition: moment.focus}}/>
              <span className="ns-sheen" aria-hidden="true"/>
            </div>
            <figcaption className="ns-caption">
              <Link className="ns-link" href={moment.href} draggable={false} aria-describedby="ns-photo-help">
                <span className="ns-kicker"><span className="ns-num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{moment.kicker}<span className="sr-only">:</span></span>
                <span className="ns-name">{moment.title} <Arrow dir="up-right" size={14}/></span>
              </Link>
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}
