/**
 * Camp props public module (WORLD 3.2, 7.1, 7.4, 7.6, 7.8): tents, the
 * campfire, forage spots, the Moon Scale sparkle and placed decor. Art lives
 * in src/art/props-*.ts (texture namespace "prop_"); geometry shared by art
 * and world code lives in src/art/props-geo.ts.
 */
export { type Lightable, makeHighlight } from './props-common';
export { TentProp, type TentState } from './props-tent';
export { CampfireProp } from './props-fire';
export { ForageSpotProp, ScaleSparkle, type ForageState } from './props-forage';
export { DecorProp } from './props-decor';
