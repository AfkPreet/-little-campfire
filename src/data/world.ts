/** World names (docs/WORLD.md). Every {Placeholder} in UI copy resolves from here. */
export const WORLD = {
  title: 'Little Campfire',
  subtitle: 'a tiny camping trip',
  hero: 'Hero',
  shopkeeper: 'Shopkeeper',
  companion: 'Companion',
  guardian: 'Guardian',
  place: 'The Clearing',
  water: 'Lake',
  nextCampsite: 'The Next Campsite',
  currency: 'coins',
  /** Format an amount of money for display. */
  money: (n: number): string => `${n}c`,
  /** The mystery scale item name. */
  scale: 'Glimmering Scale',
  version: 'v0.1',
};
