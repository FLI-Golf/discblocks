/** Layout of the hole, shared by the scene dressing and the gameplay entities. */
export const COURSE = {
  groundWidth: 140,
  groundLength: 260,
  fairwayWidth: 30,
  teeZ: 45,
  basketZ: -60,
  spawnY: 2.5,
  throwSpeed: 52,
  /** Upward bias so a level throw arcs down into the tray at basket distance. */
  throwLoft: 10.4,

  arenaHalfWidth: 24,
  arenaBackZ: -95,
  /** Behind the camera, so the taller boards never occlude the view down the hole. */
  arenaFrontZ: 92,
  wallHeight: 5.2,
  /** Tall enough to sit behind the whole basket, not just its base. */
  backstopHeight: 9,
  wallThickness: 0.6,
  netHeight: 10,

  pillarRadius: 1.4,
  pillarHeight: 11,
  /** One logo per revolution, sized to keep the 2:1 sponsor panel aspect. */
  pillarAdHeight: 4.4,
  pillarAdBands: 2,
  /** Gates and guards the disc has to work around on the way to the basket. */
  pillars: [
    { x: -5, z: 22 },
    { x: 5, z: 22 },
    { x: -8.5, z: -18 },
    { x: 8.5, z: -18 },
    { x: -4.5, z: -46 },
    { x: 4.5, z: -46 },
  ],

  teePadWidth: 10.5,
  teePadDepth: 13.5,
  teePadHeight: 0.6,
};
