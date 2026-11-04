/**
 * The game's own audio engine, exposed to the trailer page as window.MomoAudio
 * (built to an IIFE by scripts/trailer-build.mjs and inlined into the page).
 * No music files are detected here, so the generative score plays.
 */
import { audioState, duckMusic, playSfx, setAmbience, setMusicMood, unlockAudio } from '@/audio/engine';
import type { SfxId } from '@/audio/sfx';
import type { MusicMood } from '@/audio/music';
import type { AmbienceCtx } from '@/audio/ambience';
import { settingsSet } from '@/core/settings';

const api = {
  unlock: () => unlockAudio(),
  mood: (m: MusicMood) => setMusicMood(m),
  ambience: (c: AmbienceCtx) => setAmbience(c),
  sfx: (id: SfxId, vol = 1) => playSfx(id, { vol }),
  duck: (amount?: number, ms?: number) => duckMusic(amount, ms),
  volume: (music: number, sounds: number, ambience: number) => settingsSet({ music, sounds, ambience }),
  state: () => audioState(),
};

(window as unknown as { MomoAudio: typeof api }).MomoAudio = api;
