/**
 * The one typed GameState store (spec section 10). Saved to localStorage under
 * a versioned key with migrations; autosaved after meaningful actions and on
 * visibilitychange/pagehide.
 */
import { SAVE_KEY } from '@/config';
import { bus } from '@/core/bus';
import { hashSeed, newSeed, Rng, type StreamName } from '@/core/rng';
import type {
  DecorId,
  DishId,
  FishId,
  ForageId,
  ForageSpotId,
  GearId,
  MomentId,
  PantryId,
  RecipeId,
  TentId,
  WeatherKind,
} from '@/data/ids';

export const SAVE_VERSION = 1;

export interface DishItem {
  id: DishId;
  /** Sell value fixed at cook time (depends on the fish used). */
  value: number;
  /** Fish species used, if any (for flavour + album). */
  fish?: FishId;
}

export interface PlacedDecor {
  id: DecorId;
  /** Snap point id (see data/camp.ts). String lights use "a|b". */
  point: string;
}

export interface DayLog {
  day: number;
  weather: WeatherKind;
  rainyNight: boolean;
  peak: number;
  fishCaught: number;
  bestCatch?: { id: FishId; cm: number };
  cooked: Partial<Record<DishId, number>>;
  newRecipes: RecipeId[];
  newFish: FishId[];
  moments: MomentId[];
  shared: boolean;
  foraged: number;
  sold: number;
  notes: string[];
}

export interface JournalState {
  fish: Partial<Record<FishId, { caught: number; bestCm: number; firstDay: number; firstTrip: number }>>;
  recipes: Partial<Record<RecipeId, { cooked: number; firstDay: number; firstTrip: number }>>;
  moments: Partial<Record<MomentId, { day: number; trip: number; count: number }>>;
  /** Companion befriended stamp. */
  friend: boolean;
  /** Mystery clues 1..5 found (index 0..4). */
  clues: boolean[];
  badges: { happyCamper: boolean; guardianFriend: boolean };
  /** Archived trips (for album covers / new trip). */
  trips: { trip: number; days: DayLog[]; metGuardian: boolean }[];
  mushMade: number;
}

export interface WeatherState {
  today: WeatherKind;
  /** Is it raining right now. */
  raining: boolean;
  /** Mid-day change: at progress p, rain starts/stops. */
  change: { p: number; to: boolean } | null;
  /** Force rain to begin at dusk today (Night 4 / mystery guarantee). */
  rainAtDusk: boolean;
  hadRainyNight: boolean;
  /** Was last night rainy (for rainbow, scale). */
  lastNightRainy: boolean;
  /** Next night must rain (mystery guarantee pending). */
  forceRainNext: boolean;
  /** Mist present (misty mornings burn off). */
  mist: number;
}

export interface ContentmentState {
  value: number;
  baseline: number;
  /** Seconds accumulated sitting by fire tonight / resting in rain today. */
  fireSecs: number;
  fireGained: number;
  rainSecs: number;
  rainGained: number;
  /** Tier name reached at least once today (for blissful guarantee). */
  blissfulToday: boolean;
}

export interface CampState {
  tentSpot: number | null;
  tent: TentId | null;
  pegs: boolean[];
  pitched: boolean;
  placed: PlacedDecor[];
  /** Decor ids placed at least once this trip (first placement +5). */
  placedOnce: DecorId[];
}

export interface CompanionState {
  /** Days on which a dish was shared. */
  shareDays: number[];
  befriended: boolean;
  /** Visible peeking right now (not saved meaningfully, recomputed). */
  seenToday: boolean;
}

export interface MysteryState {
  /** 0 = nothing, 1 glow seen, 2 scale found, 3 legend heard, 4 dumplings cooked, 5 guardian met. */
  step: number;
  /** Scale is lying on the shore waiting to be picked up. */
  scaleOnShore: boolean;
  hasScale: boolean;
  /** Glow sighting played tonight. */
  glowTonight: boolean;
}

export interface GameState {
  v: number;
  seed: number;
  streams: Record<StreamName, number>;
  trip: number;
  day: number;
  /** Day progress 0..1 dawn->night; >= 1 means night (held). */
  p: number;
  /** Seconds spent in night so far. */
  nightSecs: number;
  scene: 'title' | 'intro' | 'shop' | 'camp' | 'album';
  hero: { x: number };
  money: number;
  gear: Partial<Record<GearId, boolean>>;
  bait: { wiggly: number; sparkle: number };
  baitSelected: 'none' | 'wiggly' | 'sparkle';
  rod: 'bamboo_rod' | 'willow_rod' | 'moonlight_rod' | null;
  pantry: Partial<Record<PantryId, number>>;
  forage: Partial<Record<ForageId, number>>;
  fish: Partial<Record<FishId, number>>;
  dishes: DishItem[];
  decor: Partial<Record<DecorId, number>>;
  camp: CampState;
  forageSpots: Partial<Record<ForageSpotId, { pickedDay: number }>>;
  weather: WeatherState;
  contentment: ContentmentState;
  companion: CompanionState;
  mystery: MysteryState;
  journal: JournalState;
  days: DayLog[];
  /** Casts since a better-rod fish was last in season, for the rod hint. */
  castsWithoutRod: number;
  rodHintShown: boolean;
  flags: Record<string, boolean | number>;
  freePlay: boolean;
  /** Real time of last save (ms). */
  savedAt: number;
}

export function newDayLog(day: number, weather: WeatherKind): DayLog {
  return {
    day,
    weather,
    rainyNight: false,
    peak: 0,
    fishCaught: 0,
    cooked: {},
    newRecipes: [],
    newFish: [],
    moments: [],
    shared: false,
    foraged: 0,
    sold: 0,
    notes: [],
  };
}

export function freshJournal(): JournalState {
  return {
    fish: {},
    recipes: {},
    moments: {},
    friend: false,
    clues: [false, false, false, false, false],
    badges: { happyCamper: false, guardianFriend: false },
    trips: [],
    mushMade: 0,
  };
}

export const START_MONEY = 120;

export function freshState(seed = newSeed(), journal?: JournalState, trip = 1): GameState {
  const streams = {} as Record<StreamName, number>;
  for (const k of ['weather', 'fish', 'forage', 'moments', 'misc'] as StreamName[]) streams[k] = hashSeed(seed, k + trip);
  return {
    v: SAVE_VERSION,
    seed,
    streams,
    trip,
    day: 1,
    p: 0.12,
    nightSecs: 0,
    scene: 'title',
    hero: { x: 0 },
    money: START_MONEY,
    gear: {},
    bait: { wiggly: 0, sparkle: 0 },
    baitSelected: 'none',
    rod: null,
    pantry: {},
    forage: {},
    fish: {},
    dishes: [],
    decor: {},
    camp: { tentSpot: null, tent: null, pegs: [false, false, false, false], pitched: false, placed: [], placedOnce: [] },
    forageSpots: {},
    weather: {
      today: 'clear',
      raining: false,
      change: null,
      rainAtDusk: false,
      hadRainyNight: false,
      lastNightRainy: false,
      forceRainNext: false,
      mist: 0,
    },
    contentment: { value: 10, baseline: 10, fireSecs: 0, fireGained: 0, rainSecs: 0, rainGained: 0, blissfulToday: false },
    companion: { shareDays: [], befriended: false, seenToday: false },
    mystery: { step: 0, scaleOnShore: false, hasScale: false, glowTonight: false },
    journal: journal ?? freshJournal(),
    days: [newDayLog(1, 'clear')],
    castsWithoutRod: 0,
    rodHintShown: false,
    flags: {},
    freePlay: false,
    savedAt: 0,
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let state: GameState = freshState();
const rngs = new Map<StreamName, Rng>();

export function S(): GameState {
  return state;
}

export function setState(s: GameState): void {
  state = s;
  rngs.clear();
  bus.emit('state:changed', { reason: 'replace' });
}

/** Named RNG stream; its state is written back into GameState on use. */
export function rng(name: StreamName): Rng {
  let r = rngs.get(name);
  if (!r) {
    r = new Rng(state.streams[name]);
    rngs.set(name, r);
  }
  const wrapped = r;
  // Persist stream position lazily on save.
  return wrapped;
}

function syncStreams(): void {
  for (const [k, r] of rngs) state.streams[k] = r.state;
}

export function today(): DayLog {
  let d = state.days[state.days.length - 1];
  if (!d || d.day !== state.day) {
    d = newDayLog(state.day, state.weather.today);
    state.days.push(d);
  }
  return d;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;
/** migrations[n] upgrades a v(n) save to v(n+1). */
const migrations: Record<number, Migration> = {};

export function hasSave(): boolean {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

let saveBlocked = false;

export function save(reason = 'auto'): void {
  if (saveBlocked) return;
  syncStreams();
  state.savedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[save] failed', reason, err);
  }
}

/** Debounced autosave for frequent small actions. */
let saveTimer = 0;
export function autosave(reason = 'auto'): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => save(reason), 250);
}

export function load(): GameState | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    let obj = JSON.parse(raw) as Record<string, unknown>;
    let v = Number(obj.v) || 0;
    while (v < SAVE_VERSION) {
      const m = migrations[v];
      if (!m) throw new Error(`no migration from v${v}`);
      obj = m(obj);
      v++;
      obj.v = v;
    }
    // Fill any fields added since (defensive merge with defaults).
    const merged = deepDefaults(obj, freshState(Number(obj.seed) || 1) as unknown as Record<string, unknown>);
    return merged as unknown as GameState;
  } catch (err) {
    console.warn('[save] could not load, starting fresh', err);
    return null;
  }
}

function deepDefaults(obj: Record<string, unknown>, def: Record<string, unknown>): Record<string, unknown> {
  for (const k of Object.keys(def)) {
    const dv = def[k];
    const ov = obj[k];
    if (ov === undefined) obj[k] = dv;
    else if (dv && typeof dv === 'object' && !Array.isArray(dv) && ov && typeof ov === 'object' && !Array.isArray(ov)) {
      // Only recurse into fixed-shape records, not id-keyed maps.
      if (Object.keys(dv as object).length > 0) deepDefaults(ov as Record<string, unknown>, dv as Record<string, unknown>);
    }
  }
  return obj;
}

export function eraseSave(): void {
  saveBlocked = true;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
  saveBlocked = false;
}

export function installAutosaveHooks(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save('hidden');
  });
  window.addEventListener('pagehide', () => save('pagehide'));
}
