'use client';

import {useEffect, useRef, useState} from 'react';

type DataConnection = EventTarget & {saveData?: boolean};

/**
 * The source is chosen here (same 700px breakpoint as before) instead of <source media>. In Chromium a
 * <source media> keeps a live MediaQueryList listener after the video is removed, which retained the
 * whole previous homepage DOM on every client navigation. This listener is ours and is removed on unmount.
 */
const SMALL_SCREEN = '(max-width: 700px)';
const SOURCE = {small: '/videos/jimmy-os-hero-mobile.mp4', large: '/videos/jimmy-os-hero-desktop.mp4'};

/** The server-rendered picture stays behind this optional enhancement. */
export default function HeroMedia() {
  const video = useRef<HTMLVideoElement>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const small = matchMedia(SMALL_SCREEN);
    const pick = () => setSrc(small.matches ? SOURCE.small : SOURCE.large);
    pick();
    small.addEventListener('change', pick);
    return () => small.removeEventListener('change', pick);
  }, []);

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & {connection?: DataConnection}).connection;
    let visible = false;
    // Set by the scroll choreography once the next panel fully covers the hero.
    let covered = false;
    let timer: ReturnType<typeof setTimeout>;

    function update() {
      clearTimeout(timer);
      if (reduced.matches || connection?.saveData) {
        video.current?.pause();
        setEnabled(false);
        setReady(false);
        return;
      }
      if (visible && !covered && !document.hidden) {
        // Let the poster and text paint first. Only the selected source is fetched.
        timer = setTimeout(() => {
          setEnabled(true);
          void video.current?.play().catch(() => setReady(false));
        }, 180);
      } else {
        video.current?.pause();
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    if (anchor.current?.parentElement) observer.observe(anchor.current.parentElement);
    const hero = anchor.current?.closest('.cinema-hero');
    function onCover(event: Event) {
      covered = (event as CustomEvent<{covered: boolean}>).detail.covered;
      update();
    }
    hero?.addEventListener('hero:cover', onCover);
    reduced.addEventListener('change', update);
    connection?.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      reduced.removeEventListener('change', update);
      connection?.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      hero?.removeEventListener('hero:cover', onCover);
    };
  }, []);

  return <>
    <span ref={anchor} hidden />
    {enabled && src && <video
      ref={video}
      src={src}
      className={`hero-video${ready ? ' is-ready' : ''}`}
      muted autoPlay loop playsInline preload="none" aria-hidden="true"
      onPlaying={() => setReady(true)}
      onError={() => setReady(false)}
    />}
  </>;
}
