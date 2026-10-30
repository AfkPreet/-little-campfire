/** Forage (spec section 6). */
import type { ForageId, ForageSpotId } from './ids';

export interface ForageDef {
  id: ForageId;
  /** 'day' | 'any' | 'night' */
  when: 'day' | 'any' | 'night';
  /** null = not sellable. */
  sell: number | null;
  name: string;
  flavor: string;
  /** Double yield after a rainy night. */
  rainBonus?: boolean;
  /** Requires mystery clue 3. */
  needsClue?: number;
}

export const FORAGE: Record<ForageId, ForageDef> = {
  berries: { id: 'berries', when: 'day', sell: 2, name: 'Ainselu Berries', flavor: 'Golden wild raspberries. Every hill kid\'s snack.' },
  mushrooms: { id: 'mushrooms', when: 'any', sell: 3, name: 'Puffcap Chyau', flavor: 'Chyau means mushroom. They pop up after showers.', rainBonus: true },
  herbs: { id: 'herbs', when: 'any', sell: 2, name: 'Sisnu Nettles', flavor: 'Wild nettle. Stings to pick, sweet to eat.' },
  nuts: { id: 'nuts', when: 'day', sell: 3, name: 'Katus Nuts', flavor: 'Tiny wild chestnuts. Roast some, share some.' },
  moon_blossom: { id: 'moon_blossom', when: 'night', sell: null, name: 'Moon Gurans', flavor: 'A white rhododendron that opens for the moon.', needsClue: 3 },
};

export interface ForageSpotDef {
  id: ForageSpotId;
  item: ForageId;
  /** Items per pick (1-3). */
  min: number;
  max: number;
}

export const FORAGE_SPOTS: Record<ForageSpotId, ForageSpotDef> = {
  berry_a: { id: 'berry_a', item: 'berries', min: 1, max: 3 },
  berry_b: { id: 'berry_b', item: 'berries', min: 1, max: 3 },
  log_a: { id: 'log_a', item: 'mushrooms', min: 1, max: 3 },
  log_b: { id: 'log_b', item: 'mushrooms', min: 1, max: 3 },
  herb_patch: { id: 'herb_patch', item: 'herbs', min: 1, max: 3 },
  nut_tree: { id: 'nut_tree', item: 'nuts', min: 1, max: 3 },
  moon_spot: { id: 'moon_spot', item: 'moon_blossom', min: 1, max: 1 },
};
