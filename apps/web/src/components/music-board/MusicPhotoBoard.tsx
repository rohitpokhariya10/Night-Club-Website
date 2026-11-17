'use client';

import {useEffect, useRef, useState, type CSSProperties} from 'react';
import Image from 'next/image';
import {ArrowUpRight, Music2, Pause, Play, RotateCcw, Volume2, VolumeX, X} from 'lucide-react';
import DjConsole from '../music/DjConsole';
import {musicPlayer, useMusic} from '@/hooks/useMusic';
import {PLAYLIST} from '@/lib/music/playlist';
import {moments} from './moments';
import {createPhotoBoard, type PhotoBoard} from './board-motion';
import './music-board.css';

export default function MusicPhotoBoard() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const controller = useRef<PhotoBoard | null>(null);
  const owner = useRef({});
  const [selected, setSelected] = useState<number | null>(null);
  const status = useMusic(s => s.status);
  const muted = useMusic(s => s.muted);
  const index = useMusic(s => s.index);
  const error = useMusic(s => s.error);
  const photo = selected === null ? null : moments[selected];
  const playing = Boolean(photo && index === photo.track && status === 'playing');

  useEffect(() => {
    const el = stage.current, root = section.current;
    if (!el || !root) return;
    const player = musicPlayer(), token = owner.current;
    const board = createPhotoBoard(el, i => {
      setSelected(i); player.startLoop(moments[i].track, token);
      const target = el.querySelector<HTMLElement>('.mb-target')!;
      const bounds = target.getBoundingClientRect();
      if (bounds.top < 100 || bounds.bottom > innerHeight - 140) {
        target.scrollIntoView({block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
      }
    });
    controller.current = board;
    const stop = () => player.stopLoop(token);
    const visibility = () => {if (document.hidden) stop();};
    const observer = new IntersectionObserver(([entry]) => {
      player.setBoardInView(entry.isIntersecting);
      if (!entry.isIntersecting) stop();
    });
    observer.observe(root.querySelector('.mb-board')!);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', stop);
    return () => {
      controller.current = null; board.destroy(); observer.disconnect(); stop(); player.setBoardInView(false);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', stop);
    };
  }, []);

  const reset = () => {controller.current?.reset(); musicPlayer().stopLoop(owner.current); setSelected(null);};
  const close = () => {
    const previous = selected;
    controller.current?.deselect(); musicPlayer().stopLoop(owner.current); setSelected(null);
    if (previous !== null) stage.current?.querySelectorAll<HTMLButtonElement>('.mb-photo')[previous]?.focus({preventScroll: true});
  };
  const toggle = () => {
    if (!photo) return;
    const player = musicPlayer();
    if (player.ownsLoop(owner.current)) void player.toggle(); else player.startLoop(photo.track, owner.current);
  };

  return <section id="experience" ref={section} className="music-experience" aria-labelledby="mb-heading" onKeyDown={event => {
    if (event.key === 'Escape' && selected !== null) {event.preventDefault(); close();}
  }}>
    <div className="mb-board">
      <header className="mb-heading">
        <div><p className="mb-eyebrow">Jimmy O’s · Del Mar</p><h2 id="mb-heading">Every photo has a rhythm.</h2><p>A few nights. A few good songs. Find your kind of feeling.</p></div>
        <button className="mb-reset" onClick={reset} aria-label="Reset photo board"><RotateCcw size={15}/><span>Start over</span></button>
      </header>
      <p id="mb-help" className="sr-only">Click or tap a photo, or press Enter or Space, to play its music. Drag a photo anywhere to rearrange the board. Start over restores all positions. Press Escape to close. Scroll using the space between photos.</p>
      <div className="mb-stage" ref={stage} data-selected={selected ?? ''}>
        <svg className="mb-threads" aria-hidden="true">{moments.map((_, i) => <path key={i}/>)}</svg>
        <div className="mb-target" data-active={photo ? 'true' : 'false'} aria-hidden="true">
          <span className="mb-target-icon"><Music2 size={26} strokeWidth={1.2}/></span>
          <span>Select a photograph</span><small>click to hear its music</small>
          <span className="mb-scribble">a little sound, a little memory <ArrowUpRight size={16}/></span>
        </div>
        {moments.map((moment, i) => <button key={moment.src} type="button" className="mb-photo" aria-label={`Play ${moment.title}`} aria-pressed={selected === i} aria-describedby="mb-help" style={{
          '--x': moment.x, '--y': moment.y, '--rotate': moment.rotate,
          '--size': `${moment.size}%`, '--ratio': moment.ratio,
          '--mx': i % 2 ? 74 : 26,
          '--my': i < 6 ? 8 + Math.floor(i / 2) * 13 : 72 + Math.floor((i - 6) / 2) * 12,
        } as CSSProperties}>
          <span className="mb-image"><Image src={`/images/${moment.src}`} alt={moment.alt} fill sizes="(max-width: 600px) 220px, 400px" draggable={false}/></span>
          <span className="mb-caption">{moment.caption}</span>
        </button>)}
        <div className="mb-focus-meta" hidden={!photo}>
          <div className="mb-now" data-playing={playing && !muted}><span className="mb-equalizer" aria-hidden="true"><i/><i/><i/><i/></span><span>{playing ? muted ? 'Sound muted' : 'Now playing' : status === 'loading' ? 'Loading music' : 'Press play'}</span></div>
          <h3>{photo?.title}</h3>
          <p>{photo ? PLAYLIST[photo.track].direction : ''}</p>
          <div className="mb-controls">
            <button onClick={toggle} aria-label={playing ? 'Pause photo music' : 'Play photo music'}>{playing ? <Pause size={17}/> : <Play size={17}/>}</button>
            <button onClick={() => musicPlayer().toggleMute()} aria-label={muted ? 'Unmute photo music' : 'Mute photo music'} aria-pressed={muted}>{muted ? <VolumeX size={17}/> : <Volume2 size={17}/>}</button>
            <button onClick={close} aria-label="Close selected photo"><X size={18}/></button>
          </div>
          {error && <p className="mb-error" role="alert">{error}</p>}
        </div>
      </div>
      <footer className="mb-footer"><span><span className="mb-dot"/>Nights worth replaying</span><span>Pick a photo. Turn it up.</span></footer>
      <p className="sr-only" role="status" aria-live="polite">{photo ? `${photo.title} selected. ${playing ? muted ? 'Music muted.' : 'Music playing.' : 'Music paused.'}` : 'Choose a photograph to play music.'}</p>
    </div>
    <div className="mb-dj"><div><p className="mb-dj-eyebrow">Keep the night going</p><h3>Your turn on the decks.</h3><p>Take the next track for a spin.</p></div><DjConsole/></div>
  </section>;
}
