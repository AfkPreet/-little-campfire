/**
 * Stable content IDs. These follow the spec's names (docs/SPEC.md section 6)
 * and never change; display names are the setting's reskin (docs/WORLD.md),
 * kept in the data tables.
 */

export const GEAR_IDS = [
  'leaf_tent',
  'dome_tent',
  'cabin_kit',
  'bamboo_rod',
  'willow_rod',
  'moonlight_rod',
  'wiggly_bait',
  'sparkle_bait',
  'kettle',
  'clay_pot',
  'skillet',
  'steamer',
] as const;
export type GearId = (typeof GEAR_IDS)[number];

export const TENT_IDS = ['leaf_tent', 'dome_tent', 'cabin_kit'] as const;
export type TentId = (typeof TENT_IDS)[number];
export const ROD_IDS = ['bamboo_rod', 'willow_rod', 'moonlight_rod'] as const;
export type RodId = (typeof ROD_IDS)[number];
export const COOKWARE_IDS = ['kettle', 'clay_pot', 'skillet', 'steamer'] as const;
export type CookwareId = (typeof COOKWARE_IDS)[number];
export const BAIT_IDS = ['wiggly_bait', 'sparkle_bait'] as const;
export type BaitId = (typeof BAIT_IDS)[number];

export const PANTRY_IDS = ['rice', 'flour', 'tea', 'honey', 'spice'] as const;
export type PantryId = (typeof PANTRY_IDS)[number];

export const FISH_IDS = [
  'pebble_minnow',
  'bubble_carp',
  'blushing_trout',
  'dusk_perch',
  'rain_loach',
  'night_glowfin',
  'petal_koi',
  'golden_whisker',
] as const;
export type FishId = (typeof FISH_IDS)[number];

export const FORAGE_IDS = ['berries', 'mushrooms', 'herbs', 'nuts', 'moon_blossom'] as const;
export type ForageId = (typeof FORAGE_IDS)[number];

export const RECIPE_IDS = [
  'herb_tea',
  'honey_tea',
  'berry_cordial',
  'spiced_tea',
  'mushroom_soup',
  'fish_congee',
  'campfire_stew',
  'berry_pudding',
  'nutty_porridge',
  'grilled_fish',
  'herb_butter_fish',
  'pancakes',
  'berry_pancakes',
  'mushroom_skewers',
  'cloud_buns',
  'moon_dumplings',
] as const;
export type RecipeId = (typeof RECIPE_IDS)[number];
/** Dish ids include the non-recipe Mystery Mush. */
export type DishId = RecipeId | 'mystery_mush';

export const DECOR_IDS = [
  'potted_flower',
  'paper_lantern',
  'floor_cushion',
  'bunting',
  'wind_chime',
  'woven_rug',
  'string_lights',
  'bookshelf',
  'hammock',
  'telescope',
  'guardian_lantern',
] as const;
export type DecorId = (typeof DECOR_IDS)[number];

export const MOMENT_IDS = ['shooting_star', 'rainbow', 'firefly_swirl', 'misty_sunrise', 'golden_whisker', 'moonbow'] as const;
export type MomentId = (typeof MOMENT_IDS)[number];

export const FORAGE_SPOT_IDS = ['berry_a', 'berry_b', 'log_a', 'log_b', 'herb_patch', 'nut_tree', 'moon_spot'] as const;
export type ForageSpotId = (typeof FORAGE_SPOT_IDS)[number];

/** Anything that can sit in the basket (cooking ingredients). */
export type IngredientId = PantryId | ForageId | FishId;

export type WeatherKind = 'clear' | 'rain' | 'mist' | 'golden';

export const SHOP_TABS = ['camp', 'fishing', 'kitchen', 'pantry', 'cozy', 'sell'] as const;
export type ShopTab = (typeof SHOP_TABS)[number];
