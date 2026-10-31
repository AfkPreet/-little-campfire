/**
 * window.__game helpers (dev builds or ?debug=1) so scripts can drive the
 * game: buy, pitch, fish, forage, cook, eat, sleep, set time/weather, read
 * state. Scenes register extra scene-level helpers (goto, playFinale, ...).
 */
import { bus } from '@/core/bus';
import { registerDebug } from '@/core/debug';
import { S, save } from '@/core/state';
import type { CookwareId, DecorId, ForageSpotId, GearId, IngredientId, PantryId } from '@/data/ids';
import { TIME_PRESETS } from '@/data/time';
import { chooseTentSpot, place, tapPeg } from '@/systems/camp';
import { cook, eat, saveDish } from '@/systems/cooking';
import { keepFish, landCatch, releaseFish, rollFish, startCast } from '@/systems/fishing';
import { pick } from '@/systems/forage';
import { addMoney } from '@/systems/inventory';
import { buy, itemsFor } from '@/systems/shop';
import { setProgress } from '@/systems/day';
import { gain } from '@/systems/contentment';
import { DECOR } from '@/data/decor';
import { GEAR, PANTRY } from '@/data/items';

let installed = false;

export function installHooks(): void {
  if (installed) return;
  installed = true;

  registerDebug('state', () => JSON.parse(JSON.stringify(S())));
  registerDebug('money', ((n = 500) => addMoney(n)) as never);

  registerDebug('buy', ((id: string) => {
    if (id in GEAR) return buy({ kind: 'gear', id: id as GearId, price: GEAR[id as GearId].price });
    if (id in PANTRY) return buy({ kind: 'pantry', id: id as PantryId, price: PANTRY[id as PantryId].price });
    if (id in DECOR && DECOR[id as DecorId].price !== null) return buy({ kind: 'decor', id: id as DecorId, price: DECOR[id as DecorId].price! });
    return 'unknown';
  }) as never);

  registerDebug('shopItems', ((tab: string) => itemsFor(tab as never)) as never);

  registerDebug('pitch', ((spot = 0) => {
    chooseTentSpot(spot);
    let done = false;
    for (let i = 0; i < 4; i++) done = tapPeg(i);
    bus.emit('state:changed', { reason: 'pitch' });
    return done;
  }) as never);

  registerDebug('fish', ((keep = true) => {
    const cast = startCast();
    if (!cast) return null;
    const c = rollFish(cast.bait);
    landCatch(c);
    if (keep) keepFish(c);
    else releaseFish(c);
    bus.emit('state:changed', { reason: 'fish' });
    return c;
  }) as never);

  registerDebug('forage', ((spot: ForageSpotId) => {
    const r = pick(spot);
    bus.emit('state:changed', { reason: 'forage' });
    return r;
  }) as never);

  registerDebug('cook', ((cookware: CookwareId, ings: IngredientId[], then: 'eat' | 'save' = 'eat') => {
    const r = cook(cookware, ings);
    if (!r) return null;
    if (then === 'eat') eat(r.dish);
    else saveDish(r.dish);
    bus.emit('state:changed', { reason: 'cook' });
    return { name: r.name, isNew: r.isNew, recipe: r.recipe?.id ?? null };
  }) as never);

  registerDebug('place', ((id: DecorId, point: string) => {
    const ok = place(id, point);
    bus.emit('state:changed', { reason: 'place' });
    return ok;
  }) as never);

  registerDebug('setTime', ((t: string | number) => {
    const p = typeof t === 'number' ? t : TIME_PRESETS[t] ?? 0.3;
    setProgress(p);
    bus.emit('state:changed', { reason: 'time' });
  }) as never);

  registerDebug('setRain', ((on: boolean) => {
    S().weather.raining = on;
    bus.emit('weather:rain', { raining: on });
  }) as never);

  registerDebug('content', ((n: number) => gain(n, 'debug')) as never);

  // Fast-forward the night timer (glow, moments); slow test machines tick it at a few fps.
  registerDebug('skipNight', ((sec = 15) => {
    S().nightSecs += sec;
  }) as never);

  registerDebug('save', () => save('debug'));
}
