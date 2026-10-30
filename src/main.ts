import '@fontsource/baloo-2/400.css';
import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/700.css';
import '@fontsource/patrick-hand/400.css';
import Phaser from 'phaser';
import { gameConfigSize, installResize, refreshLayout } from '@/core/layout';
import { installAutosaveHooks } from '@/core/state';
import { initFlow } from '@/core/flow';
import { installHooks } from '@/core/hooks';
import { SCENE_CLASSES } from '@/scenes';

function preventGestures(): void {
  const stop = (e: Event) => e.preventDefault();
  // iOS: pinch, double-tap zoom, long-press callouts, page bounce.
  document.addEventListener('gesturestart', stop, { passive: false });
  document.addEventListener('gesturechange', stop, { passive: false });
  document.addEventListener('dblclick', stop, { passive: false });
  document.addEventListener('contextmenu', stop);
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  let lastTouch = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTouch < 320) e.preventDefault();
      lastTouch = now;
    },
    { passive: false },
  );
  document.addEventListener('selectstart', stop);
}

function start(): void {
  preventGestures();
  refreshLayout();
  const { width, height, zoom } = gameConfigSize();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#2F3558',
    scale: { mode: Phaser.Scale.NONE, width, height, zoom },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
      powerPreference: 'high-performance',
      transparent: false,
    },
    input: { activePointers: 3, touch: { capture: true } },
    disableContextMenu: true,
    banner: false,
    fps: { target: 60, smoothStep: true },
    scene: SCENE_CLASSES,
  });
  installResize(game);
  installAutosaveHooks();
  initFlow(game);
  installHooks();
  (window as unknown as { __phaser: Phaser.Game }).__phaser = game;
}

start();
