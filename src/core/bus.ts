/**
 * Global typed event bus. Systems emit, scenes and audio listen.
 * Listeners added from a scene should be removed on SHUTDOWN (use `bus.onScene`).
 */
import type Phaser from 'phaser';

export interface BusEvents {
  'state:changed': { reason: string };
  'money:changed': { money: number; delta: number };
  'contentment:changed': { value: number; delta: number; tier: string; tierChanged: boolean; source: string };
  'clock:phase': { label: string; key: string };
  'clock:night': { day: number };
  'clock:dawn': { day: number };
  'weather:rain': { raining: boolean };
  'journal:stamp': { tab: string; id: string };
  'toast': { text: string; icon?: string };
  'banner': { text: string };
  'moment': { id: string };
  'inventory:changed': Record<string, never>;
  'sfx': { id: string; vol?: number; pan?: number };
  'mystery:step': { step: number };
  'companion:changed': { state: string };
  'settings:changed': Record<string, never>;
  'overlay:open': { key: string };
  'overlay:close': { key: string };
}

type Handler<K extends keyof BusEvents> = (e: BusEvents[K]) => void;

class Bus {
  private map = new Map<keyof BusEvents, Set<Handler<never>>>();

  on<K extends keyof BusEvents>(k: K, fn: Handler<K>): () => void {
    let s = this.map.get(k);
    if (!s) {
      s = new Set();
      this.map.set(k, s);
    }
    s.add(fn as Handler<never>);
    return () => s!.delete(fn as Handler<never>);
  }

  /** Subscribe for the lifetime of a scene (auto-removed on shutdown). */
  onScene<K extends keyof BusEvents>(scene: Phaser.Scene, k: K, fn: Handler<K>): void {
    const off = this.on(k, fn);
    scene.events.once('shutdown', off);
    scene.events.once('destroy', off);
  }

  emit<K extends keyof BusEvents>(k: K, e: BusEvents[K]): void {
    const s = this.map.get(k);
    if (!s) return;
    for (const fn of [...s]) {
      try {
        (fn as Handler<K>)(e);
      } catch (err) {
        console.error(`[bus] ${String(k)} handler failed`, err);
      }
    }
  }
}

export const bus = new Bus();
