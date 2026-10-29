import type Phaser from 'phaser';
import Boot from './Boot';

/**
 * Every scene module in this folder default-exports its Phaser.Scene class and
 * is registered automatically. Boot must be first.
 */
const mods = import.meta.glob<{ default: typeof Phaser.Scene }>('./*.ts', { eager: true });

export const SCENE_CLASSES: (typeof Phaser.Scene)[] = [
  Boot,
  ...Object.entries(mods)
    .filter(([path]) => !path.endsWith('/index.ts') && !path.endsWith('/Boot.ts'))
    .map(([, m]) => m.default)
    .filter(Boolean),
];
