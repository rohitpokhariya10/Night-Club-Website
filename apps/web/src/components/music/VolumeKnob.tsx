'use client';

import {useRef, type KeyboardEvent, type PointerEvent} from 'react';
import {Volume2, VolumeX} from 'lucide-react';
import {useMusic, musicPlayer} from '@/hooks/useMusic';

/** The knob sweeps 270°, from 7:30 (silent) to 4:30 (full), like real equipment. */
const SWEEP = 270;
const STEP = 0.05;

/**
 * Rotary volume control bound to the player's real master gain. Drag up/right to raise, down/left to lower (one
 * full turn of travel is about 220 px), or use the keyboard: arrows ±5 %, Page Up/Down ±10 %, Home silent, End full.
 * It never jumps: every change is a step from where it is. The separate button mutes and unmutes.
 */
export default function VolumeKnob({size = 'console'}: {size?: 'console' | 'dock'}) {
  const volume = useMusic(s => s.volume);
  const muted = useMusic(s => s.muted);
  const drag = useRef<{x: number; y: number; start: number} | null>(null);
  const percent = Math.round(volume * 100);
  const turn = -SWEEP / 2 + SWEEP * volume;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({preventScroll: true});
    drag.current = {x: event.clientX, y: event.clientY, start: musicPlayer().getSnapshot().volume};
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const delta = ((event.clientX - drag.current.x) - (event.clientY - drag.current.y)) / 220;
    musicPlayer().setVolume(drag.current.start + delta);
  };
  const end = () => {drag.current = null;};
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const player = musicPlayer(), v = player.getSnapshot().volume;
    const next = ({ArrowUp: v + STEP, ArrowRight: v + STEP, ArrowDown: v - STEP, ArrowLeft: v - STEP, PageUp: v + 0.1, PageDown: v - 0.1, Home: 0, End: 1} as Record<string, number>)[event.key];
    if (next === undefined) return;
    event.preventDefault();
    player.setVolume(Math.round(next * 100) / 100);
  };

  return (
    <div className={`dj-knob-wrap dj-knob-${size}`} data-muted={muted || undefined}>
      <div
        className="dj-knob" role="slider" tabIndex={0} aria-label="Volume" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
        aria-valuetext={muted ? `${percent}%, muted` : `${percent}%`} aria-orientation="vertical"
        style={{'--turn': `${turn}deg`, '--level': volume} as React.CSSProperties}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onKeyDown={onKeyDown}
      >
        <svg className="dj-knob-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path className="dj-knob-track" d="M 21.7 78.3 A 40 40 0 1 1 78.3 78.3" pathLength={100}/>
          <path className="dj-knob-level" d="M 21.7 78.3 A 40 40 0 1 1 78.3 78.3" pathLength={100} style={{strokeDasharray: `${muted ? 0 : percent} 100`}}/>
        </svg>
        <span className="dj-knob-cap" aria-hidden="true"><i/></span>
      </div>
      <button type="button" className="dj-mute" aria-pressed={muted} aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => musicPlayer().toggleMute()}>
        {muted ? <VolumeX size={15} aria-hidden="true"/> : <Volume2 size={15} aria-hidden="true"/>}
      </button>
    </div>
  );
}
