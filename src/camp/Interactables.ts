/**
 * Camp interactables: everything the player can tap in the world. Handles
 * hit-testing, "walk there, then act", and the proximity glow rule (at most 3
 * interactables glow at once, only when the hero is near — spec section 8).
 */
import Phaser from 'phaser';

export interface Interactable {
  id: string;
  /** World x Tuki walks to before acting. */
  standX: () => number;
  /** World-space tap rectangle. */
  hit: () => Phaser.Geom.Rectangle;
  /** Available actions right now (empty = not interactable now). One action acts immediately. */
  actions: () => string[];
  /** Run an action (after Tuki arrived). */
  act: (action: string) => void;
  /** Glow outline on/off. */
  highlight?: (on: boolean) => void;
  /** Is this visible/active right now. */
  enabled?: () => boolean;
  /** Higher wins when hit areas overlap. */
  priority?: number;
  /** Where to anchor action bubbles (world coords). */
  bubbleAt?: () => { x: number; y: number };
  /** Max distance (px) for the proximity glow (default 240). */
  near?: number;
}

const MAX_GLOW = 3;

export class Interactables {
  private items: Interactable[] = [];
  private glowing = new Set<string>();

  add(i: Interactable): Interactable {
    this.items = this.items.filter((x) => x.id !== i.id);
    this.items.push(i);
    return i;
  }

  remove(id: string): void {
    const i = this.items.find((x) => x.id === id);
    i?.highlight?.(false);
    this.glowing.delete(id);
    this.items = this.items.filter((x) => x.id !== id);
  }

  get(id: string): Interactable | undefined {
    return this.items.find((x) => x.id === id);
  }

  all(): Interactable[] {
    return this.items;
  }

  /** Top interactable under a world point. */
  at(x: number, y: number): Interactable | null {
    let best: Interactable | null = null;
    let bestPri = -Infinity;
    let bestDist = Infinity;
    for (const i of this.items) {
      if (i.enabled && !i.enabled()) continue;
      if (i.actions().length === 0) continue;
      const r = i.hit();
      // Generous touch slop: 12 px around every hit area.
      if (x < r.x - 12 || x > r.right + 12 || y < r.y - 12 || y > r.bottom + 12) continue;
      const pri = i.priority ?? 0;
      const d = Math.abs(r.centerX - x) + Math.abs(r.centerY - y) * 0.5;
      if (pri > bestPri || (pri === bestPri && d < bestDist)) {
        best = i;
        bestPri = pri;
        bestDist = d;
      }
    }
    return best;
  }

  /** Update proximity glows around the hero. */
  updateGlow(heroX: number, suppress = false): void {
    const near = suppress
      ? []
      : this.items
          .filter((i) => (!i.enabled || i.enabled()) && i.actions().length > 0 && Math.abs(i.standX() - heroX) < (i.near ?? 240))
          .sort((a, b) => Math.abs(a.standX() - heroX) - Math.abs(b.standX() - heroX))
          .slice(0, MAX_GLOW);
    const ids = new Set(near.map((i) => i.id));
    for (const id of this.glowing) {
      if (!ids.has(id)) this.items.find((i) => i.id === id)?.highlight?.(false);
    }
    for (const i of near) if (!this.glowing.has(i.id)) i.highlight?.(true);
    this.glowing = ids;
  }

  /** The nearest interactable to the hero (keyboard E/Space). */
  nearest(heroX: number, maxDist = 140): Interactable | null {
    let best: Interactable | null = null;
    let bd = maxDist;
    for (const i of this.items) {
      if (i.enabled && !i.enabled()) continue;
      if (i.actions().length === 0) continue;
      const d = Math.abs(i.standX() - heroX);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }

  clearGlow(): void {
    for (const id of this.glowing) this.items.find((i) => i.id === id)?.highlight?.(false);
    this.glowing.clear();
  }
}
