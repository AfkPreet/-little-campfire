import type Phaser from 'phaser';

type SF = Phaser.GameObjects.GameObject & { setScrollFactor?: (x: number, y?: number) => unknown; list?: Phaser.GameObjects.GameObject[] };

/**
 * Pin a container and every descendant to the screen (scroll factor 0).
 * Phaser hit-tests a container's children with the child's own scroll
 * factor, so a screen-fixed panel in a scrolling scene must pin them all or
 * its buttons drift away from where they are drawn once the camera moves.
 */
export function pinToScreen<T extends Phaser.GameObjects.GameObject>(obj: T): T {
  const visit = (o: SF) => {
    o.setScrollFactor?.(0, 0);
    if (o.list) for (const c of o.list) visit(c as SF);
  };
  visit(obj as unknown as SF);
  return obj;
}
