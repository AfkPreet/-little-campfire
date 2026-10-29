/** Journal stamps (spec section 5): 8 fish + 16 recipes + 6 moments + 1 friend + 5 clues = 36. */
import { bus } from '@/core/bus';
import { S, autosave } from '@/core/state';
import type { FishId, MomentId, RecipeId } from '@/data/ids';
import { FISH_IDS, MOMENT_IDS, RECIPE_IDS } from '@/data/ids';

export const TOTAL_STAMPS = FISH_IDS.length + RECIPE_IDS.length + MOMENT_IDS.length + 1 + 5;
export const HAPPY_CAMPER_STAMPS = 20;

export function stampCount(): number {
  const j = S().journal;
  return (
    Object.keys(j.fish).length +
    Object.keys(j.recipes).length +
    Object.keys(j.moments).length +
    (j.friend ? 1 : 0) +
    j.clues.filter(Boolean).length
  );
}

function afterStamp(tab: string, id: string): void {
  const j = S().journal;
  bus.emit('journal:stamp', { tab, id });
  if (!j.badges.happyCamper && stampCount() >= HAPPY_CAMPER_STAMPS) {
    j.badges.happyCamper = true;
    bus.emit('journal:stamp', { tab: 'badge', id: 'happyCamper' });
  }
  autosave('journal');
}

/** Record a catch; returns true if it is a new species. */
export function recordFish(id: FishId, cm: number): boolean {
  const s = S();
  const e = s.journal.fish[id];
  if (e) {
    e.caught++;
    e.bestCm = Math.max(e.bestCm, cm);
    autosave('journal');
    return false;
  }
  s.journal.fish[id] = { caught: 1, bestCm: cm, firstDay: s.day, firstTrip: s.trip };
  afterStamp('fish', id);
  return true;
}

export function recordRecipe(id: RecipeId): boolean {
  const s = S();
  const e = s.journal.recipes[id];
  if (e) {
    e.cooked++;
    autosave('journal');
    return false;
  }
  s.journal.recipes[id] = { cooked: 1, firstDay: s.day, firstTrip: s.trip };
  afterStamp('recipes', id);
  return true;
}

export function recordMoment(id: MomentId): boolean {
  const s = S();
  const e = s.journal.moments[id];
  if (e) {
    e.count++;
    autosave('journal');
    return false;
  }
  s.journal.moments[id] = { day: s.day, trip: s.trip, count: 1 };
  afterStamp('moments', id);
  return true;
}

export function recordFriend(): void {
  const j = S().journal;
  if (j.friend) return;
  j.friend = true;
  afterStamp('friends', 'companion');
}

/** Clue n is 1..5. */
export function recordClue(n: number): boolean {
  const j = S().journal;
  if (j.clues[n - 1]) return false;
  j.clues[n - 1] = true;
  afterStamp('mystery', String(n));
  if (n === 5) j.badges.guardianFriend = true;
  return true;
}

export function knowsFish(id: FishId): boolean {
  return !!S().journal.fish[id];
}
export function knowsRecipe(id: RecipeId): boolean {
  return !!S().journal.recipes[id];
}
