/** Money, items and sell values. */
import { bus } from '@/core/bus';
import { S, autosave } from '@/core/state';
import { FISH } from '@/data/fish';
import { FORAGE } from '@/data/forage';
import type { DishId, FishId, ForageId, IngredientId, PantryId } from '@/data/ids';
import { FISH_IDS, FORAGE_IDS, PANTRY_IDS } from '@/data/ids';
import { PANTRY } from '@/data/items';
import { MUSH, RECIPES } from '@/data/recipes';

export function money(): number {
  return S().money;
}

export function addMoney(delta: number): void {
  const s = S();
  s.money = Math.max(0, s.money + delta);
  bus.emit('money:changed', { money: s.money, delta });
  autosave('money');
}

export function isFish(id: string): id is FishId {
  return (FISH_IDS as readonly string[]).includes(id);
}
export function isForage(id: string): id is ForageId {
  return (FORAGE_IDS as readonly string[]).includes(id);
}
export function isPantry(id: string): id is PantryId {
  return (PANTRY_IDS as readonly string[]).includes(id);
}

export function count(id: IngredientId): number {
  const s = S();
  if (isFish(id)) return s.fish[id] ?? 0;
  if (isForage(id)) return s.forage[id] ?? 0;
  return s.pantry[id as PantryId] ?? 0;
}

export function add(id: IngredientId, n = 1): void {
  const s = S();
  if (isFish(id)) s.fish[id] = (s.fish[id] ?? 0) + n;
  else if (isForage(id)) s.forage[id] = (s.forage[id] ?? 0) + n;
  else s.pantry[id as PantryId] = (s.pantry[id as PantryId] ?? 0) + n;
  bus.emit('inventory:changed', {});
  autosave('inventory');
}

export function remove(id: IngredientId, n = 1): boolean {
  if (count(id) < n) return false;
  add(id, -n);
  return true;
}

/** Everything that can go in the cooking basket, with counts. */
export function basket(): { id: IngredientId; n: number }[] {
  const out: { id: IngredientId; n: number }[] = [];
  for (const id of PANTRY_IDS) if (count(id) > 0) out.push({ id, n: count(id) });
  for (const id of FORAGE_IDS) if (count(id) > 0) out.push({ id, n: count(id) });
  for (const id of FISH_IDS) if (count(id) > 0) out.push({ id, n: count(id) });
  return out;
}

/** Value of an ingredient for the dish-price floor (staples at shop price). */
export function ingredientValue(id: IngredientId): number {
  if (isFish(id)) return FISH[id].sell;
  if (isForage(id)) return FORAGE[id].sell ?? 0;
  return PANTRY[id as PantryId].price;
}

/** Sell price of a raw item (null = not sellable). */
export function sellPrice(id: IngredientId): number | null {
  if (isFish(id)) return FISH[id].sell;
  if (isForage(id)) return FORAGE[id].sell;
  return null; // staples are not sold back
}

export function dishName(id: DishId): string {
  return id === 'mystery_mush' ? MUSH.name : RECIPES[id].name;
}

export function hasAnyDish(): boolean {
  return S().dishes.length > 0;
}

/** Group dishes by id+value for display. */
export function dishStacks(): { id: DishId; value: number; n: number; index: number }[] {
  const map = new Map<string, { id: DishId; value: number; n: number; index: number }>();
  S().dishes.forEach((d, i) => {
    const k = `${d.id}:${d.value}`;
    const e = map.get(k);
    if (e) e.n++;
    else map.set(k, { id: d.id, value: d.value, n: 1, index: i });
  });
  return [...map.values()];
}
