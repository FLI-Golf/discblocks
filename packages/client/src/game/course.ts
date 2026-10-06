/** Scene scale: the 2.25x golfer puts one world unit at roughly 1.4 ft. */
export const FEET_PER_UNIT = 1.4;

/** Beyond this the basket is hard to pick out, so a beacon marks it. */
export const BEACON_FROM_FEET = 100;
export const BEACON_FROM_UNITS = BEACON_FROM_FEET / FEET_PER_UNIT;

/** Layout of the hole, shared by the scene dressing and the gameplay entities. */
export const COURSE = {
  groundWidth: 150,
  groundLength: 520,
  fairwayWidth: 34,
  teeZ: 60,
  basketZ: -194,
  spawnY: 2.5,
  throwSpeed: 76,
  /** Upward bias so a level throw arcs down into the tray at basket distance. */
  throwLoft: 14,

  arenaHalfWidth: 26,
  arenaBackZ: -232,
  /** Behind the camera, so the taller boards never occlude the view down the hole. */
  arenaFrontZ: 108,
  wallHeight: 5.2,
  /** Tall enough to sit behind the whole basket, not just its base. */
  backstopHeight: 9,
  wallThickness: 0.6,
  netHeight: 15,

  pillarRadius: 1.4,
  pillarHeight: 11,
  /** One logo per revolution, sized to keep the 2:1 sponsor panel aspect. */
  pillarAdHeight: 4.4,
  pillarAdBands: 2,
  /** Gates and guards the disc has to work around on the way to the basket. */
  pillars: [
    { x: -6, z: 4, cap: false },
    { x: 6, z: 4, cap: false },
    { x: -10, z: -62, cap: false },
    { x: 10, z: -62, cap: false },
    { x: -7, z: -124, cap: false },
    { x: 7, z: -124, cap: false },
    { x: -5.6, z: -176, cap: true },
    { x: 5.6, z: -176, cap: true },
  ],
  /** Mushroom caps on the guard pillars, to shut down the overhead route in. */
  capRadius: 4.2,
  capRimHeight: 2.2,

  teePadWidth: 10.5,
  teePadDepth: 13.5,
  teePadHeight: 0.6,

  /** Desert scrub along the edges of the fairway, clear of the playing line. */
  cacti: [
    { x: -21, z: 34 },
    { x: 22, z: 10 },
    { x: -22.5, z: -26 },
    { x: 21, z: -48 },
    { x: -20.5, z: -88 },
    { x: 22.5, z: -104 },
    { x: -22, z: -142 },
    { x: 21.5, z: -158 },
    { x: -21, z: -196 },
    { x: 22, z: -212 },
  ].map((spot, i) => ({
    ...spot,
    height: 4.5 + ((i * 7) % 4),
    arms: 1 + (i % 3),
  })),
};
export function headingTowardBasket(
  position: { x: number; z: number },
  target: { x: number; z: number } = { x: 0, z: COURSE.basketZ }
): number {
  return Math.atan2(target.x - position.x, target.z - position.z);
}
