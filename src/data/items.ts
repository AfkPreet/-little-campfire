/** Gear and pantry (spec section 6). Numbers are locked; names are the setting's reskin. */
import type { CookwareId, GearId, PantryId, RodId, ShopTab, TentId } from './ids';

export interface GearDef {
  id: GearId;
  tab: ShopTab;
  price: number;
  name: string;
  flavor: string;
  /** Day-1 essential tag (tent, rod, one cookware). */
  essential?: 'tent' | 'rod' | 'cookware';
  /** Hidden until mystery clue 3. */
  needsClue?: number;
  /** Bait packs add this many uses. */
  pack?: number;
}

export const GEAR: Record<GearId, GearDef> = {
  leaf_tent: { id: 'leaf_tent', tab: 'camp', price: 40, name: 'Fern Tent', flavor: 'Small, green, and smells of the forest.', essential: 'tent' },
  dome_tent: { id: 'dome_tent', tab: 'camp', price: 90, name: 'Monsoon Dome', flavor: 'Rain on its roof sounds like a lullaby.' },
  cabin_kit: { id: 'cabin_kit', tab: 'camp', price: 220, name: 'Tin-Roof Cabin', flavor: 'A pocket hill-home. Its window glows at night.' },
  bamboo_rod: { id: 'bamboo_rod', tab: 'fishing', price: 25, name: 'Malingo Rod', flavor: 'Thin hill bamboo. Bendy and kind.', essential: 'rod' },
  willow_rod: { id: 'willow_rod', tab: 'fishing', price: 80, name: 'Rattan Rod', flavor: 'Springy forest cane, wound in rose thread.' },
  moonlight_rod: { id: 'moonlight_rod', tab: 'fishing', price: 180, name: 'Firefly Rod', flavor: 'Glows at night, like a junkiri on a stick.' },
  wiggly_bait: { id: 'wiggly_bait', tab: 'fishing', price: 5, name: 'Atta Bait (x5)', flavor: 'Little atta dough balls. Fish love a snack.', pack: 5 },
  sparkle_bait: { id: 'sparkle_bait', tab: 'fishing', price: 15, name: 'Mica Lure (x3)', flavor: 'River mica flakes that wink underwater.', pack: 3 },
  kettle: { id: 'kettle', tab: 'kitchen', price: 15, name: 'Chiya Kettle', flavor: 'Dented aluminium, always ready for chiya.', essential: 'cookware' },
  clay_pot: { id: 'clay_pot', tab: 'kitchen', price: 20, name: 'Copper Kasaudi', flavor: 'A round-bellied copper pot. Soup, jaulo, khir.', essential: 'cookware' },
  skillet: { id: 'skillet', tab: 'kitchen', price: 30, name: 'Iron Tawa', flavor: 'A flat iron griddle for flips and sizzles.', essential: 'cookware' },
  steamer: { id: 'steamer', tab: 'kitchen', price: 45, name: 'Momo Steamer', flavor: 'Three stacked tiers of steam. Boju\'s spare.', needsClue: 3 },
};

export interface TentDef {
  id: TentId;
  bonus: number;
  hangPoints: number;
  cozyRain?: boolean;
  litWindow?: boolean;
}

export const TENTS: Record<TentId, TentDef> = {
  leaf_tent: { id: 'leaf_tent', bonus: 0, hangPoints: 2 },
  dome_tent: { id: 'dome_tent', bonus: 5, hangPoints: 4, cozyRain: true },
  cabin_kit: { id: 'cabin_kit', bonus: 10, hangPoints: 6, cozyRain: true, litWindow: true },
};

export interface RodDef {
  id: RodId;
  /** Bite window in seconds. */
  window: number;
  /** Can catch fish marked Willow Rod+. */
  sturdy: boolean;
  /** Multiplier on rare weights. */
  rareMult: number;
  glows: boolean;
  rank: number;
}

export const RODS: Record<RodId, RodDef> = {
  bamboo_rod: { id: 'bamboo_rod', window: 1.4, sturdy: false, rareMult: 1, glows: false, rank: 1 },
  willow_rod: { id: 'willow_rod', window: 1.9, sturdy: true, rareMult: 1, glows: false, rank: 2 },
  moonlight_rod: { id: 'moonlight_rod', window: 1.9, sturdy: true, rareMult: 2, glows: true, rank: 3 },
};

export const BAIT = {
  wiggly: { gear: 'wiggly_bait' as const, waitMult: 0.6, rareMult: 1 },
  sparkle: { gear: 'sparkle_bait' as const, waitMult: 1, rareMult: 3 },
};

export const COOKWARE: CookwareId[] = ['kettle', 'clay_pot', 'skillet', 'steamer'];

export interface PantryDef {
  id: PantryId;
  price: number;
  name: string;
  flavor: string;
}

export const PANTRY: Record<PantryId, PantryDef> = {
  rice: { id: 'rice', price: 4, name: 'Hill Rice', flavor: 'Grown on terraces that climb like stairs.' },
  flour: { id: 'flour', price: 4, name: 'Maida Flour', flavor: 'Soft white flour for momos, malpua and tingmo.' },
  tea: { id: 'tea', price: 5, name: 'First-Flush Tea', flavor: 'Spring leaves, picked two-and-a-bud.' },
  honey: { id: 'honey', price: 6, name: 'Comb Honey', flavor: 'From the bee boxes behind Boju\'s shop.' },
  spice: { id: 'spice', price: 3, name: 'Masala Pouch', flavor: 'Big cardamom, timur and a pinch of ginger.' },
};

/** Shop tab order and labels. */
export const SHOP_TAB_LABELS: Record<ShopTab, string> = {
  camp: 'Camp',
  fishing: 'Fishing',
  kitchen: 'Kitchen',
  pantry: 'Pantry',
  cozy: 'Cozy',
  sell: 'Sell',
};
