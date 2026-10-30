/**
 * The camp's light director: turns game state (day progress, rain, mist,
 * golden evening) into a ResolvedLight each frame and pushes it to every
 * lightable thing — landscape, props, actors (with firelight warming them),
 * vignette, fireflies, rain particles and drifting petals.
 */
import Phaser from 'phaser';
import { DEPTH } from '@/config';
import { layout, onLayout } from '@/core/layout';
import { S } from '@/core/state';
import { lightAt, type ResolvedLight } from '@/fx/lighting';
import { Drifters, Fireflies, Rain } from '@/fx/particles';
import { CAMP } from '@/data/camp';
import { P, hexToInt, intToHex, mix } from '@/palette';
import { isGoldenEvening, mistAmount } from '@/systems/weather';

export interface Lit {
  setLight(l: ResolvedLight): void;
}

export interface Actor {
  setLightTint(c: number): unknown;
  x: number;
}

export class CampLight {
  light: ResolvedLight;
  readonly rain: Rain;
  readonly fireflies: Fireflies;
  readonly drifters: Drifters;
  private vignette: Phaser.GameObjects.Image;
  private lits = new Set<Lit>();
  private actors = new Set<Actor>();
  private rainAmt = 0;
  private mistAmt = 0;
  private lastKey = '';
  /** Extra multiplier for rain (finale thins rain to 40%). */
  rainScale = 1;
  /** Override day progress (title/debug). */
  pOverride: number | null = null;
  /** Fire warmth sampler: 0..1 at a world x. */
  warmthAt: (x: number) => number = () => 0;

  constructor(scene: Phaser.Scene) {
    const l = layout();
    const s = S();
    this.rainAmt = s.weather.raining ? 1 : 0;
    this.mistAmt = mistAmount();
    this.light = lightAt(s.p, this.rainAmt, this.mistAmt, isGoldenEvening() ? 1 : 0);
    this.vignette = scene.add
      .image(0, 0, 'vignette')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.vignette)
      .setDisplaySize(l.w, l.h);
    this.rain = new Rain(scene, l.w, l.h, DEPTH.rain, CAMP.groundY);
    this.rain.set(this.rainAmt, true);
    this.fireflies = new Fireflies(scene, { x0: CAMP.clearing.x0, x1: CAMP.waterX + 200, y0: 360, y1: 560 }, 30, DEPTH.fx + 2);
    this.drifters = new Drifters(scene, l.w, l.h, DEPTH.fg - 1);
    const off = onLayout((nl) => {
      this.vignette.setDisplaySize(nl.w, nl.h);
      this.rain.resize(nl.w, nl.h);
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      this.rain.destroy();
      this.fireflies.destroy();
      this.drifters.destroy();
    });
  }

  add(l: Lit): void {
    this.lits.add(l);
    l.setLight(this.light);
  }

  remove(l: Lit): void {
    this.lits.delete(l);
  }

  addActor(a: Actor): void {
    this.actors.add(a);
  }

  removeActor(a: Actor): void {
    this.actors.delete(a);
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    const s = S();
    const targetRain = (s.weather.raining ? 1 : 0) * this.rainScale;
    const targetMist = mistAmount();
    // Ease rain/mist so weather changes feel gentle (~8 s).
    this.rainAmt += Phaser.Math.Clamp(targetRain - this.rainAmt, -dt / 8, dt / 8);
    this.mistAmt += Phaser.Math.Clamp(targetMist - this.mistAmt, -dt / 10, dt / 10);
    const p = this.pOverride ?? s.p;
    const key = `${p.toFixed(4)}|${this.rainAmt.toFixed(3)}|${this.mistAmt.toFixed(3)}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.light = lightAt(p, this.rainAmt, this.mistAmt, isGoldenEvening() ? 1 : 0);
      for (const l of this.lits) l.setLight(this.light);
      this.vignette.setAlpha(this.light.vignette);
    }
    // Actors: base actor tint warmed by nearby firelight at night.
    const L = this.light;
    for (const a of this.actors) {
      const warm = this.warmthAt(a.x) * L.warmLight;
      a.setLightTint(warm > 0.02 ? hexToInt(mix(L.hex.actor, mix(P.glow, P.cream, 0.4), Math.min(0.75, warm * 0.85))) : L.actor);
    }
    this.rain.set(this.rainAmt > 0.02 ? Math.min(1, this.rainAmt) : 0);
    this.rain.update(dt);
    this.fireflies.setAmount(L.night * (1 - this.rainAmt * 0.85));
    this.fireflies.update(time, delta);
    this.drifters.setActive(L.night < 0.2 && this.rainAmt < 0.1 && p > 0.12 && p < 0.8);
  }

  /** Current rain amount 0..1 (eased). */
  get rainAmount(): number {
    return this.rainAmt;
  }

  actorTintHex(): string {
    return intToHex(this.light.actor);
  }
}
