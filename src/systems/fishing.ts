/**
 * Fishing logic (spec section 5). The Camp scene drives the visuals; this
 * module decides waits, nibbles, bites and catches.
 */
import { S, autosave, rng, today } from '@/core/state';
import { FISH, FISHING, GOLDEN_CHANCE, RARITY_WEIGHT, SIZE_VARIANCE, type FishDef } from '@/data/fish';
import type { FishId, RodId } from '@/data/ids';
import { BAIT, RODS } from '@/data/items';
import { DAYTIME, DUSK, MISTY_DAWN } from '@/data/time';
import { gain } from './contentment';
import { add } from './inventory';
import { recordFish } from './journal';
import { triggerMoment } from './moments';

export interface Cast {
  /** Seconds until the real bite. */
  wait: number;
  /** Times (s from cast) of fake nibbles, all before the bite. */
  nibbles: number[];
  /** Bite window (s). */
  window: number;
  bait: 'none' | 'wiggly' | 'sparkle';
}

export interface Catch {
  id: FishId;
  cm: number;
  isNew: boolean;
  stars: number;
  golden: boolean;
}

export function currentRod(): RodId | null {
  return S().rod;
}

/** Best owned rod. */
export function bestRod(): RodId | null {
  const g = S().gear;
  if (g.moonlight_rod) return 'moonlight_rod';
  if (g.willow_rod) return 'willow_rod';
  if (g.bamboo_rod) return 'bamboo_rod';
  return null;
}

export function inSeason(f: FishDef, p = S().p): boolean {
  const s = S();
  switch (f.when) {
    case 'any':
      return true;
    case 'day':
      return p >= DAYTIME.from && p < DAYTIME.to;
    case 'dusk':
      return p >= DUSK.from && p < 1;
    case 'night':
      return p >= 1;
    case 'rain':
      return s.weather.raining;
    case 'mistyDawn':
      return s.weather.today === 'mist' && p < MISTY_DAWN.to;
    case 'special':
      return false;
  }
}

/** Fish that can bite right now with this rod (Golden Whisker excluded: separate roll). */
export function biteTable(rod: RodId): FishDef[] {
  const sturdy = RODS[rod].sturdy;
  return Object.values(FISH).filter((f) => inSeason(f) && (!f.sturdy || sturdy));
}

/** Is a sturdy-only fish in season that this rod can't catch? */
export function needsBetterRod(rod: RodId): boolean {
  if (RODS[rod].sturdy) return false;
  return Object.values(FISH).some((f) => f.sturdy && inSeason(f));
}

/** Start a cast: consumes one bait if selected; returns timings. */
export function startCast(): Cast | null {
  const s = S();
  const rod = s.rod;
  if (!rod) return null;
  const r = rng('fish');
  let bait = s.baitSelected;
  if (bait === 'wiggly' && s.bait.wiggly <= 0) bait = 'none';
  if (bait === 'sparkle' && s.bait.sparkle <= 0) bait = 'none';
  if (bait !== 'none') s.bait[bait]--;
  if (bait !== 'none' && s.bait[bait] <= 0) s.baitSelected = 'none';
  const waitMult = bait === 'none' ? 1 : BAIT[bait].waitMult;
  const wait = r.range(FISHING.waitMin, FISHING.waitMax) * waitMult;
  const nn = r.int(0, FISHING.fakeNibblesMax);
  const nibbles: number[] = [];
  for (let i = 0; i < nn; i++) nibbles.push(r.range(0.9, Math.max(1, wait - 0.7)));
  nibbles.sort((a, b) => a - b);

  if (needsBetterRod(rod)) s.castsWithoutRod++;
  autosave('cast');
  return { wait, nibbles, window: RODS[rod].window, bait };
}

/** Should the rod hint show now (after 3 casts with a sturdy-only fish in season)? */
export function takeRodHint(): boolean {
  const s = S();
  if (!s.rod || s.castsWithoutRod < FISHING.rodHintCasts) return false;
  const key = `rodHint${s.day}`;
  if (s.flags[key]) return false;
  s.flags[key] = true;
  s.castsWithoutRod = 0;
  return true;
}

/** Decide which fish bit (called when the bite is hooked). */
export function rollFish(bait: Cast['bait']): Catch {
  const s = S();
  const rod = s.rod ?? 'bamboo_rod';
  const r = rng('fish');
  let def: FishDef;
  let golden = false;
  if (r.chance(GOLDEN_CHANCE)) {
    def = FISH.golden_whisker;
    golden = true;
  } else {
    const rareMult = RODS[rod].rareMult * (bait === 'sparkle' ? BAIT.sparkle.rareMult : 1);
    const table = biteTable(rod);
    def = r.weighted(table, (f) => RARITY_WEIGHT[f.rarity] * (f.rarity === 'rare' ? rareMult : 1));
  }
  const cm = Math.round(def.cm * (1 + r.range(-SIZE_VARIANCE, SIZE_VARIANCE)) * 10) / 10;
  const stars = def.rarity === 'common' ? 1 : def.rarity === 'uncommon' ? 2 : 3;
  const isNew = !S().journal.fish[def.id];
  return { id: def.id, cm, isNew, stars, golden };
}

/** Commit a hooked fish: journal, day log, new-species contentment, golden moment. */
export function landCatch(c: Catch): void {
  const d = today();
  d.fishCaught++;
  if (!d.bestCatch || FISH[c.id].sell > FISH[d.bestCatch.id].sell || (c.id === d.bestCatch.id && c.cm > d.bestCatch.cm)) {
    d.bestCatch = { id: c.id, cm: c.cm };
  }
  const isNew = recordFish(c.id, c.cm);
  if (isNew) {
    d.newFish.push(c.id);
    gain(FISHING.newSpeciesContentment, 'newFish');
  }
  if (c.golden) triggerMoment('golden_whisker');
}

export function keepFish(c: Catch): void {
  add(c.id, 1);
}

export function releaseFish(_c: Catch): void {
  gain(FISHING.releaseContentment, 'release');
  autosave('release');
}
