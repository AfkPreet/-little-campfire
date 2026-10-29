/** Foraging (spec section 5): 7 spots, 1-3 items, regrow overnight. */
import { S, autosave, rng, today } from '@/core/state';
import { FORAGE, FORAGE_SPOTS } from '@/data/forage';
import type { ForageId, ForageSpotId } from '@/data/ids';
import { add } from './inventory';
import { legendKnown } from './mystery';

/** Is this spot visible at all right now (moon spot: night + clue 3)? */
export function spotVisible(id: ForageSpotId): boolean {
  const s = S();
  const item = FORAGE[FORAGE_SPOTS[id].item];
  if (item.needsClue && !legendKnown()) return false;
  if (item.when === 'night' && s.p < 1) return false;
  return true;
}

/** Can it be picked now (not picked today, right time of day)? */
export function spotReady(id: ForageSpotId): boolean {
  const s = S();
  if (!spotVisible(id)) return false;
  const st = s.forageSpots[id];
  if (st && st.pickedDay >= s.day) return false;
  const item = FORAGE[FORAGE_SPOTS[id].item];
  // "Day" forage: dawn through dusk (not at night).
  if (item.when === 'day' && s.p >= 1) return false;
  return true;
}

export function pick(id: ForageSpotId): { item: ForageId; n: number } | null {
  if (!spotReady(id)) return null;
  const s = S();
  const def = FORAGE_SPOTS[id];
  let n = rng('forage').int(def.min, def.max);
  if (FORAGE[def.item].rainBonus && s.weather.lastNightRainy) n *= 2;
  s.forageSpots[id] = { pickedDay: s.day };
  add(def.item, n);
  today().foraged += n;
  autosave('forage');
  return { item: def.item, n };
}
