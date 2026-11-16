'use client';

import {useEffect, useRef, useState} from 'react';
import {getImageProps} from 'next/image';

type DataConnection = EventTarget & {saveData?: boolean};

/** Nightlife cut of the client-supplied Jimmy O's footage (scripts/motion/make-section-film.mjs). */
const SMALL = '(max-width: 700px)';
const FILM = {small: '/videos/jimmy-os-nightlife-mobile.mp4', large: '/videos/jimmy-os-nightlife-desktop.mp4'};
const ALT = 'Friends sharing cocktails at the bar at Jimmy O’s Del Mar';

/**
 * The poster is a real, server-rendered image (stable layout, no CLS). The film is created only once the
 * section is actually on screen, plays muted and inline, pauses whenever it leaves the viewport or the tab
 * is hidden, and is never created for reduced motion, Save-Data or reduced-data preferences.
 * The source is chosen in JS (no <source media>): Chromium keeps MediaQueryList listeners of removed
 * <source media> elements alive, which retained whole pages across client navigation.
 */
export default function NightFilm() {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = root.current;
    if (!frame) return;
    const small = matchMedia(SMALL);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const reducedData = matchMedia('(prefers-reduced-data: reduce)');
    const connection = (navigator as Navigator & {connection?: DataConnection}).connection;
    let visible = false;

    function update() {
      const allowed = !reduced.matches && !reducedData.matches && !connection?.saveData;
      if (!allowed) {
        video.current?.pause();
        setSrc(null);
        setReady(false);
        frame!.dataset.film = 'poster';
        return;
      }
      if (visible && !document.hidden) {
        setSrc(small.matches ? FILM.small : FILM.large);
        void video.current?.play().catch(() => setReady(false));
        frame!.dataset.film = 'playing';
      } else {
        video.current?.pause();
        if (frame!.dataset.film === 'playing') frame!.dataset.film = 'paused';
      }
    }
    const observer = new IntersectionObserver(([entry]) => {visible = entry.isIntersecting; update();}, {threshold: 0.15});
    observer.observe(frame);
    for (const query of [small, reduced, reducedData]) query.addEventListener('change', update);
    connection?.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    frame.dataset.film = 'poster';
    return () => {
      observer.disconnect();
      for (const query of [small, reduced, reducedData]) query.removeEventListener('change', update);
      connection?.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  // A source change (breakpoint switch) or first mount while visible: start playback once the element exists.
  useEffect(() => {
    if (src && root.current?.dataset.film === 'playing') void video.current?.play().catch(() => setReady(false));
  }, [src]);

  const common = {alt: ALT, sizes: '100vw', quality: 75, loading: 'lazy' as const};
  const {props: large} = getImageProps({...common, src: '/images/jimmy-os-nightlife-poster.webp', width: 1280, height: 720});
  const {props: mobile} = getImageProps({...common, src: '/images/jimmy-os-nightlife-poster-mobile.webp', width: 640, height: 360});
  return <div className="night-film" ref={root}>
    <picture className="night-film-poster">
      <source media={SMALL} srcSet={mobile.srcSet} />
      <img {...large} alt={ALT} />
    </picture>
    {src && <video
      ref={video}
      key={src}
      src={src}
      className={`night-film-video${ready ? ' is-ready' : ''}`}
      muted loop playsInline preload="none" aria-hidden="true"
      disablePictureInPicture
      onPlaying={() => setReady(true)}
      onError={() => setReady(false)}
    />}
  </div>;
}
