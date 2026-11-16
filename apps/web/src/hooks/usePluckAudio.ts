'use client';

import {useCallback, useEffect, useRef} from 'react';
import {PluckSynth} from '@/lib/strings/audio';
import type {PluckEvent} from '@/lib/strings/instrument';
import {useMusic, musicPlayer} from '@/hooks/useMusic';

/**
 * Sound for the strings, now part of the site's music experience (DJ-CONSOLE-REPORT.md). There is no separate sound
 * button: the strings are voiced once the visitor has started the music with the DJ console (a user gesture, so the
 * shared context is running), and only while that music is paused or stopped, so plucks never compete with a track.
 * They play through the music player's context and master volume, so the knob and mute govern them too.
 * `play` is stable and silent whenever the strings are not voiced. The voice is released when the section unmounts.
 */
export function usePluckAudio(frequencies: readonly number[]) {
  const activated = useMusic(s => s.activated);
  const voiced = useMusic(s => s.activated && s.status !== 'playing' && s.status !== 'loading');
  const synth = useRef<PluckSynth | null>(null);

  // Once the music has started, render the string voice in idle time, so voicing it later (on pause) is instant.
  useEffect(() => {
    if (!activated || synth.current || !musicPlayer().output()) return;
    const id = window.setTimeout(() => {
      if (synth.current || !musicPlayer().output()) return;
      synth.current = new PluckSynth(frequencies, () => musicPlayer().output());
      try {synth.current.prepare();} catch {synth.current = null;}
    }, 700);
    return () => window.clearTimeout(id);
  }, [activated, frequencies]);

  useEffect(() => {
    if (!voiced) {synth.current?.disable(); return;}
    const output = () => musicPlayer().output();
    if (!output()) return; // Web Audio unavailable: the strings stay silent
    synth.current ??= new PluckSynth(frequencies, output);
    synth.current.enable().catch(() => {synth.current?.dispose(); synth.current = null;});
  }, [voiced, frequencies]);

  useEffect(() => () => {synth.current?.dispose(); synth.current = null;}, []);

  const play = useCallback((event: PluckEvent) => synth.current?.pluck(event.string, event.intensity, event.pan), []);
  return {voiced, play};
}
