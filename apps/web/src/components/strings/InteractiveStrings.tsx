import {restPath} from '@/lib/strings/geometry';
import {stringVoices, type InstrumentLayout, type LayoutKey} from '@/lib/experience';

/**
 * One layout's strings as SVG, server-rendered at rest (the physics only takes over while a string moves).
 * Each string is a stack of strokes sharing one path: a wide soft air glow, a halo, the thin core, a highlight
 * whose gradient follows the pointer, two pulse dashes (pluck → each end) and an invisible wide hit stroke.
 * Decorative for assistive technology: the same instrument is playable with the labelled buttons above it.
 */
export default function InteractiveStrings({layoutKey, layout}: {layoutKey: LayoutKey; layout: InstrumentLayout}) {
  return (
    <svg className="ns-svg" data-layout={layoutKey} viewBox={`0 0 ${layout.w} ${layout.h}`} aria-hidden="true" focusable="false">
      <defs>
        {layout.strings.map((_, i) => (
          <radialGradient key={i} id={`ns-hl-${layoutKey}-${i}`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r={Math.round(layout.w * 0.11)}>
            <stop offset="0" className="ns-hl-a"/>
            <stop offset="0.45" className="ns-hl-b"/>
            <stop offset="1" className="ns-hl-c"/>
          </radialGradient>
        ))}
      </defs>
      {layout.strings.map((curve, i) => {
        const d = restPath(curve);
        return (
          <g key={i} className="ns-string" data-string={i} data-swing={stringVoices[i].swing} data-gradient={`ns-hl-${layoutKey}-${i}`}>
            <path className="ns-air" d={d} pathLength={1}/>
            <path className="ns-halo" d={d} pathLength={1}/>
            <path className="ns-core" d={d} pathLength={1}/>
            <path className="ns-hl" d={d} stroke={`url(#ns-hl-${layoutKey}-${i})`}/>
            <path className="ns-pulse" data-dir="1" d={d} pathLength={1}/>
            <path className="ns-pulse" data-dir="-1" d={d} pathLength={1}/>
            <path className="ns-hit" data-string={i} d={d}/>
          </g>
        );
      })}
    </svg>
  );
}
