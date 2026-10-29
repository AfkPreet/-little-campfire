/** Shop (spec section 5): fixed prices, buy gear/staples/decor, sell extras. */
import { bus } from '@/core/bus';
import { S, autosave, today } from '@/core/state';
import { DECOR, DECOR_ORDER } from '@/data/decor';
import type { DecorId, DishId, FishId, ForageId, GearId, PantryId, ShopTab, TentId } from '@/data/ids';
import { GEAR, PANTRY } from '@/data/items';
import { FISH } from '@/data/fish';
import { FORAGE } from '@/data/forage';
import { addMoney } from './inventory';
import { legendKnown } from './mystery';
import { bestRod } from './fishing';
import { refreshBaseline } from './contentment';

export type ShopItem =
  | { kind: 'gear'; id: GearId; price: number }
  | { kind: 'pantry'; id: PantryId; price: number }
  | { kind: 'decor'; id: DecorId; price: number };

const TENT_RANK: Record<TentId, number> = { leaf_tent: 1, dome_tent: 2, cabin_kit: 3 };

export function itemsFor(tab: ShopTab): ShopItem[] {
  if (tab === 'pantry') return (Object.keys(PANTRY) as PantryId[]).map((id) => ({ kind: 'pantry', id, price: PANTRY[id].price }));
  if (tab === 'cozy')
    return DECOR_ORDER.filter((id) => DECOR[id].price !== null).map((id) => ({ kind: 'decor', id, price: DECOR[id].price! }));
  if (tab === 'sell') return [];
  return (Object.keys(GEAR) as GearId[])
    .filter((id) => GEAR[id].tab === tab && (!GEAR[id].needsClue || legendKnown()))
    .map((id) => ({ kind: 'gear', id, price: GEAR[id].price }));
}

/** One-time items show "Owned". Bait, staples are consumables. */
export function owned(item: ShopItem): boolean {
  const s = S();
  if (item.kind === 'pantry') return false;
  if (item.kind === 'decor') return (s.decor[item.id] ?? 0) > 0 || s.camp.placed.some((p) => p.id === item.id);
  if (item.id === 'wiggly_bait' || item.id === 'sparkle_bait') return false;
  if (item.id in { leaf_tent: 1, dome_tent: 1, cabin_kit: 1 }) {
    // A smaller tent counts as owned once a bigger one is bought.
    const t = s.camp.tent ?? ownedTent();
    return !!s.gear[item.id] || (t !== null && TENT_RANK[t] >= TENT_RANK[item.id as TentId]);
  }
  return !!s.gear[item.id];
}

export function ownedTent(): TentId | null {
  const g = S().gear;
  if (g.cabin_kit) return 'cabin_kit';
  if (g.dome_tent) return 'dome_tent';
  if (g.leaf_tent) return 'leaf_tent';
  return null;
}

export function canAfford(item: ShopItem): boolean {
  return S().money >= item.price;
}

export function buy(item: ShopItem): 'ok' | 'owned' | 'poor' {
  const s = S();
  if (owned(item)) return 'owned';
  if (!canAfford(item)) return 'poor';
  addMoney(-item.price);
  if (item.kind === 'pantry') s.pantry[item.id] = (s.pantry[item.id] ?? 0) + 1;
  else if (item.kind === 'decor') s.decor[item.id] = (s.decor[item.id] ?? 0) + 1;
  else {
    const id = item.id;
    if (id === 'wiggly_bait') s.bait.wiggly += GEAR[id].pack ?? 5;
    else if (id === 'sparkle_bait') s.bait.sparkle += GEAR[id].pack ?? 3;
    else {
      s.gear[id] = true;
      if (id === 'bamboo_rod' || id === 'willow_rod' || id === 'moonlight_rod') s.rod = bestRod();
      if (id === 'leaf_tent' || id === 'dome_tent' || id === 'cabin_kit') {
        // Bigger tent swaps in place if one is already pitched.
        if (s.camp.pitched && s.camp.tent && TENT_RANK[id] > TENT_RANK[s.camp.tent]) {
          s.camp.tent = id;
          refreshBaseline();
        }
      }
    }
  }
  bus.emit('inventory:changed', {});
  autosave('buy');
  return 'ok';
}

/** Day-1 essentials: a tent, a rod and one cookware. Returns what's missing. */
export function missingEssentials(): ('tent' | 'rod' | 'cookware')[] {
  const g = S().gear;
  const out: ('tent' | 'rod' | 'cookware')[] = [];
  if (!g.leaf_tent && !g.dome_tent && !g.cabin_kit) out.push('tent');
  if (!g.bamboo_rod && !g.willow_rod && !g.moonlight_rod) out.push('rod');
  if (!g.kettle && !g.clay_pot && !g.skillet && !g.steamer) out.push('cookware');
  return out;
}

export function isEssential(item: ShopItem): boolean {
  return item.kind === 'gear' && !!GEAR[item.id].essential && S().day === 1;
}

// --- Selling -----------------------------------------------------------------

export type SellRow =
  | { kind: 'fish'; id: FishId; n: number; price: number }
  | { kind: 'forage'; id: ForageId; n: number; price: number }
  | { kind: 'dish'; id: DishId; n: number; price: number };

export function sellRows(): SellRow[] {
  const s = S();
  const rows: SellRow[] = [];
  for (const [id, n] of Object.entries(s.fish) as [FishId, number][]) if (n > 0) rows.push({ kind: 'fish', id, n, price: FISH[id].sell });
  for (const [id, n] of Object.entries(s.forage) as [ForageId, number][]) {
    const p = FORAGE[id].sell;
    if (n > 0 && p !== null) rows.push({ kind: 'forage', id, n, price: p });
  }
  const dishes = new Map<string, { id: DishId; n: number; price: number }>();
  for (const d of s.dishes) {
    if (d.id === 'moon_dumplings') continue; // not sellable
    const k = `${d.id}:${d.value}`;
    const e = dishes.get(k);
    if (e) e.n++;
    else dishes.set(k, { id: d.id, n: 1, price: d.value });
  }
  for (const e of dishes.values()) rows.push({ kind: 'dish', ...e });
  return rows;
}

export function sell(row: SellRow, qty: number): number {
  const s = S();
  const n = Math.max(0, Math.min(qty, row.n));
  if (n === 0) return 0;
  if (row.kind === 'fish') s.fish[row.id] = (s.fish[row.id] ?? 0) - n;
  else if (row.kind === 'forage') s.forage[row.id] = (s.forage[row.id] ?? 0) - n;
  else {
    let left = n;
    for (let i = s.dishes.length - 1; i >= 0 && left > 0; i--) {
      if (s.dishes[i].id === row.id && s.dishes[i].value === row.price) {
        s.dishes.splice(i, 1);
        left--;
      }
    }
  }
  const earned = n * row.price;
  addMoney(earned);
  today().sold += earned;
  bus.emit('inventory:changed', {});
  autosave('sell');
  return earned;
}
