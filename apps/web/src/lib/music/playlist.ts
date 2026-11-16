/**
 * The DJ console's five-track playlist (MUSIC-LICENSES.md).
 *
 * Status, honestly: no client-licensed pop recordings have been supplied yet. Each slot therefore holds an ORIGINAL
 * demo instrumental composed and synthesised for this project by `scripts/audio/demo-tracks.mjs` (no samples, loops
 * or third-party recordings), so every control can be built and tested against real audio. They are labelled as
 * demos everywhere a visitor sees them. To launch with the client's music, replace `title`, `creator`, `src`,
 * `duration` and `license` per slot with the licensed recording's details; nothing else needs to change.
 */
export type TrackLicense = {
  /** `demo-original`: made in-project, owned by the project; `client-licensed`: a recording the client has licensed. */
  kind: 'demo-original' | 'client-licensed';
  summary: string;
};

export type Track = {
  id: string;
  /** The slot's musical direction from the brief (a genre, not a song title). */
  direction: string;
  title: string;
  creator: string;
  /** Public path of the audio file (AAC in MP4: plays in Chrome, Edge, Safari and Firefox). */
  src: string;
  /** Seconds, as rendered; the player trusts the file's own metadata once loaded. */
  duration: number;
  bpm: number;
  demo: boolean;
  license: TrackLicense;
};

const DEMO_LICENSE: TrackLicense = {
  kind: 'demo-original',
  summary: 'Original demo composed and synthesised in-project (scripts/audio/demo-tracks.mjs). No third-party material. Placeholder until the client supplies licensed pop recordings.',
};

const demo = (n: number, id: string, direction: string, title: string, duration: number, bpm: number): Track => ({
  id, direction, title, creator: 'Original demo · made for Jimmy O’s', src: `/audio/demo/${String(n).padStart(2, '0')}-${id}-demo.m4a`,
  duration, bpm, demo: true, license: DEMO_LICENSE,
});

// Plain descriptive titles: these are demos, not songs, and are never presented as releases.
export const PLAYLIST: readonly Track[] = [
  demo(1, 'dance-pop', 'Upbeat dance-pop', 'Dance-Pop Demo', 78.9, 124),
  demo(2, 'funky-disco-pop', 'Funky pop / disco-pop', 'Disco-Pop Demo', 84.3, 116),
  demo(3, 'electronic-pop', 'Contemporary electronic pop', 'Electro-Pop Demo', 76.5, 128),
  demo(4, 'feel-good-party-pop', 'Feel-good party pop', 'Party-Pop Demo', 81.5, 120),
  demo(5, 'smooth-late-night-pop', 'Smooth late-night pop', 'Late-Night Pop Demo', 85, 92),
];
