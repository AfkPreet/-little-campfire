/** Decor (spec section 6, Cozy tab). */
import type { DecorId } from './ids';

export type Placement = 'ground' | 'hang' | 'span' | 'twoTree';

export interface DecorDef {
  id: DecorId;
  /** null = gift, not sold. */
  price: number | null;
  placement: Placement;
  name: string;
  flavor: string;
  /** Behaviour flags used by camp scene. */
  sitSpot?: boolean;
  /** Counts as sitting by the fire when the hero uses it at night. */
  countsAsFire?: boolean;
  shootingStarBonus?: number;
  /** Baseline bonus instead of the usual +2. */
  baseline?: number;
  lightAtNight?: boolean;
}

export const DECOR: Record<DecorId, DecorDef> = {
  potted_flower: { id: 'potted_flower', price: 10, placement: 'ground', name: 'Potted Flower', flavor: 'Nods in the wind.' },
  paper_lantern: { id: 'paper_lantern', price: 12, placement: 'hang', name: 'Paper Lantern', flavor: 'A warm pool of light at night.', lightAtNight: true },
  floor_cushion: { id: 'floor_cushion', price: 12, placement: 'ground', name: 'Floor Cushion', flavor: 'A comfy seat by the fire.', sitSpot: true },
  bunting: { id: 'bunting', price: 15, placement: 'hang', name: 'Bunting Flags', flavor: 'Flutters in every gust.' },
  wind_chime: { id: 'wind_chime', price: 18, placement: 'hang', name: 'Wind Chime', flavor: 'Tinkles when the wind sighs.' },
  woven_rug: { id: 'woven_rug', price: 25, placement: 'ground', name: 'Woven Rug', flavor: 'Its colours warm up at night.' },
  string_lights: { id: 'string_lights', price: 30, placement: 'span', name: 'String Lights', flavor: 'Twinkle, twinkle, after dark.', lightAtNight: true },
  bookshelf: { id: 'bookshelf', price: 40, placement: 'ground', name: 'Little Bookshelf', flavor: 'Bedtime stories under the stars.', countsAsFire: true },
  hammock: { id: 'hammock', price: 60, placement: 'twoTree', name: 'Hammock', flavor: 'For the laziest afternoons.', countsAsFire: true },
  telescope: { id: 'telescope', price: 120, placement: 'ground', name: 'Star Telescope', flavor: 'Shooting stars come more often.', shootingStarBonus: 0.15 },
  guardian_lantern: { id: 'guardian_lantern', price: null, placement: 'hang', name: 'Guardian Lantern', flavor: 'It never goes out.', baseline: 5, lightAtNight: true },
};

export const DECOR_ORDER: DecorId[] = [
  'potted_flower',
  'paper_lantern',
  'floor_cushion',
  'bunting',
  'wind_chime',
  'woven_rug',
  'string_lights',
  'bookshelf',
  'hammock',
  'telescope',
  'guardian_lantern',
];

/** Contentment rules (spec section 5). */
export const CONTENTMENT = {
  baseline: 10,
  perDecor: 2,
  baselineCap: 40,
  firstPlacement: 5,
  fireSitPer10s: 1,
  fireSitMaxPerNight: 10,
  rainRestPer10s: 1,
  rainRestMaxPerDay: 10,
  share: 6,
  moment: 8,
  tiers: [
    { id: 'cozy', min: 0, label: 'Feeling cozy' },
    { id: 'content', min: 40, label: 'Feeling content' },
    { id: 'glowing', min: 70, label: 'Glowing' },
    { id: 'blissful', min: 100, label: 'Blissful' },
  ],
} as const;

export type TierId = (typeof CONTENTMENT.tiers)[number]['id'];
