'use client';

import {useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import Image from 'next/image';
import {X, Expand} from 'lucide-react';
import {Arrow} from './ui';
import gsap from 'gsap';
import {galleryPhotos, ringPoint, type GalleryPhoto} from '@/lib/gallery';
import {useGalleryMotion} from '@/hooks/useGalleryMotion';

const allowsMotion = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Rendered widths of the ring cards by shape (see .lens-ring in globals.css), for responsive image selection. */
const RING_SIZES = {
  landscape: '(max-width: 700px) 30vw, (max-width: 1180px) 19vw, 305px',
  square: '(max-width: 700px) 24vw, (max-width: 1180px) 16vw, 250px',
  portrait: '(max-width: 700px) 21vw, (max-width: 1180px) 14vw, 215px',
};

/** A card's server-rendered slot on the ring (complete without JavaScript; the homepage motion rewrites it while orbiting). */
const ringSlot = (i: number, count: number) => {
  const {cx, cy} = ringPoint(i, count);
  return {'--cx': cx, '--cy': cy} as CSSProperties;
};

export default function LightboxGallery({photos = galleryPhotos, variant = 'masonry', center}: {photos?: GalleryPhoto[]; variant?: 'masonry' | 'ring'; center?: ReactNode}) {
  const [slide, setSlide] = useState({index: 0, direction: 0});
  const [opened, setOpened] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const image = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const transition = useRef<gsap.core.Tween | null>(null);
  const imageTransition = useRef<gsap.core.Tween | null>(null);
  const closing = useRef(false);
  const touch = useRef<{x: number; y: number} | null>(null);
  useGalleryMotion(grid);

  useLayoutEffect(() => {
    const viewer = dialog.current;
    if (!opened || !viewer) return;
    closing.current = false;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const gutter = innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + gutter}px`;
    document.body.style.overflow = 'hidden';
    viewer.showModal();
    viewer.querySelector<HTMLButtonElement>('.lightbox-close')?.focus({preventScroll: true});
    if (allowsMotion()) transition.current = gsap.fromTo(viewer,
      {opacity: 0, scale: .96, y: 18, '--viewer-dim': 0},
      {opacity: 1, scale: 1, y: 0, '--viewer-dim': 1, duration: .48, ease: 'power3.out'},
    );
    else gsap.set(viewer, {opacity: 1, scale: 1, y: 0, '--viewer-dim': 1});

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    function settle() {
      if (!reduced.matches) return;
      // Finish either direction immediately if the preference changes mid-flight.
      transition.current?.progress(1);
      imageTransition.current?.progress(1);
    }
    reduced.addEventListener('change', settle);
    return () => {
      reduced.removeEventListener('change', settle);
      transition.current?.kill();
      imageTransition.current?.kill();
      viewer.close();
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      trigger.current?.focus({preventScroll: true});
    };
  }, [opened]);

  useLayoutEffect(() => {
    if (!opened || !image.current) return;
    imageTransition.current?.kill();
    if (allowsMotion() && slide.direction) imageTransition.current = gsap.fromTo(image.current,
      {opacity: .2, x: slide.direction * 18},
      {opacity: 1, x: 0, duration: .4, ease: 'power3.out', clearProps: 'all'},
    );
    else gsap.set(image.current, {clearProps: 'all'});
    return () => { imageTransition.current?.kill(); };
  }, [slide, opened]);

  function open(index: number, button: HTMLButtonElement) {
    trigger.current = button;
    setSlide({index, direction: 0});
    setOpened(true);
  }
  function close() {
    if (closing.current) return;
    closing.current = true;
    transition.current?.kill();
    if (allowsMotion() && dialog.current) transition.current = gsap.to(dialog.current, {
      opacity: 0, scale: .98, y: 10, '--viewer-dim': 0, duration: .22, ease: 'power2.in',
      onComplete: () => setOpened(false),
    });
    else setOpened(false);
  }
  function move(direction: number) {
    if (closing.current) return;
    setSlide(current => ({index: (current.index + direction + photos.length) % photos.length, direction}));
  }
  const photo = photos[slide.index];

  return <>
    {variant === 'ring' && <div className="lens-ring" ref={grid}>
      {center && <div className="lens-center">{center}</div>}
      {photos.map((photo, i) => <button className="lens-card" data-shape={photo.shape ?? 'square'} key={photo.id} style={ringSlot(i, photos.length)}
        onClick={event => open(i, event.currentTarget)} aria-label={`View ${photo.caption}`} aria-haspopup="dialog">
        <span className="lens-card-inner"><span className="lens-card-pop"><span className="lens-face">
          <span className="lens-photo"><Image src={photo.src} alt={photo.caption} fill sizes={RING_SIZES[photo.shape ?? 'square']} /></span>
          <span className="lens-caption"><span>{photo.caption}</span><Expand size={15} aria-hidden="true" /></span>
        </span></span></span>
      </button>)}
    </div>}
    {variant === 'masonry' && <div className="masonry" ref={grid}>
      {photos.map((photo, i) => <button className="gallery-tile" key={photo.id}
        onClick={event => open(i, event.currentTarget)} aria-label={`View ${photo.caption}`} aria-haspopup="dialog">
        <span className="gallery-art">
          <span className="gallery-depth" data-gallery-depth={photo.depth || undefined}>
            <Image src={photo.src} alt={photo.caption} fill sizes="(max-width: 380px) 90vw, (max-width: 1000px) 46vw, 30vw" />
          </span>
        </span>
        <span className="gallery-caption"><span><small>{String(i + 1).padStart(2, '0')} / </small>{photo.caption}</span><Expand size={17} aria-hidden="true" /></span>
      </button>)}
    </div>}
    <dialog className="lightbox" ref={dialog} aria-label="Photo viewer" aria-describedby="photo-caption"
      onCancel={event => {event.preventDefault(); close();}}
      onClose={event => {if (!event.currentTarget.open) setOpened(false);}}
      onClick={event => {if (event.target === event.currentTarget) close();}}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault(); event.stopPropagation(); close();
        }
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
        }
        if (event.key === 'Tab') {
          const buttons = dialog.current?.querySelectorAll('button');
          if (!buttons?.length) return;
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
          else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
        }
      }}>
      <button className="lightbox-close" onClick={close} aria-label="Close photo"><X /></button>
      {opened && <figure className="lightbox-image" ref={image}
        onPointerDown={event => {if (event.pointerType === 'touch') touch.current = {x: event.clientX, y: event.clientY};}}
        onPointerCancel={() => {touch.current = null;}}
        onPointerUp={event => {
          const start = touch.current;
          touch.current = null;
          if (start && Math.abs(event.clientX - start.x) > 50 && Math.abs(event.clientY - start.y) < 70) move(event.clientX < start.x ? 1 : -1);
        }}>
        <Image key={photo.id} src={photo.src} alt={photo.caption} fill sizes="(max-width: 700px) 94vw, 90vw" loading="eager" />
      </figure>}
      <div className="lightbox-controls">
        <button onClick={() => move(-1)} aria-label="Previous photo"><Arrow dir="left" /></button>
        <p id="photo-caption" aria-live="polite" aria-atomic="true">{slide.index + 1} / {photos.length} · {photo.caption}</p>
        <button onClick={() => move(1)} aria-label="Next photo"><Arrow dir="right" /></button>
      </div>
    </dialog>
  </>;
}
