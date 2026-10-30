/**
 * Item icons: every gear, pantry, fish, forage, dish, decor item plus the
 * Moon Scale, the copper rupee coin and the mini doko basket. Each is baked
 * once at boot as a 96 x 96 logical texture under iconKey(id) = 'item_<id>'.
 * Looks follow docs/WORLD.md section 7 (fish 7.3, forage 7.4, plate art 7.5)
 * and section 2 (coin art).
 *
 * Drawing lives in items-food.ts (fish, forage, pantry, dishes) and
 * items-gear.ts (gear, decor, specials); helpers in items-kit.ts.
 */
import type { Baker } from './kit';
import { DECOR_IDS, FISH_IDS, FORAGE_IDS, GEAR_IDS, PANTRY_IDS, RECIPE_IDS } from '@/data/ids';
import { FOOD_ICONS } from './items-food';
import { GEAR_ICONS } from './items-gear';
import type { Draw } from './items-kit';
import { P, A, shade, tint } from '@/palette';
import { fillOutline, rGrad } from './kit';

/** Logical size of every item icon texture. */
export const ICON_SIZE = 96;

/** Texture key for any item id (gear, pantry, fish, forage, recipe, 'mystery_mush', decor, 'moon_scale', 'coin', 'doko'). */
export function iconKey(id: string): string {
  return `item_${id}`;
}

/** Every icon id, grouped (used by the preview sheet). */
export const ICON_GROUPS: { group: string; ids: readonly string[] }[] = [
  { group: 'fish', ids: FISH_IDS },
  { group: 'forage', ids: FORAGE_IDS },
  { group: 'pantry', ids: PANTRY_IDS },
  { group: 'gear', ids: GEAR_IDS },
  { group: 'decor', ids: DECOR_IDS },
  { group: 'dishes', ids: [...RECIPE_IDS, 'mystery_mush'] },
  { group: 'special', ids: ['moon_scale', 'coin', 'doko'] },
];

export const ALL_ICON_IDS: string[] = ICON_GROUPS.flatMap((g) => [...g.ids]);

/** Soft fallback token (only used if an id has no drawing yet). */
const fallback: Draw = (ctx) => {
  ctx.beginPath();
  ctx.arc(48, 48, 30, 0, Math.PI * 2);
  fillOutline(ctx, rGrad(ctx, 48, 48, 0, 36, [[0, tint(A['lokta'], 0.4)], [1, A['lokta']]], 38, 36), shade(A['lokta'], 0.1));
  ctx.fillStyle = P.rose;
  ctx.beginPath();
  ctx.arc(48, 48, 8, 0, Math.PI * 2);
  ctx.fill();
};

export function drawIcon(ctx: CanvasRenderingContext2D, id: string): void {
  const fn = FOOD_ICONS[id] ?? GEAR_ICONS[id] ?? fallback;
  ctx.save();
  fn(ctx);
  ctx.restore();
}

export function bake(b: Baker): void {
  for (const id of ALL_ICON_IDS) {
    b.tex(iconKey(id), ICON_SIZE, ICON_SIZE, (ctx) => drawIcon(ctx, id));
  }
}
