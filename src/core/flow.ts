/**
 * Scene flow: one place that moves between the main scenes (Title, Intro,
 * Shop, Camp, Album) with a soft fade, and launches/stops overlays (Hud,
 * Cooking, Journal, Summary, Settings). Scenes call these instead of
 * scene.start directly so transitions stay consistent and hitch-free.
 */
import Phaser from 'phaser';
import { SCENES } from '@/config';
import { registerDebug } from '@/core/debug';
import { freshState, load, S, save, setState } from '@/core/state';
import { beginTrip, resetClockPauses } from '@/systems/day';

const MAIN = [SCENES.title, SCENES.intro, SCENES.shop, SCENES.camp, SCENES.album, SCENES.styleboard, 'Preview'] as string[];
const OVERLAYS = [SCENES.hud, SCENES.cooking, SCENES.journal, SCENES.summary, SCENES.settings] as string[];

let game: Phaser.Game | null = null;
let transitioning = false;

export function initFlow(g: Phaser.Game): void {
  game = g;
  registerDebug('sceneKey', () => mainSceneKey());
  registerDebug('goto', ((key: string, data?: object) => go(key, data)) as never);
  registerDebug('startTrip', () => startTrip());
  registerDebug('continueTrip', () => continueTrip());
}

function mgr(): Phaser.Scenes.SceneManager {
  if (!game) throw new Error('flow not initialised');
  return game.scene;
}

export function mainSceneKey(): string | null {
  if (!game) return null;
  const active = mgr()
    .getScenes(true)
    .map((s) => s.scene.key)
    .filter((k) => MAIN.includes(k));
  return active[active.length - 1] ?? null;
}

export function isActive(key: string): boolean {
  return !!game && mgr().isActive(key);
}

/** Switch main scene with a fade. Overlays except the HUD are closed. */
export function go(key: string, data?: object, fadeMs = 380): void {
  if (!game || transitioning) return;
  const from = mainSceneKey();
  const fromScene = from ? mgr().getScene(from) : null;
  const finish = () => {
    for (const k of OVERLAYS) if (mgr().isActive(k) || mgr().isPaused(k)) mgr().stop(k);
    if (from) mgr().stop(from);
    resetClockPauses();
    const s = S();
    if (key === SCENES.shop) s.scene = 'shop';
    else if (key === SCENES.camp) s.scene = 'camp';
    else if (key === SCENES.album) s.scene = 'album';
    mgr().start(key, data);
    if (key === SCENES.camp || key === SCENES.shop) mgr().run(SCENES.hud);
    mgr().bringToTop(SCENES.hud);
    transitioning = false;
    save('scene');
  };
  if (fromScene && fadeMs > 0 && fromScene.cameras?.main) {
    transitioning = true;
    const cam = fromScene.cameras.main;
    cam.fadeOut(fadeMs, 47, 53, 88);
    // The fade completes inside the old scene's own step: stopping it there
    // lets its update() run on a torn-down scene. Finish after the frame.
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => window.setTimeout(() => transitioning && finish(), 0));
    // Safety: never get stuck if the fade event is missed.
    window.setTimeout(() => transitioning && finish(), fadeMs + 400);
  } else {
    transitioning = true;
    window.setTimeout(finish, 0);
  }
}

/** Open an overlay on top (pauses the clock via the overlay itself). */
export function openOverlay(key: string, data?: object): void {
  if (!game) return;
  if (mgr().isActive(key)) return;
  mgr().run(key, data);
  mgr().bringToTop(key);
}

export function closeOverlay(key: string): void {
  if (!game) return;
  if (mgr().isActive(key) || mgr().isPaused(key)) mgr().stop(key);
}

/** New trip from the title (keeps journal + badges if a save exists). */
export function startTrip(): void {
  const old = load();
  const s = freshState(undefined, old?.journal, old ? old.trip + (old.days.length > 1 || old.day > 1 ? 1 : 0) : 1);
  if (old?.flags.introSeen) s.flags.introSeen = true;
  setState(s);
  beginTrip();
  s.scene = 'shop';
  save('newTrip');
  go(s.flags.introSeen ? SCENES.shop : SCENES.intro);
}

export function continueTrip(): void {
  const s = load();
  if (!s) {
    startTrip();
    return;
  }
  setState(s);
  const target = s.scene === 'shop' ? SCENES.shop : s.scene === 'album' ? SCENES.album : SCENES.camp;
  go(target);
}
