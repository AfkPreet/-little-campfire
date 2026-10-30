/** World names (docs/WORLD.md section 2). Every {Placeholder} in UI copy resolves from here. */
export const WORLD = {
  title: 'Moonlight Momos',
  subtitle: 'a tiny camping trip',
  hero: 'Tuki',
  shopkeeper: 'Boju',
  companion: 'Kopila',
  /** Guardian's name, used only after the legend; UI says "the guardian". */
  guardian: 'Kuhiro',
  place: 'Junkiri Danda',
  water: 'Jun Pokhari',
  nextCampsite: 'Sunthala Bend',
  currency: 'rupees',
  /** Money is always written symbol-first, whole numbers: ₹120. */
  money: (n: number): string => `₹${Math.round(n)}`,
  scale: 'Moon Scale',
  scaleFlavor: 'Warm as a cup of chiya. It hums when it rains.',
  /** "Willow Rod+" tag in fish hints. */
  sturdyRod: 'Rattan Rod+',
  bait: { none: 'None', wiggly: 'Atta', sparkle: 'Mica' },
  version: 'v0.1',
  meta: 'Moonlight Momos: a tiny, cozy camping trip. Fish, forage, cook by the fire, and meet the gentle guardian of the water.',
};
