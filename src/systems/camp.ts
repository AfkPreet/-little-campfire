/** Tent pitching and decor placement (spec section 5, "Shelter and decor"). */
import { bus } from '@/core/bus';
import { S, autosave } from '@/core/state';
import { CAMP } from '@/data/camp';
import { CONTENTMENT, DECOR } from '@/data/decor';
import type { DecorId } from '@/data/ids';
import { TENTS } from '@/data/items';
import { gain, refreshBaseline } from './contentment';
import { ownedTent } from './shop';

// --- Tent ---------------------------------------------------------------------

export function chooseTentSpot(i: number): void {
  const c = S().camp;
  c.tentSpot = i;
  c.pegs = [false, false, false, false];
  c.pitched = false;
  autosave('tentSpot');
}

/** Tap a peg; returns true when the 4th peg completes the tent. */
export function tapPeg(i: number): boolean {
  const c = S().camp;
  if (c.pitched || c.tentSpot === null) return false;
  c.pegs[i] = true;
  if (c.pegs.every(Boolean)) {
    c.pitched = true;
    c.tent = ownedTent();
    refreshBaseline();
    autosave('pitched');
    return true;
  }
  autosave('peg');
  return false;
}

export function tentPitched(): boolean {
  return S().camp.pitched;
}

// --- Decor --------------------------------------------------------------------

export interface SnapPoint {
  id: string;
  kind: 'hang' | 'ground' | 'twoTree' | 'span';
  /** Logical world position (span: midpoint). */
  x: number;
  y: number;
  /** For span: the two hang points it occupies. */
  ends?: [string, string];
}

/** All snap points that exist right now (tent hang points depend on the tent). */
export function snapPoints(): SnapPoint[] {
  const s = S();
  const pts: SnapPoint[] = [];
  const spot = s.camp.tentSpot;
  if (s.camp.pitched && s.camp.tent && spot !== null) {
    const n = TENTS[s.camp.tent].hangPoints;
    const tentX = CAMP.tentSpots[spot].x;
    const hp = CAMP.tentHang[s.camp.tent];
    for (let i = 0; i < n; i++) pts.push({ id: `tent:${i}`, kind: 'hang', x: tentX + hp[i].dx, y: CAMP.groundY + hp[i].dy });
  }
  CAMP.branchHang.forEach((b, i) => pts.push({ id: `branch:${i}`, kind: 'hang', x: b.x, y: b.y }));
  CAMP.groundPoints.forEach((g, i) => pts.push({ id: `ground:${i}`, kind: 'ground', x: g.x, y: CAMP.groundY + (g.dy ?? 0) }));
  pts.push({ id: 'trees', kind: 'twoTree', x: CAMP.twoTree.x, y: CAMP.twoTree.y });
  CAMP.spans.forEach((sp, i) => {
    const a = pts.find((p) => p.id === sp[0]);
    const b = pts.find((p) => p.id === sp[1]);
    if (a && b) pts.push({ id: `span:${i}`, kind: 'span', x: (a.x + b.x) / 2, y: Math.max(a.y, b.y), ends: [a.id, b.id] });
  });
  return pts;
}

function occupied(): Set<string> {
  const set = new Set<string>();
  const all = snapPoints();
  for (const p of S().camp.placed) {
    set.add(p.point);
    const sp = all.find((x) => x.id === p.point);
    if (sp?.ends) sp.ends.forEach((e) => set.add(e));
  }
  // A span is blocked if either end is used.
  for (const sp of all) if (sp.ends && sp.ends.some((e) => set.has(e))) set.add(sp.id);
  return set;
}

export function freePointsFor(id: DecorId): SnapPoint[] {
  const kind = DECOR[id].placement;
  const occ = occupied();
  return snapPoints().filter((p) => p.kind === kind && !occ.has(p.id));
}

export function place(id: DecorId, point: string): boolean {
  const s = S();
  if ((s.decor[id] ?? 0) <= 0) return false;
  if (!freePointsFor(id).some((p) => p.id === point)) return false;
  s.decor[id] = (s.decor[id] ?? 0) - 1;
  s.camp.placed.push({ id, point });
  if (!s.camp.placedOnce.includes(id)) {
    s.camp.placedOnce.push(id);
    gain(CONTENTMENT.firstPlacement, 'decor');
  }
  refreshBaseline();
  bus.emit('inventory:changed', {});
  autosave('place');
  return true;
}

export function store(point: string): boolean {
  const s = S();
  const i = s.camp.placed.findIndex((p) => p.point === point);
  if (i < 0) return false;
  const [p] = s.camp.placed.splice(i, 1);
  s.decor[p.id] = (s.decor[p.id] ?? 0) + 1;
  bus.emit('inventory:changed', {});
  autosave('store');
  return true;
}

export function move(fromPoint: string, toPoint: string): boolean {
  const s = S();
  const p = s.camp.placed.find((x) => x.point === fromPoint);
  if (!p) return false;
  store(fromPoint);
  return place(p.id, toPoint);
}

/** If the tent changes, return decor on vanished hang points to the backpack. */
export function validatePlacements(): void {
  const ids = new Set(snapPoints().map((p) => p.id));
  for (const p of [...S().camp.placed]) if (!ids.has(p.point)) store(p.point);
}

export function placedDecor(): { id: DecorId; point: string }[] {
  return S().camp.placed;
}
