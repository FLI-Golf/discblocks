/**
 * Disc catalog using the standard disc golf flight rating system:
 * speed 1-14, glide 1-7, turn +1 to -5 (high-speed bend right for RHBH),
 * fade 0-5 (low-speed bend left for RHBH).
 */
export interface Disc {
  id: string;
  name: string;
  category: 'Distance Driver' | 'Fairway Driver' | 'Midrange' | 'Putter';
  speed: number;
  glide: number;
  turn: number;
  fade: number;
  color: number;
}

export const DISCS: Disc[] = [
  {
    id: 'destroyer',
    name: 'Destroyer',
    category: 'Distance Driver',
    speed: 12,
    glide: 5,
    turn: -1,
    fade: 3,
    color: 0xe03a2f,
  },
  {
    id: 'wraith',
    name: 'Wraith',
    category: 'Distance Driver',
    speed: 11,
    glide: 5,
    turn: -1,
    fade: 3,
    color: 0x7a4fb5,
  },
  {
    id: 'teebird',
    name: 'Teebird',
    category: 'Fairway Driver',
    speed: 7,
    glide: 5,
    turn: 0,
    fade: 2,
    color: 0x2f6fb5,
  },
  {
    id: 'leopard',
    name: 'Leopard',
    category: 'Fairway Driver',
    speed: 6,
    glide: 5,
    turn: -2,
    fade: 1,
    color: 0xf2c14e,
  },
  {
    id: 'buzzz',
    name: 'Buzzz',
    category: 'Midrange',
    speed: 5,
    glide: 4,
    turn: -1,
    fade: 1,
    color: 0x3fa46a,
  },
  {
    id: 'roc',
    name: 'Roc',
    category: 'Midrange',
    speed: 4,
    glide: 4,
    turn: 0,
    fade: 3,
    color: 0xd98032,
  },
  {
    id: 'aviar',
    name: 'Aviar',
    category: 'Putter',
    speed: 2,
    glide: 3,
    turn: 0,
    fade: 1,
    color: 0xe8e8ea,
  },
  {
    id: 'zone',
    name: 'Zone',
    category: 'Putter',
    speed: 4,
    glide: 3,
    turn: 0,
    fade: 3,
    color: 0x1f3a5f,
  },
];

export type ThrowStyleId = 'backhand' | 'forehand' | 'overhand' | 'roller';

export interface ThrowStyle {
  id: ThrowStyleId;
  name: string;
  hint: string;
  /** Which golfer animation to play; a roller is thrown backhand. */
  animation: 'backhand' | 'forehand' | 'overhand';
  /** Sign of the spin about Y; drives which way the disc fades. */
  spinSign: number;
  /** Multiplies the disc's speed rating. */
  powerScale: number;
  /** Extra launch angle, in radians. */
  loftBias: number;
  /** Released on edge to run along the ground. */
  roller?: boolean;
}

export const THROW_STYLES: ThrowStyle[] = [
  {
    id: 'backhand',
    name: 'Backhand',
    hint: 'Most power. Finishes left.',
    animation: 'backhand',
    spinSign: -1,
    powerScale: 1,
    loftBias: 0,
  },
  {
    id: 'forehand',
    name: 'Forehand',
    hint: 'Flick. Finishes right.',
    animation: 'forehand',
    spinSign: 1,
    powerScale: 0.92,
    loftBias: 0.02,
  },
  {
    id: 'overhand',
    name: 'Overhand',
    hint: 'Tomahawk. Steep, over obstacles.',
    animation: 'overhand',
    spinSign: 1,
    powerScale: 0.82,
    loftBias: 0.3,
  },
  {
    id: 'roller',
    name: 'Roller',
    hint: 'On edge. Runs along the ground, under trouble.',
    animation: 'backhand',
    spinSign: -1,
    powerScale: 0.88,
    loftBias: -0.05,
    roller: true,
  },
];

export type ReleaseAngleId = 'hyzer' | 'flat' | 'anhyzer';

export interface ReleaseAngle {
  id: ReleaseAngleId;
  name: string;
  hint: string;
  /** Bank angle in radians, positive banks the outer edge up. */
  bank: number;
}

export const RELEASE_ANGLES: ReleaseAngle[] = [
  {
    id: 'hyzer',
    name: 'Hyzer',
    hint: 'Hyzer: flies straight, then curves left late.',
    bank: -0.35,
  },
  { id: 'flat', name: 'Flat', hint: 'Flat: stays straight the whole flight.', bank: 0 },
  {
    id: 'anhyzer',
    name: 'Anhyzer',
    hint: 'Anhyzer: flies straight, then curves right late.',
    bank: 0.35,
  },
];

export const DELAYED_CURVE_CONFIG = {
  curveStart: 0.75,
  bankAngle: 0.72,
  curveStrength: 2.1,
  blendDistance: 0.25,
} as const;

export function releaseBankQuaternion(bank: number): {
  x: number;
  y: number;
  z: number;
  w: number;
} {
  const halfBank = bank / 2;
  return {
    x: Math.sin(halfBank),
    y: 0,
    z: 0,
    w: Math.cos(halfBank),
  };
}

export function delayedCurveProgress(
  progress: number,
  flightDistance: number,
  config = DELAYED_CURVE_CONFIG
): number {
  const start = flightDistance * config.curveStart;
  const blendDistance = Math.max(flightDistance * config.blendDistance, 1);
  return Math.max(0, Math.min(1, (progress - start) / blendDistance));
}

export function delayedCurveDirection(bank: number, spin: number): number {
  if (bank === 0) {
    return 0;
  }
  return -Math.sign(bank) * spin;
}

export function bankedTurnBias(bank: number, spin: number, pace: number): number {
  const threshold = 0.35;
  const ramp = Math.max(0, Math.min(1, (threshold - pace) / threshold));
  if (ramp <= 0) {
    return 0;
  }
  return -bank * spin * ramp * (0.8 + (1 - pace) * 0.7);
}

export interface ThrowSelection {
  disc: Disc;
  style: ThrowStyle;
  angle: ReleaseAngle;
  /** 0.5 - 1.0 */
  power: number;
}
