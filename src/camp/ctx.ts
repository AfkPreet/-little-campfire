/**
 * CampCtx: what the Camp scene shares with its controllers (fishing, decor
 * mode, night events, finale...). Controllers live in src/camp/*.ts and get a
 * CampCtx in their constructor; they must clean up on scene shutdown.
 */
import type Phaser from 'phaser';
import type { Hero } from '@/chars/Hero';
import type { Landscape } from '@/world/Landscape';
import type { CampfireProp, TentProp } from '@/world/props';
import type { CampLight } from './CampLight';
import type { Interactables } from './Interactables';

export interface CampCtx {
  scene: Phaser.Scene;
  hero: Hero;
  landscape: Landscape;
  light: CampLight;
  inter: Interactables;
  fire: CampfireProp;
  /** The tent at the chosen spot (null until a spot is chosen). */
  tent(): TentProp | null;
  /** Walk Tuki to x; resolves on arrival (rejects never; resolves false if interrupted). */
  walkTo(x: number): Promise<boolean>;
  /** Block world input (tap-to-walk, interactables) while a flow runs. */
  setBusy(busy: boolean): void;
  isBusy(): boolean;
  /** Show 1-3 action bubbles above a world point. */
  bubbles(x: number, y: number, items: { label: string; onTap: () => void; icon?: string }[]): void;
  closeBubbles(): void;
  /** Screen-space point of the HUD basket/backpack icon (for items flying into it). */
  basketPoint(): { x: number; y: number };
  /** Camera focus override (null = follow Tuki). */
  focus(x: number | null): void;
  /** Register a per-frame updater; returns a remover. */
  onUpdate(fn: (time: number, delta: number) => void): () => void;
  /** Current activity Tuki is in (for ambience + clock rules). */
  activity: 'idle' | 'walk' | 'fish' | 'sit' | 'rest' | 'cook' | 'decor' | 'sleep' | 'finale' | 'read' | 'nap';
}
