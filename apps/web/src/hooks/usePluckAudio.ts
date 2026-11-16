'use client';

import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {PluckSynth, audioSupported} from '@/lib/strings/audio';
import type {PluckEvent} from '@/lib/strings/instrument';

const noSubscription = () => () => {};

/**
 * Sound for the strings: off by default, and nothing audio-related exists until the visitor turns it on with the
 * sound button (a user gesture, so browsers allow it). `play` is stable and silent while sound is off.
 * The audio context is closed when the section unmounts.
 */
export function usePluckAudio(frequencies: readonly number[]) {
  // The server (and the first client render) assumes support; a browser without Web Audio disables the control.
  const available = useSyncExternalStore(noSubscription, audioSupported, () => true);
  const synth = useRef<PluckSynth | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => () => {synth.current?.dispose(); synth.current = null;}, []);

  const toggle = useCallback(async () => {
    if (enabled) {
      synth.current?.disable();
      setEnabled(false);
      return;
    }
    synth.current ??= new PluckSynth(frequencies);
    try {
      await synth.current.enable();
      setEnabled(true);
    } catch {
      synth.current.dispose();
      synth.current = null;
      setFailed(true);
    }
  }, [enabled, frequencies]);

  const play = useCallback((event: PluckEvent) => synth.current?.pluck(event.string, event.intensity, event.pan), []);

  return {supported: available && !failed, enabled, toggle, play};
}
