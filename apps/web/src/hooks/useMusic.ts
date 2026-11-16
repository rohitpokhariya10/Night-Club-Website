'use client';

import {useSyncExternalStore} from 'react';
import {getMusicPlayer, INITIAL_STATE, type MusicState} from '@/lib/music/player';

const subscribe = (listener: () => void) => getMusicPlayer().subscribe(listener);

/**
 * One value from the site's music player. Pass a selector that returns a primitive, so a component re-renders only
 * when that value changes (the knob on volume, the transport on status, the display on the track…).
 * The server and the first client render see the initial, silent state.
 */
export function useMusic<T>(select: (state: MusicState) => T): T {
  return useSyncExternalStore(subscribe, () => select(getMusicPlayer().getSnapshot()), () => select(INITIAL_STATE));
}

export const musicPlayer = () => getMusicPlayer();
