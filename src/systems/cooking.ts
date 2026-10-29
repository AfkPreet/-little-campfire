/**
 * Cooking (spec section 5): cookware + exact ingredient set (order ignored),
 * "Any fish" accepts any species; no match makes Mystery Mush.
 */
import { S, autosave, today, type DishItem } from '@/core/state';
import { FISH } from '@/data/fish';
import type { CookwareId, DishId, IngredientId, RecipeId } from '@/data/ids';
import { DISH_MIN_MULT, MUSH, RECIPES, COOKING, type RecipeDef } from '@/data/recipes';
import { gain } from './contentment';
import { ingredientValue, isFish, remove } from './inventory';
import { recordRecipe } from './journal';
import { onDumplingsCooked } from './mystery';

export function ownedCookware(): CookwareId[] {
  const g = S().gear;
  return (['kettle', 'clay_pot', 'skillet', 'steamer'] as CookwareId[]).filter((c) => g[c]);
}

/** Find the recipe matching cookware + ingredients, or null. */
export function match(cookware: CookwareId, ings: IngredientId[]): RecipeDef | null {
  for (const r of Object.values(RECIPES)) {
    if (r.cookware !== cookware || r.ingredients.length !== ings.length) continue;
    const pool = [...ings];
    let ok = true;
    // Explicit ingredients first, then 'any_fish' slots.
    const ordered = [...r.ingredients].sort((a, b) => (a === 'any_fish' ? 1 : 0) - (b === 'any_fish' ? 1 : 0));
    for (const need of ordered) {
      const i = need === 'any_fish' ? pool.findIndex((x) => isFish(x)) : pool.indexOf(need);
      if (i < 0) {
        ok = false;
        break;
      }
      pool.splice(i, 1);
    }
    if (ok && pool.length === 0) return r;
  }
  return null;
}

/** Dish sell value: listed price, never below 1.25x ingredients' value. */
export function dishValue(r: RecipeDef, ings: IngredientId[]): number {
  if (r.sell === null) return 0;
  const fish = ings.find((i) => isFish(i));
  const listed = r.sell === 'fishx1.5' ? Math.round((fish ? FISH[fish as keyof typeof FISH].sell : 0) * 1.5) : r.sell;
  const floor = Math.ceil(ings.reduce((s, i) => s + ingredientValue(i), 0) * DISH_MIN_MULT);
  return Math.max(listed, floor);
}

export interface CookResult {
  dish: DishItem;
  recipe: RecipeDef | null;
  isNew: boolean;
  name: string;
}

/** Cook: consumes ingredients, creates the dish (in hand, not yet eaten/saved). */
export function cook(cookware: CookwareId, ings: IngredientId[]): CookResult | null {
  // Check availability first (counts of duplicates).
  const need = new Map<IngredientId, number>();
  for (const i of ings) need.set(i, (need.get(i) ?? 0) + 1);
  for (const [i, n] of need) {
    const s = S();
    const have = isFish(i) ? s.fish[i] ?? 0 : (s.forage as Record<string, number>)[i] ?? (s.pantry as Record<string, number>)[i] ?? 0;
    if (have < n) return null;
  }
  for (const [i, n] of need) remove(i, n);

  const r = match(cookware, ings);
  const d = today();
  if (!r) {
    S().journal.mushMade++;
    const dish: DishItem = { id: MUSH.id, value: MUSH.sell };
    d.cooked.mystery_mush = (d.cooked.mystery_mush ?? 0) + 1;
    autosave('cook');
    return { dish, recipe: null, isNew: false, name: MUSH.name };
  }
  const fish = ings.find((i) => isFish(i));
  const dish: DishItem = { id: r.id, value: dishValue(r, ings), fish: fish as DishItem['fish'] };
  d.cooked[r.id] = (d.cooked[r.id] ?? 0) + 1;
  const isNew = recordRecipe(r.id);
  if (isNew) {
    d.newRecipes.push(r.id);
    gain(COOKING.newRecipeContentment, 'newRecipe');
  }
  if (r.id === 'moon_dumplings') onDumplingsCooked();
  autosave('cook');
  return { dish, recipe: r, isNew, name: r.name };
}

export function contentmentOf(id: DishId): number {
  return id === 'mystery_mush' ? MUSH.contentment : RECIPES[id as RecipeId].contentment;
}

/** Eat a dish (fresh from the pot, or from the backpack). */
export function eat(dish: DishItem): number {
  takeFromBackpack(dish);
  return gain(contentmentOf(dish.id), 'eat');
}

/** Keep the dish in the backpack. */
export function saveDish(dish: DishItem): void {
  if (!S().dishes.includes(dish)) S().dishes.push(dish);
  autosave('saveDish');
}

/** Remove a dish instance from the backpack if it is there (no-op for a dish in hand). */
export function takeFromBackpack(dish: DishItem): void {
  const arr = S().dishes;
  const i = arr.indexOf(dish);
  if (i >= 0) arr.splice(i, 1);
  autosave('dish');
}
