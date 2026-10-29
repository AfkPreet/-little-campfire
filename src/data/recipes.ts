/** Recipes (spec section 6). Matching = cookware + exact ingredient set, order ignored. */
import type { CookwareId, DishId, IngredientId, RecipeId } from './ids';

/** 'any_fish' matches any species. */
export type RecipeIngredient = Exclude<IngredientId, never> | 'any_fish';

export interface RecipeDef {
  id: RecipeId;
  n: number;
  cookware: CookwareId;
  ingredients: RecipeIngredient[];
  /** Sell price; 'fishx1.5' = fish price x 1.5; null = not sellable. */
  sell: number | 'fishx1.5' | null;
  contentment: number;
  name: string;
  hint: string;
  flavor: string;
}

export const RECIPES: Record<RecipeId, RecipeDef> = {
  herb_tea: { id: 'herb_tea', n: 1, cookware: 'kettle', ingredients: ['herbs'], sell: 8, contentment: 8, name: 'Herb Tea', hint: 'Just leaves and hot water', flavor: '' },
  honey_tea: { id: 'honey_tea', n: 2, cookware: 'kettle', ingredients: ['tea', 'honey'], sell: 14, contentment: 10, name: 'Honey Tea', hint: 'Golden and sweet', flavor: '' },
  berry_cordial: { id: 'berry_cordial', n: 3, cookware: 'kettle', ingredients: ['berries', 'honey'], sell: 14, contentment: 10, name: 'Berry Cordial', hint: 'Pink and sweet', flavor: '' },
  spiced_tea: { id: 'spiced_tea', n: 4, cookware: 'kettle', ingredients: ['tea', 'spice'], sell: 12, contentment: 12, name: 'Spiced Tea', hint: 'Warms you to the toes', flavor: '' },
  mushroom_soup: { id: 'mushroom_soup', n: 5, cookware: 'clay_pot', ingredients: ['mushrooms', 'herbs'], sell: 16, contentment: 12, name: 'Mushroom Soup', hint: 'Earthy and green', flavor: '' },
  fish_congee: { id: 'fish_congee', n: 6, cookware: 'clay_pot', ingredients: ['any_fish', 'rice'], sell: 20, contentment: 14, name: 'Fish Congee', hint: 'Soft rice and something from the water', flavor: '' },
  campfire_stew: { id: 'campfire_stew', n: 7, cookware: 'clay_pot', ingredients: ['any_fish', 'mushrooms', 'herbs'], sell: 30, contentment: 18, name: 'Campfire Stew', hint: 'The woods and the water in one pot', flavor: '' },
  berry_pudding: { id: 'berry_pudding', n: 8, cookware: 'clay_pot', ingredients: ['rice', 'berries', 'honey'], sell: 24, contentment: 16, name: 'Berry Rice Pudding', hint: 'Dessert from the pot', flavor: '' },
  nutty_porridge: { id: 'nutty_porridge', n: 9, cookware: 'clay_pot', ingredients: ['rice', 'nuts', 'honey'], sell: 22, contentment: 14, name: 'Nutty Porridge', hint: 'A crunchy breakfast', flavor: '' },
  grilled_fish: { id: 'grilled_fish', n: 10, cookware: 'skillet', ingredients: ['any_fish'], sell: 'fishx1.5', contentment: 10, name: 'Grilled Fish', hint: 'Simple and smoky', flavor: '' },
  herb_butter_fish: { id: 'herb_butter_fish', n: 11, cookware: 'skillet', ingredients: ['any_fish', 'herbs', 'spice'], sell: 30, contentment: 16, name: 'Herb-Butter Fish', hint: 'Fancy fish', flavor: '' },
  pancakes: { id: 'pancakes', n: 12, cookware: 'skillet', ingredients: ['flour', 'honey'], sell: 16, contentment: 12, name: 'Fluffy Pancakes', hint: 'Flip, flip!', flavor: '' },
  berry_pancakes: { id: 'berry_pancakes', n: 13, cookware: 'skillet', ingredients: ['flour', 'berries', 'honey'], sell: 22, contentment: 14, name: 'Berry Pancakes', hint: 'Fluffy, with a pink surprise', flavor: '' },
  mushroom_skewers: { id: 'mushroom_skewers', n: 14, cookware: 'skillet', ingredients: ['mushrooms', 'spice'], sell: 14, contentment: 10, name: 'Mushroom Skewers', hint: 'On a stick, over the flames', flavor: '' },
  cloud_buns: { id: 'cloud_buns', n: 15, cookware: 'steamer', ingredients: ['flour', 'honey', 'nuts'], sell: 26, contentment: 16, name: 'Cloud Buns', hint: 'Soft as a cloud', flavor: '' },
  moon_dumplings: { id: 'moon_dumplings', n: 16, cookware: 'steamer', ingredients: ['flour', 'moon_blossom', 'night_glowfin'], sell: null, contentment: 25, name: 'Moonlight Dumplings', hint: "The legend's favorite", flavor: '' },
};

export const RECIPE_ORDER = Object.values(RECIPES)
  .sort((a, b) => a.n - b.n)
  .map((r) => r.id);

/** Mystery Mush: not a recipe. */
export const MUSH = { id: 'mystery_mush' as DishId, sell: 2, contentment: 3, name: 'Mystery Mush' };

/** A dish never sells for less than this multiple of its ingredients' value. */
export const DISH_MIN_MULT = 1.25;
/** Cooking timings. */
export const COOKING = { cookSeconds: 2.5, stirCircles: 2, holdSeconds: 1.5, maxIngredients: 3, newRecipeContentment: 8 };
