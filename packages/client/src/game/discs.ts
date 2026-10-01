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

export type ThrowStyleId = 'backhand' | 'forehand' | 'overhand';

export interface ThrowStyle {
  id: ThrowStyleId;
  name: string;
  hint: string;
  /** Sign of the spin about Y; drives which way the disc fades. */
  spinSign: number;
  /** Multiplies the disc's speed rating. */
  powerScale: number;
  /** Extra launch angle, in radians. */
  loftBias: number;
}

export const THROW_STYLES: ThrowStyle[] = [
  {
    id: 'backhand',
    name: 'Backhand',
    hint: 'Most power. Finishes left.',
    spinSign: -1,
    powerScale: 1,
    loftBias: 0,
  },
  {
    id: 'forehand',
    name: 'Forehand',
    hint: 'Flick. Finishes right.',
    spinSign: 1,
    powerScale: 0.92,
    loftBias: 0.02,
  },
  {
    id: 'overhand',
    name: 'Overhand',
    hint: 'Tomahawk. Steep, over obstacles.',
    spinSign: 1,
    powerScale: 0.82,
    loftBias: 0.3,
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
  { id: 'hyzer', name: 'Hyzer', hint: 'Banked down. Curves early.', bank: -0.35 },
  { id: 'flat', name: 'Flat', hint: 'Neutral release.', bank: 0 },
  { id: 'anhyzer', name: 'Anhyzer', hint: 'Banked up. Curves away first.', bank: 0.35 },
];

export interface ThrowSelection {
  disc: Disc;
  style: ThrowStyle;
  angle: ReleaseAngle;
  /** 0.5 - 1.0 */
  power: number;
}
