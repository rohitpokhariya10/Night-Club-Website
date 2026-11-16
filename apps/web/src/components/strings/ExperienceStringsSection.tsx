'use client';

import {useRef} from 'react';
import InteractiveStrings from './InteractiveStrings';
import ExperiencePhotoCard from './ExperiencePhotoCard';
import DjConsole from '../music/DjConsole';
import {experienceMoments, instrumentLayouts, layoutKeys, stringVoices} from '@/lib/experience';
import {usePluckAudio} from '@/hooks/usePluckAudio';
import {useStringInstrument} from '@/hooks/useStringInstrument';

const FREQUENCIES = stringVoices.map(voice => voice.frequency);
/** One headline word inside its reveal mask (the heading text stays intact for SEO and screen readers). */
const Word = ({children}: {children: string}) => <span className="nw"><span>{children}</span></span>;

/**
 * "Every night has a rhythm" (#experience): the first panel after the hero. The heading sits beside Jimmy O's DJ
 * console (the site's music player, DJ-CONSOLE-REPORT.md); below, four champagne strings cross a dark room with Jimmy
 * O's photographs clipped onto them. Strings can be pulled, plucked and strummed, and answer with light and movement,
 * and with a plucked note while the visitor's music is paused (see usePluckAudio).
 * Server-rendered and complete without JavaScript: strings at rest, cards in place, every link working.
 * See EXPERIENCE-STRINGS-REPORT.md.
 */
export default function ExperienceStringsSection() {
  const root = useRef<HTMLElement>(null);
  const sound = usePluckAudio(FREQUENCIES);
  useStringInstrument(root, sound.play);

  return (
    <section id="experience" ref={root} className="night-strings" aria-labelledby="ns-title">
      <div className="ns-atmos" aria-hidden="true"><span className="ns-atmos-a"/><span className="ns-atmos-b"/><span className="ns-atmos-c"/></div>
      <div className="ns-head">
        <div>
          <p className="ns-eyebrow"><span className="ns-eyebrow-line" aria-hidden="true"/>Discover the experience</p>
          <h2 id="ns-title" className="ns-title">
            <span className="ns-line"><Word>Every</Word> <Word>night</Word></span>{' '}
            <span className="ns-line ns-line-offset"><Word>has</Word> <Word>a</Word> <em><Word>rhythm.</Word></em></span>
          </h2>
          {/* Full gesture and keyboard guidance for the photographs, read with each photo and mount (aria-describedby). */}
          <p id="ns-photo-help" className="sr-only">Drag a photo to swing. Drag its ↔ mount to slide. <span>Use ← / → on a focused photo or mount to reposition; Enter on the photo opens it.</span></p>
        </div>
        <div className="ns-aside">
          <DjConsole/>
        </div>
      </div>
      <p className="sr-only ns-status" role="status" aria-live="polite" aria-atomic="true"/>
      <div className="ns-stage">
        <div className="ns-instrument">
          {layoutKeys.map(key => <InteractiveStrings key={key} layoutKey={key} layout={instrumentLayouts[key]}/>)}
          <span className="ns-response" aria-hidden="true"/><span className="ns-response" aria-hidden="true"/><span className="ns-response" aria-hidden="true"/>
          {experienceMoments.map((moment, i) => <ExperiencePhotoCard key={moment.id} moment={moment} index={i}/>)}
        </div>
      </div>
    </section>
  );
}
