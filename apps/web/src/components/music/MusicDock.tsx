'use client';

import {useEffect, useState} from 'react';
import {ChevronDown, Disc3, Pause, Play, SkipBack, SkipForward} from 'lucide-react';
import VolumeKnob from './VolumeKnob';
import {useMusic, musicPlayer} from '@/hooks/useMusic';
import {PLAYLIST} from '@/lib/music/playlist';

const COLLAPSED_KEY = 'jo-music-dock-collapsed';

/**
 * The floating mini player (DJ-CONSOLE-REPORT.md): mounted once in the root layout, so it survives client-side
 * navigation, and bound to the same single player as the homepage console. It appears only after the visitor has
 * pressed play, steps aside while the homepage console itself is on screen, can be minimised to a small disc, and
 * reserves its own height at the end of the page so it never hides the footer or the last form button.
 */
export default function MusicDock() {
  const activated = useMusic(s => s.activated);
  const consoleInView = useMusic(s => s.consoleInView || s.boardInView);
  const index = useMusic(s => s.index);
  const status = useMusic(s => s.status);
  const error = useMusic(s => s.error);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {try {setCollapsed(sessionStorage.getItem(COLLAPSED_KEY) === '1');} catch {/* storage unavailable */}}, []);
  const collapse = (value: boolean) => {setCollapsed(value); try {sessionStorage.setItem(COLLAPSED_KEY, value ? '1' : '0');} catch {/* ignore */}};

  const shown = activated && !consoleInView;
  const playing = status === 'playing' || status === 'loading';
  const track = PLAYLIST[index];
  const player = musicPlayer;

  return (
    <>
      <section className="music-dock" aria-label="Music player" data-shown={shown || undefined} data-collapsed={collapsed || undefined} data-playing={playing || undefined} hidden={!shown}>
        {collapsed ? (
          <button type="button" className="music-dock-disc" aria-label={`Show music player (${playing ? 'playing' : 'paused'}: ${track.title})`} onClick={() => collapse(false)}>
            <Disc3 size={22} aria-hidden="true"/>
          </button>
        ) : (
          <>
            <span className="music-dock-vinyl" aria-hidden="true"/>
            <div className="music-dock-info">
              <p className="music-dock-title">{track.title}</p>
              <p className="music-dock-sub">{error ?? `${track.demo ? 'Demo track' : track.direction} · ${String(index + 1).padStart(2, '0')} / ${String(PLAYLIST.length).padStart(2, '0')}`}</p>
            </div>
            <div className="music-dock-transport">
              <button type="button" className="dj-btn" aria-label="Previous track" onClick={() => player().previous()}><SkipBack size={15} aria-hidden="true"/></button>
              <button type="button" className="dj-btn dj-play" aria-label={status === 'loading' ? 'Loading' : playing ? 'Pause' : 'Play'} aria-pressed={playing} onClick={() => void player().toggle()}>
                {playing ? <Pause size={17} aria-hidden="true"/> : <Play size={17} aria-hidden="true"/>}
              </button>
              <button type="button" className="dj-btn" aria-label="Next track" onClick={() => player().next()}><SkipForward size={15} aria-hidden="true"/></button>
            </div>
            <VolumeKnob size="dock"/>
            <button type="button" className="music-dock-min" aria-label="Minimise music player" onClick={() => collapse(true)}><ChevronDown size={16} aria-hidden="true"/></button>
          </>
        )}
      </section>
      {shown && <div className="music-dock-spacer" aria-hidden="true" data-collapsed={collapsed || undefined}/>}
    </>
  );
}
