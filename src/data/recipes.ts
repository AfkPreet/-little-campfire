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
  herb_tea: { id: 'herb_tea', n: 1, cookware: 'kettle', ingredients: ['herbs'], sell: 8, contentment: 8, name: 'Sisnu Tea', hint: 'Just leaves and hot water', flavor: 'Green and gentle. The sting boils away.' },
  honey_tea: { id: 'honey_tea', n: 2, cookware: 'kettle', ingredients: ['tea', 'honey'], sell: 14, contentment: 10, name: 'Honey Chiya', hint: 'Golden and sweet', flavor: 'Chiya means tea. This one comes with a hug.' },
  berry_cordial: { id: 'berry_cordial', n: 3, cookware: 'kettle', ingredients: ['berries', 'honey'], sell: 14, contentment: 10, name: 'Ainselu Sharbat', hint: 'Sunny and sweet', flavor: 'Warm golden-berry cordial, sipped slow.' },
  spiced_tea: { id: 'spiced_tea', n: 4, cookware: 'kettle', ingredients: ['tea', 'spice'], sell: 12, contentment: 12, name: 'Masala Chiya', hint: 'Warms you to the toes', flavor: 'Cardamom, timur, ginger. Toes: toasty.' },
  mushroom_soup: { id: 'mushroom_soup', n: 5, cookware: 'clay_pot', ingredients: ['mushrooms', 'herbs'], sell: 16, contentment: 12, name: 'Chyau Soup', hint: 'Earthy and green', flavor: 'Forest-floor soup with nettle greens.' },
  fish_congee: { id: 'fish_congee', n: 6, cookware: 'clay_pot', ingredients: ['any_fish', 'rice'], sell: 20, contentment: 14, name: 'Fish Jaulo', hint: 'Soft rice and something from the water', flavor: 'Jaulo is what grannies cook for tired campers.' },
  campfire_stew: { id: 'campfire_stew', n: 7, cookware: 'clay_pot', ingredients: ['any_fish', 'mushrooms', 'herbs'], sell: 30, contentment: 18, name: 'Campfire Jhol', hint: 'The woods and the water in one pot', flavor: 'Jhol means broth. Brothy, cozy, steamy.' },
  berry_pudding: { id: 'berry_pudding', n: 8, cookware: 'clay_pot', ingredients: ['rice', 'berries', 'honey'], sell: 24, contentment: 16, name: 'Ainselu Khir', hint: 'Dessert from the pot', flavor: 'Creamy rice pudding with golden berries.' },
  nutty_porridge: { id: 'nutty_porridge', n: 9, cookware: 'clay_pot', ingredients: ['rice', 'nuts', 'honey'], sell: 22, contentment: 14, name: 'Katus Porridge', hint: 'A crunchy breakfast', flavor: 'Sticky rice, honey and roasted katus.' },
  grilled_fish: { id: 'grilled_fish', n: 10, cookware: 'skillet', ingredients: ['any_fish'], sell: 'fishx1.5', contentment: 10, name: 'Tawa Fish', hint: 'Simple and smoky', flavor: 'Fish, fire, a pinch of salt. Perfect.' },
  herb_butter_fish: { id: 'herb_butter_fish', n: 11, cookware: 'skillet', ingredients: ['any_fish', 'herbs', 'spice'], sell: 30, contentment: 16, name: 'Timur Fish', hint: 'Fancy fish', flavor: 'Tingly timur and nettle butter. Very fancy.' },
  pancakes: { id: 'pancakes', n: 12, cookware: 'skillet', ingredients: ['flour', 'honey'], sell: 16, contentment: 12, name: 'Honey Malpua', hint: 'Flip, flip!', flavor: 'Syrupy hill pancakes, crisp at the edges.' },
  berry_pancakes: { id: 'berry_pancakes', n: 13, cookware: 'skillet', ingredients: ['flour', 'berries', 'honey'], sell: 22, contentment: 14, name: 'Ainselu Malpua', hint: 'Fluffy, with a sunny surprise', flavor: 'Malpua hiding sunny little berries.' },
  mushroom_skewers: { id: 'mushroom_skewers', n: 14, cookware: 'skillet', ingredients: ['mushrooms', 'spice'], sell: 14, contentment: 10, name: 'Chyau Sekuwa', hint: 'On a stick, over the flames', flavor: 'Sekuwa means skewers. Smoky and spicy.' },
  cloud_buns: { id: 'cloud_buns', n: 15, cookware: 'steamer', ingredients: ['flour', 'honey', 'nuts'], sell: 26, contentment: 16, name: 'Katus Tingmo', hint: 'Soft as a cloud', flavor: 'A swirly steamed bun, sweet with nuts.' },
  moon_dumplings: { id: 'moon_dumplings', n: 16, cookware: 'steamer', ingredients: ['flour', 'moon_blossom', 'night_glowfin'], sell: null, contentment: 25, name: 'Moonlight Momos', hint: 'The legend\'s favorite', flavor: 'Folded gently, steamed with moonlight. They glow a little.' },
};

export const RECIPE_ORDER = Object.values(RECIPES)
  .sort((a, b) => a.n - b.n)
  .map((r) => r.id);

/** Mystery Mush: not a recipe. */
export const MUSH = { id: 'mystery_mush' as DishId, sell: 2, contentment: 3, name: 'Mystery Mush', flavor: "It's... edible?" };

/** A dish never sells for less than this multiple of its ingredients' value. */
export const DISH_MIN_MULT = 1.25;
/** Cooking timings. */
export const COOKING = { cookSeconds: 2.5, stirCircles: 2, holdSeconds: 1.5, maxIngredients: 3, newRecipeContentment: 8 };
