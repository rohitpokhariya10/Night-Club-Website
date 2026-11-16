'use client';

import {useLayoutEffect, useRef, type RefObject} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {QUERIES} from '@/lib/motion/config';
import {instrumentLayouts, layoutQueries, type LayoutKey} from '@/lib/experience';
import {createInstrument, type Instrument, type PluckEvent} from '@/lib/strings/instrument';
import {stringsScene} from '@/lib/strings/scene';

/**
 * Builds the playable instrument for the active layout (desktop, tablet or phone) and, where motion is allowed,
 * the section's scroll choreography. Everything is rebuilt when the layout or the reduced-motion preference
 * changes, and fully torn down on unmount (listeners, ticker, observers, tweens, ScrollTriggers).
 * Returns a ref to the live instrument, for the keyboard controls.
 */
export function useStringInstrument(root: RefObject<HTMLElement | null>, onPluck: (event: PluckEvent) => void) {
  const instrument = useRef<Instrument | null>(null);
  const pluck = useRef(onPluck);
  const positions = useRef(new Map<LayoutKey, Map<number, number>>());
  useLayoutEffect(() => {pluck.current = onPluck;}, [onPluck]);

  useLayoutEffect(() => {
    const section = root.current;
    const stage = section?.querySelector<HTMLElement>('.ns-instrument');
    if (!section || !stage) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add({motion: QUERIES.motion, ...layoutQueries}, context => {
      const conditions = context.conditions as Record<LayoutKey | 'motion', boolean>;
      const key: LayoutKey = conditions.desktop ? 'desktop' : conditions.tablet ? 'tablet' : 'mobile';
      const svg = stage.querySelector<SVGSVGElement>(`.ns-svg[data-layout="${key}"]`);
      if (!svg) return;
      const layout = instrumentLayouts[key];
      if (!positions.current.has(key)) positions.current.set(key, new Map());
      const live = createInstrument({positions: positions.current.get(key), root: stage, svg, layout, motion: conditions.motion, onPluck: event => pluck.current(event)});
      instrument.current = live;
      const releaseScene = conditions.motion ? stringsScene({section, svg, layout, instrument: live, mobile: key === 'mobile'}) : () => {};
      section.dataset.instrument = key;
      return () => {
        releaseScene();
        live.destroy();
        if (instrument.current === live) instrument.current = null;
        delete section.dataset.instrument;
      };
    });
    return () => media.revert();
  }, [root]);

  return instrument;
}
