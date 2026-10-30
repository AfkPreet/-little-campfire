/**
 * The layered camp landscape of Junkiri Danda (WORLD.md 3.1, 3.2, 3.4, 3.5).
 * Texture keys are all prefixed "land_". Split by band into landscape-*.ts
 * helpers (which export no bake(), so Boot only runs this one).
 */
import type { Baker } from './kit';
import { bakeFarBands } from './landscape-far';
import { bakeMidBands } from './landscape-mid';
import { bakeGroundBands } from './landscape-ground';
import { bakeFgBand } from './landscape-fg';

export function bake(b: Baker): void {
  bakeFarBands(b);
  bakeMidBands(b);
  bakeGroundBands(b);
  bakeFgBand(b);
}
