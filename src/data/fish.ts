/** Fish (spec section 6). Numbers locked; names are the setting's reskin. */
import type { FishId } from './ids';

export type Rarity = 'common' | 'uncommon' | 'rare';
export type FishWhen = 'any' | 'day' | 'dusk' | 'rain' | 'night' | 'mistyDawn' | 'special';

export interface FishDef {
  id: FishId;
  rarity: Rarity;
  when: FishWhen;
  /** Needs Willow Rod or better. */
  sturdy: boolean;
  sell: number;
  /** Base size in cm (sizes vary +-30%). */
  cm: number;
  name: string;
  flavor: string;
  /** Journal hint for the locked silhouette. */
  hint: string;
}

export const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, uncommon: 30, rare: 10 };
export const RARITY_STARS: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 3 };
/** Golden Whisker: separate 1% roll on every bite. */
export const GOLDEN_CHANCE = 0.01;
export const SIZE_VARIANCE = 0.3;

export const FISH: Record<FishId, FishDef> = {
  pebble_minnow: { id: 'pebble_minnow', rarity: 'common', when: 'any', sturdy: false, sell: 6, cm: 8, name: 'Pebble Minnow', flavor: 'Small, speckled, always nearby.', hint: 'Any time, anywhere' },
  bubble_carp: { id: 'bubble_carp', rarity: 'common', when: 'any', sturdy: false, sell: 8, cm: 22, name: 'Bubble Carp', flavor: 'Blows a bubble when it is happy.', hint: 'Any time, anywhere' },
  blushing_trout: { id: 'blushing_trout', rarity: 'common', when: 'day', sturdy: false, sell: 9, cm: 26, name: 'Blushing Trout', flavor: 'Pink-cheeked and a little shy.', hint: 'Out in the daylight' },
  dusk_perch: { id: 'dusk_perch', rarity: 'uncommon', when: 'dusk', sturdy: false, sell: 18, cm: 24, name: 'Dusk Perch', flavor: 'Wears the sunset on its fins.', hint: 'Bites at dusk' },
  rain_loach: { id: 'rain_loach', rarity: 'uncommon', when: 'rain', sturdy: false, sell: 20, cm: 18, name: 'Rain Loach', flavor: 'Comes up to listen to the rain.', hint: 'Only when it rains' },
  night_glowfin: { id: 'night_glowfin', rarity: 'uncommon', when: 'night', sturdy: true, sell: 24, cm: 20, name: 'Night Glowfin', flavor: 'Its fins glow like little lamps.', hint: 'At night, with a sturdier rod' },
  petal_koi: { id: 'petal_koi', rarity: 'rare', when: 'mistyDawn', sturdy: true, sell: 45, cm: 34, name: 'Petal Koi', flavor: 'Drifts like a petal in the mist.', hint: 'A misty dawn, with a sturdier rod' },
  golden_whisker: { id: 'golden_whisker', rarity: 'rare', when: 'special', sturdy: false, sell: 60, cm: 40, name: 'Golden Whisker', flavor: "It's practically glowing.", hint: 'Very, very lucky' },
};

export const FISH_ORDER: FishId[] = ['pebble_minnow', 'bubble_carp', 'blushing_trout', 'dusk_perch', 'rain_loach', 'night_glowfin', 'petal_koi', 'golden_whisker'];

/** Fishing timings (spec section 5). */
export const FISHING = {
  waitMin: 3,
  waitMax: 10,
  fakeNibblesMax: 2,
  reelSeconds: 1.2,
  /** Show the rod hint after this many casts when a sturdy-only fish is in season. */
  rodHintCasts: 3,
  releaseContentment: 2,
  newSpeciesContentment: 10,
};
