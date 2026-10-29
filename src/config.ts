/** Engine-level constants. Gameplay numbers live in src/data/*. */

/** Logical height of every scene. Width flexes with the aspect ratio. */
export const LOGICAL_H = 720;
/** Narrowest logical width we design for (4:3 landscape). */
export const MIN_LOGICAL_W = 960;
/** Device pixel ratio cap (spec: render at DPR, capped at 2). */
export const MAX_DPR = 2;

/** Save key; bump the suffix only with a migration in core/state.ts. */
export const SAVE_KEY = 'little-campfire/save';
export const SETTINGS_KEY = 'little-campfire/settings';

/** Fonts (self-hosted via @fontsource). */
export const FONT_UI = '"Baloo 2", "Nunito", system-ui, sans-serif';
export const FONT_HAND = '"Patrick Hand", "Baloo 2", system-ui, sans-serif';

/** Minimum touch target in logical px (44 pt at the smallest zoom we ship). */
export const MIN_TOUCH = 56;

/** Scene keys. */
export const SCENES = {
  boot: 'Boot',
  title: 'Title',
  intro: 'Intro',
  shop: 'Shop',
  camp: 'Camp',
  hud: 'Hud',
  cooking: 'Cooking',
  journal: 'Journal',
  album: 'Album',
  summary: 'Summary',
  settings: 'Settings',
  styleboard: 'StyleBoard',
} as const;

export type SceneKey = (typeof SCENES)[keyof typeof SCENES];

/** Render depths shared across scenes. */
export const DEPTH = {
  sky: 0,
  stars: 5,
  celestial: 8,
  far: 10,
  hazeFar: 15,
  mid: 20,
  hazeMid: 25,
  near: 30,
  hazeNear: 35,
  water: 38,
  ground: 40,
  props: 50,
  actors: 60,
  fx: 70,
  light: 80,
  fg: 90,
  rain: 95,
  vignette: 98,
  ui: 100,
  overlay: 200,
  toast: 300,
} as const;
