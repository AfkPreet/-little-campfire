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
  leaf_tent: { id: 'leaf_tent', tab: 'camp', price: 40, name: 'Leaf Tent', flavor: 'Snug for one small camper.', essential: 'tent' },
  dome_tent: { id: 'dome_tent', tab: 'camp', price: 90, name: 'Dome Tent', flavor: 'Rain sounds extra cozy inside.' },
  cabin_kit: { id: 'cabin_kit', tab: 'camp', price: 220, name: 'Little Cabin Kit', flavor: 'A lit window to come home to.' },
  bamboo_rod: { id: 'bamboo_rod', tab: 'fishing', price: 25, name: 'Bamboo Rod', flavor: 'Light, springy and trusty.', essential: 'rod' },
  willow_rod: { id: 'willow_rod', tab: 'fishing', price: 80, name: 'Willow Rod', flavor: 'A longer moment to react.' },
  moonlight_rod: { id: 'moonlight_rod', tab: 'fishing', price: 180, name: 'Moonlight Rod', flavor: 'Glows softly after dark.' },
  wiggly_bait: { id: 'wiggly_bait', tab: 'fishing', price: 5, name: 'Wiggly Bait', flavor: 'Bites come sooner. (x5)', pack: 5 },
  sparkle_bait: { id: 'sparkle_bait', tab: 'fishing', price: 15, name: 'Sparkle Bait', flavor: 'Rare fish love it. (x3)', pack: 3 },
  kettle: { id: 'kettle', tab: 'kitchen', price: 15, name: 'Kettle', flavor: 'For teas and warm drinks.', essential: 'cookware' },
  clay_pot: { id: 'clay_pot', tab: 'kitchen', price: 20, name: 'Clay Pot', flavor: 'Soups, porridge and pudding.', essential: 'cookware' },
  skillet: { id: 'skillet', tab: 'kitchen', price: 30, name: 'Skillet', flavor: 'Grills, pancakes and skewers.', essential: 'cookware' },
  steamer: { id: 'steamer', tab: 'kitchen', price: 45, name: 'Bamboo Steamer', flavor: 'Buns and dumplings.', needsClue: 3 },
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
  rice: { id: 'rice', price: 4, name: 'Rice', flavor: 'One portion.' },
  flour: { id: 'flour', price: 4, name: 'Flour', flavor: 'One portion.' },
  tea: { id: 'tea', price: 5, name: 'Tea leaves', flavor: 'One portion.' },
  honey: { id: 'honey', price: 6, name: 'Honey', flavor: 'One portion.' },
  spice: { id: 'spice', price: 3, name: 'Spice pouch', flavor: 'One portion.' },
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
