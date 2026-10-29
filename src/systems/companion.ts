/**
 * Companion (spec section 5, light): peeks from a bush at dusk/night when
 * Contentment is content (40+) and the hero holds a dish. Shares on 3
 * different days befriend it.
 */
import { bus } from '@/core/bus';
import { S, autosave, today } from '@/core/state';
import { CONTENTMENT } from '@/data/decor';
import { DUSK } from '@/data/time';
import { gain } from './contentment';
import { recordFriend } from './journal';

export const SHARE_DAYS_TO_BEFRIEND = 3;
export const PEEK_MIN_CONTENTMENT = 40;

export function befriended(): boolean {
  return S().companion.befriended;
}

/** Hearts shown on the Friends tab (0-3). */
export function hearts(): number {
  return Math.min(SHARE_DAYS_TO_BEFRIEND, S().companion.shareDays.length);
}

export function canPeek(holdingDish: boolean): boolean {
  const s = S();
  if (s.companion.befriended) return false;
  if (s.contentment.value < PEEK_MIN_CONTENTMENT) return false;
  if (s.p < DUSK.from) return false;
  return holdingDish || s.dishes.length > 0;
}

/** Share a dish while the companion is near. Returns 'visit' | 'befriended' | 'already'. */
export function share(): 'visit' | 'befriended' | 'already' {
  const s = S();
  const c = s.companion;
  gain(CONTENTMENT.share, 'share');
  today().shared = true;
  if (c.befriended) {
    autosave('share');
    return 'already';
  }
  if (!c.shareDays.includes(s.day)) c.shareDays.push(s.day);
  if (c.shareDays.length >= SHARE_DAYS_TO_BEFRIEND) {
    c.befriended = true;
    recordFriend();
    bus.emit('companion:changed', { state: 'befriended' });
    autosave('befriend');
    return 'befriended';
  }
  bus.emit('companion:changed', { state: 'visit' });
  autosave('share');
  return 'visit';
}
