'use client';

import {useRef} from 'react';
import {Volume2, VolumeX} from 'lucide-react';
import InteractiveStrings from './InteractiveStrings';
import ExperiencePhotoCard from './ExperiencePhotoCard';
import {experienceMoments, instrumentLayouts, layoutKeys, stringVoices} from '@/lib/experience';
import {usePluckAudio} from '@/hooks/usePluckAudio';
import {useStringInstrument} from '@/hooks/useStringInstrument';

const FREQUENCIES = stringVoices.map(voice => voice.frequency);
const ORDINAL = ['first', 'second', 'third', 'fourth'];
/** One headline word inside its reveal mask (the heading text stays intact for SEO and screen readers). */
const Word = ({children}: {children: string}) => <span className="nw"><span>{children}</span></span>;

/**
 * "Every night has a rhythm" (#experience): the first panel after the hero. Four champagne strings cross a dark room
 * with Jimmy O's photographs clipped onto them; every string can be pulled, plucked, strummed or played from the
 * keyboard, and answers with light, movement and (only if the visitor turns it on) a soft plucked note.
 * Server-rendered and complete without JavaScript: strings at rest, cards in place, every link working.
 * See EXPERIENCE-STRINGS-REPORT.md.
 */
export default function ExperienceStringsSection() {
  const root = useRef<HTMLElement>(null);
  const sound = usePluckAudio(FREQUENCIES);
  const instrument = useStringInstrument(root, sound.play);
  const SoundIcon = sound.enabled ? Volume2 : VolumeX;

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
        </div>
        <div className="ns-aside">
          <p className="ns-lede">Discover the moments that make Jimmy O’s unforgettable.</p>
          <div className="ns-controls">
            <button type="button" className="ns-sound" aria-pressed={sound.enabled} disabled={!sound.supported} onClick={() => void sound.toggle()}>
              <SoundIcon size={17} aria-hidden="true"/>
              <span>{!sound.supported ? 'Sound unavailable' : sound.enabled ? 'Sound on' : 'Enable sound'}</span>
            </button>
            <div className="ns-pegs" role="group" aria-label="Play the strings">
              {stringVoices.map((voice, i) => (
                <button key={voice.name} type="button" className="ns-peg" aria-label={`Pluck the ${ORDINAL[i]} string (${voice.name})`} onClick={() => instrument.current?.pluck(i)}>
                  {voice.note}
                </button>
              ))}
            </div>
          </div>
          <p className="ns-hint">
            <svg className="ns-hint-wave" viewBox="0 0 28 10" aria-hidden="true" focusable="false"><path d="M1 5c3.5-5 5.5-5 9 0s5.5 5 9 0 5.5-5 8 0"/></svg>
            Explore the moments. Pluck the strings.
          </p>
        </div>
      </div>
      <p id="ns-photo-help" className="ns-photo-help">Drag a photo to swing. Drag its ↔ mount to slide. <span>Use ← / → on a focused photo or mount to reposition; Enter on the photo opens it.</span></p>
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
