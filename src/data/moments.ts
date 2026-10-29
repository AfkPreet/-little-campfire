/** Rare moments (spec section 6) and weather table (section 5). */
import type { MomentId, WeatherKind } from './ids';

export interface MomentDef {
  id: MomentId;
  name: string;
  banner: string;
  hint: string;
}

export const MOMENTS: Record<MomentId, MomentDef> = {
  shooting_star: { id: 'shooting_star', name: 'Shooting star', banner: 'A shooting star! Make a wish.', hint: 'Watch a clear night sky' },
  rainbow: { id: 'rainbow', name: 'Rainbow', banner: 'A rainbow over the {water}!', hint: 'The dawn after a rainy night' },
  firefly_swirl: { id: 'firefly_swirl', name: 'Firefly swirl', banner: 'The fireflies are dancing.', hint: 'Sit by the fire on a clear night' },
  misty_sunrise: { id: 'misty_sunrise', name: 'Misty sunrise', banner: 'Everything is wrapped in soft mist.', hint: 'Wake to a misty morning' },
  golden_whisker: { id: 'golden_whisker', name: 'Golden Whisker', banner: "A Golden Whisker! It's practically glowing.", hint: 'A very lucky catch' },
  moonbow: { id: 'moonbow', name: 'Moonbow', banner: "A moonbow... that's rare.", hint: 'A rainy night, feeling blissful' },
};

export const MOMENT_ORDER: MomentId[] = ['shooting_star', 'rainbow', 'firefly_swirl', 'misty_sunrise', 'golden_whisker', 'moonbow'];

export const MOMENT_CHANCE = {
  shootingStar: 0.08,
  rainbow: 0.5,
  fireflySwirl: 0.25,
  fireflySwirlSitSecs: 20,
};

export const WEATHER_TABLE: { kind: WeatherKind; weight: number }[] = [
  { kind: 'clear', weight: 50 },
  { kind: 'rain', weight: 30 },
  { kind: 'mist', weight: 15 },
  { kind: 'golden', weight: 5 },
];

export const WEATHER_RULES = {
  /** Chance per day that rain gently starts or stops mid-day. */
  midDayChange: 0.1,
  changeWindow: [0.25, 0.75] as [number, number],
  /** Night 4 rains if no rainy night yet. */
  guaranteeRainByNight: 4,
  /** Seconds for rain to fade in/out. */
  rainFadeSecs: 8,
};
