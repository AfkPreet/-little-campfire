/**
 * Debug state presets and URL overrides (spec section 10):
 * ?state=fresh|midtrip|decorated|finale, ?time=, ?weather=, ?day=, ?seed=.
 */
import { param } from '@/core/debug';
import { freshState, newDayLog, setState, S, type GameState } from '@/core/state';
import { TIME_PRESETS } from '@/data/time';
import type { WeatherKind } from '@/data/ids';
import { resetForDawn } from '@/systems/contentment';
import { rollWeatherForDay } from '@/systems/weather';

function seedParam(): number | undefined {
  const s = param('seed');
  return s ? Number(s) >>> 0 : undefined;
}

export function presetFresh(): GameState {
  const s = freshState(seedParam());
  return s;
}

export function presetMidtrip(): GameState {
  const s = freshState(seedParam() ?? 7);
  s.day = 3;
  s.p = 0.3;
  s.scene = 'camp';
  s.money = 86;
  s.gear = { dome_tent: true, bamboo_rod: true, willow_rod: true, kettle: true, clay_pot: true, skillet: true };
  s.rod = 'willow_rod';
  s.bait = { wiggly: 3, sparkle: 1 };
  s.pantry = { rice: 2, flour: 1, tea: 2, honey: 2, spice: 1 };
  s.forage = { berries: 3, mushrooms: 2, herbs: 3, nuts: 1 };
  s.fish = { pebble_minnow: 2, bubble_carp: 1, blushing_trout: 1 };
  s.dishes = [{ id: 'honey_tea', value: 14 }];
  s.camp = { tentSpot: 1, tent: 'dome_tent', pegs: [true, true, true, true], pitched: true, placed: [{ id: 'paper_lantern', point: 'tent:0' }], placedOnce: ['paper_lantern'] };
  s.decor = { potted_flower: 1 };
  s.journal.fish = {
    pebble_minnow: { caught: 4, bestCm: 9.1, firstDay: 1, firstTrip: 1 },
    bubble_carp: { caught: 2, bestCm: 24.5, firstDay: 1, firstTrip: 1 },
    blushing_trout: { caught: 1, bestCm: 27.2, firstDay: 2, firstTrip: 1 },
    rain_loach: { caught: 1, bestCm: 17.8, firstDay: 2, firstTrip: 1 },
  };
  s.journal.recipes = {
    herb_tea: { cooked: 2, firstDay: 1, firstTrip: 1 },
    honey_tea: { cooked: 1, firstDay: 2, firstTrip: 1 },
    grilled_fish: { cooked: 2, firstDay: 1, firstTrip: 1 },
    mushroom_soup: { cooked: 1, firstDay: 2, firstTrip: 1 },
  };
  s.journal.clues = [true, false, false, false, false];
  s.mystery.step = 1;
  s.weather.hadRainyNight = true;
  s.companion.shareDays = [2];
  s.days = [
    { ...newDayLog(1, 'clear'), peak: 38, fishCaught: 3, cooked: { herb_tea: 1, grilled_fish: 1 }, newRecipes: ['herb_tea', 'grilled_fish'], newFish: ['pebble_minnow', 'bubble_carp'], bestCatch: { id: 'bubble_carp', cm: 24.5 } },
    { ...newDayLog(2, 'rain'), rainyNight: true, peak: 56, fishCaught: 4, cooked: { honey_tea: 1, mushroom_soup: 1, herb_tea: 1 }, newRecipes: ['honey_tea', 'mushroom_soup'], newFish: ['blushing_trout', 'rain_loach'], shared: true, bestCatch: { id: 'rain_loach', cm: 17.8 } },
    newDayLog(3, 'clear'),
  ];
  s.contentment = { value: 46, baseline: 17, fireSecs: 0, fireGained: 0, rainSecs: 0, rainGained: 0, blissfulToday: false };
  s.flags.introSeen = true;
  return s;
}

export function presetDecorated(): GameState {
  const s = presetMidtrip();
  s.camp.placed = [
    { id: 'paper_lantern', point: 'tent:0' },
    { id: 'wind_chime', point: 'tent:3' },
    { id: 'bunting', point: 'tent:1' },
    { id: 'string_lights', point: 'span:0' },
    { id: 'floor_cushion', point: 'ground:4' },
    { id: 'potted_flower', point: 'ground:0' },
    { id: 'woven_rug', point: 'ground:3' },
    { id: 'bookshelf', point: 'ground:2' },
    { id: 'hammock', point: 'trees' },
  ];
  s.camp.placedOnce = s.camp.placed.map((p) => p.id);
  s.decor = {};
  s.contentment.value = 62;
  return s;
}

export function presetFinale(): GameState {
  const s = presetDecorated();
  s.day = 6;
  s.p = 1;
  s.money = 140;
  s.gear.steamer = true;
  s.mystery = { step: 4, scaleOnShore: false, hasScale: true, glowTonight: true };
  s.journal.clues = [true, true, true, true, false];
  s.journal.recipes.moon_dumplings = { cooked: 1, firstDay: 6, firstTrip: 1 };
  s.dishes = [{ id: 'moon_dumplings', value: 0 }];
  s.weather = { ...s.weather, today: 'rain', raining: true, hadRainyNight: true, lastNightRainy: false, mist: 0 };
  s.contentment.value = 78;
  s.companion = { shareDays: [2, 4, 5], befriended: true, seenToday: true };
  s.journal.friend = true;
  for (let d = 4; d <= 6; d++) s.days.push({ ...newDayLog(d, d === 6 ? 'rain' : 'clear'), peak: 50 + d * 4, fishCaught: d, rainyNight: d === 6 });
  return s;
}

/** Apply ?state= then ?day=, ?time=, ?weather= overrides. Returns true if anything applied. */
export function applyDebugParams(): boolean {
  let applied = false;
  const st = param('state');
  if (st) {
    const s = st === 'midtrip' ? presetMidtrip() : st === 'decorated' ? presetDecorated() : st === 'finale' ? presetFinale() : presetFresh();
    setState(s);
    if (st === 'fresh') {
      resetForDawn();
    }
    applied = true;
  }
  const day = param('day');
  if (day) {
    S().day = Math.max(1, Number(day) || 1);
    applied = true;
  }
  const weather = param('weather') as WeatherKind | 'mist' | null;
  if (weather) {
    const w = S().weather;
    if (weather === 'rain' || weather === 'clear' || weather === 'mist' || weather === 'golden') {
      w.today = weather;
      w.raining = weather === 'rain';
      w.mist = weather === 'mist' ? 1 : 0;
      w.change = null;
      w.rainAtDusk = false;
    } else rollWeatherForDay(S().day);
    applied = true;
  }
  const time = param('time');
  if (time && time in TIME_PRESETS) {
    S().p = TIME_PRESETS[time];
    applied = true;
  }
  return applied;
}
