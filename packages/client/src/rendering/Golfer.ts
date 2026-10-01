import * as THREE from 'three';
import type { GolferLook } from '@/game/players';

type Euler3 = [number, number, number];

type JointName =
  | 'hips'
  | 'torso'
  | 'head'
  | 'shoulderR'
  | 'elbowR'
  | 'shoulderL'
  | 'elbowL'
  | 'hipR'
  | 'kneeR'
  | 'hipL'
  | 'kneeL';

export type HairStyle =
  | 'shortCrop'
  | 'sidePart'
  | 'undercut'
  | 'buzzCut'
  | 'ponytail'
  | 'bun'
  | 'bald'
  | 'short'
  | 'cap'
  | 'visor';
export type BodyProfileId = 'athleticMale' | 'athleticFemale' | 'neutralLean';
export type AccessorySlot = 'cap' | 'visor' | 'glasses' | 'disc' | 'bag';

export interface BodyProfile {
  id: BodyProfileId;
  shoulderWidth: number;
  torsoLength: number;
  torsoTaper: number;
  hipWidth: number;
  armThickness: number;
  legLength: number;
  legTaper: number;
  headScale: number;
  jawWidth: number;
  chinShape: number;
}

export type FacePresetId = 'male' | 'female' | 'neutral';

export interface FaceConfig {
  preset: FacePresetId;
  skinTone: number;
  hairColor: number;
  hairStyle: HairStyle;
  headScale: number;
  jawWidth: number;
  chinShape: number;
  brow: number;
  nose: number;
  eyeSpacing: number;
  mouth: number;
  beard: number;
  stubble: number;
}

export interface CharacterAppearance {
  bodyProfile: BodyProfileId;
  profile: BodyProfile;
  skinTone: number;
  hairStyle: HairStyle;
  hairColor: number;
  shirtColor: number;
  shortsColor: number;
  shoeColor: number;
  accentColor: number;
  brow: number;
  nose: number;
  eyeSpacing: number;
  mouth: number;
  beard: number;
  stubble: number;
  sleeveLength: number;
  collarHeight: number;
  shirtFit: number;
  shortsLength: number;
  pantsFit: number;
  facePreset?: FacePresetId;
  outfit: {
    sleeveLength: number;
    collarHeight: number;
    shirtFit: number;
    shortsLength: number;
    pantsFit: number;
  };
  face: {
    brow: number;
    nose: number;
    eyeSpacing: number;
    mouth: number;
    beard: number;
    stubble: number;
  };
}

export type GolferAppearance = CharacterAppearance & {
  accentColor?: number;
  bodyProfile?: BodyProfileId;
  profile?: BodyProfile;
};

export interface AccessoryConfig {
  color?: number;
  accent?: number;
  scale?: number;
  visible?: boolean;
}

interface Pose {
  /** Body rotation about Y, relative to the throw direction. */
  rootYaw: number;
  /** Crouch offset, in metres. */
  rootLift: number;
  joints: Partial<Record<JointName, Euler3>>;
}

const SKIN = 0xd9a877;
const JERSEY = 0xc2452d;
const SHORTS = 0x1a1a1e;
const SHOE = 0x111114;
const HAIR = 0x2b1d16;

const DEFAULT_LOOK: GolferLook = {
  jersey: JERSEY,
  accent: 0x8e2f20,
  shorts: SHORTS,
  skin: SKIN,
  hair: HAIR,
  hairStyle: 'ponytail',
  build: 1,
};

export const BODY_PROFILES: Record<BodyProfileId, BodyProfile> = {
  athleticMale: {
    id: 'athleticMale',
    shoulderWidth: 1.28,
    torsoLength: 1.16,
    torsoTaper: 1.06,
    hipWidth: 0.86,
    armThickness: 1.24,
    legLength: 1.12,
    legTaper: 1.18,
    headScale: 1.12,
    jawWidth: 1.38,
    chinShape: 1.28,
  },
  athleticFemale: {
    id: 'athleticFemale',
    shoulderWidth: 0.92,
    torsoLength: 0.96,
    torsoTaper: 0.74,
    hipWidth: 1.24,
    armThickness: 0.9,
    legLength: 0.98,
    legTaper: 0.9,
    headScale: 0.96,
    jawWidth: 0.78,
    chinShape: 0.7,
  },
  neutralLean: {
    id: 'neutralLean',
    shoulderWidth: 0.86,
    torsoLength: 0.82,
    torsoTaper: 0.68,
    hipWidth: 0.8,
    armThickness: 0.82,
    legLength: 0.86,
    legTaper: 0.78,
    headScale: 0.88,
    jawWidth: 0.9,
    chinShape: 0.84,
  },
};

export function buildCharacterAppearance(
  overrides: Partial<CharacterAppearance> = {}
): CharacterAppearance {
  const baseProfile = overrides.bodyProfile ?? 'neutralLean';
  const profile = overrides.profile ?? BODY_PROFILES[baseProfile];
  const presetId = overrides.facePreset ?? (baseProfile === 'athleticFemale' ? 'female' : 'male');
  const facePreset = FACE_PRESETS[presetId] ?? FACE_PRESETS.male;

  const normalizedHairStyle =
    overrides.hairStyle === 'short' ||
    overrides.hairStyle === 'cap' ||
    overrides.hairStyle === 'visor'
      ? 'shortCrop'
      : (overrides.hairStyle ?? facePreset.hairStyle);

  const appearance: CharacterAppearance = {
    bodyProfile: baseProfile,
    profile,
    skinTone: overrides.skinTone ?? facePreset.skinTone,
    hairStyle: normalizedHairStyle,
    hairColor: overrides.hairColor ?? facePreset.hairColor,
    shirtColor: overrides.shirtColor ?? JERSEY,
    shortsColor: overrides.shortsColor ?? SHORTS,
    shoeColor: overrides.shoeColor ?? SHOE,
    accentColor: overrides.accentColor ?? 0x8e2f20,
    brow: overrides.brow ?? overrides.face?.brow ?? facePreset.brow,
    nose: overrides.nose ?? overrides.face?.nose ?? facePreset.nose,
    eyeSpacing: overrides.eyeSpacing ?? overrides.face?.eyeSpacing ?? facePreset.eyeSpacing,
    mouth: overrides.mouth ?? overrides.face?.mouth ?? facePreset.mouth,
    beard: overrides.beard ?? overrides.face?.beard ?? facePreset.beard,
    stubble: overrides.stubble ?? overrides.face?.stubble ?? facePreset.stubble,
    sleeveLength: overrides.sleeveLength ?? 1,
    collarHeight: overrides.collarHeight ?? 1,
    shirtFit: overrides.shirtFit ?? 1,
    shortsLength: overrides.shortsLength ?? 1,
    pantsFit: overrides.pantsFit ?? 0.9,
    facePreset: presetId,
    outfit: {
      sleeveLength: overrides.outfit?.sleeveLength ?? overrides.sleeveLength ?? 1,
      collarHeight: overrides.outfit?.collarHeight ?? overrides.collarHeight ?? 1,
      shirtFit: overrides.outfit?.shirtFit ?? overrides.shirtFit ?? 1,
      shortsLength: overrides.outfit?.shortsLength ?? overrides.shortsLength ?? 1,
      pantsFit: overrides.outfit?.pantsFit ?? overrides.pantsFit ?? 0.9,
    },
    face: {
      brow: overrides.face?.brow ?? overrides.brow ?? facePreset.brow,
      nose: overrides.face?.nose ?? overrides.nose ?? facePreset.nose,
      eyeSpacing: overrides.face?.eyeSpacing ?? overrides.eyeSpacing ?? facePreset.eyeSpacing,
      mouth: overrides.face?.mouth ?? overrides.mouth ?? facePreset.mouth,
      beard: overrides.face?.beard ?? overrides.beard ?? facePreset.beard,
      stubble: overrides.face?.stubble ?? overrides.stubble ?? facePreset.stubble,
    },
  };

  return appearance;
}

export const FACE_PRESETS: Record<FacePresetId, FaceConfig> = {
  male: {
    preset: 'male',
    skinTone: SKIN,
    hairColor: HAIR,
    hairStyle: 'shortCrop',
    headScale: 1.08,
    jawWidth: 1.24,
    chinShape: 1.12,
    brow: 0.72,
    nose: 0.54,
    eyeSpacing: 0.46,
    mouth: 0.66,
    beard: 0.06,
    stubble: 0.08,
  },
  female: {
    preset: 'female',
    skinTone: SKIN,
    hairColor: HAIR,
    hairStyle: 'sidePart',
    headScale: 0.98,
    jawWidth: 0.84,
    chinShape: 0.86,
    brow: 0.52,
    nose: 0.64,
    eyeSpacing: 0.68,
    mouth: 0.58,
    beard: 0,
    stubble: 0.04,
  },
  neutral: {
    preset: 'neutral',
    skinTone: SKIN,
    hairColor: HAIR,
    hairStyle: 'shortCrop',
    headScale: 1.0,
    jawWidth: 1.02,
    chinShape: 1.0,
    brow: 0.52,
    nose: 0.52,
    eyeSpacing: 0.5,
    mouth: 0.52,
    beard: 0,
    stubble: 0,
  },
};

export const DEFAULT_GOLFER_APPEARANCE: GolferAppearance = buildCharacterAppearance({
  bodyProfile: 'neutralLean',
  skinTone: SKIN,
  hairStyle: 'shortCrop',
  hairColor: HAIR,
  shirtColor: JERSEY,
  shortsColor: SHORTS,
  shoeColor: SHOE,
  accentColor: 0x8e2f20,
  beard: 0,
  stubble: 0,
  facePreset: 'male',
});

/**
 * Right-handed backhand, matching public/throw_positions/step1..6.
 * Angles are hand-authored; tweak these to retime or reshape the throw.
 */
const THROW_SEQUENCE: { pose: Pose; duration: number }[] = [
  {
    duration: 0.35,
    pose: {
      rootYaw: 0,
      rootLift: 0,
      joints: {
        hips: [0, 0, 0],
        torso: [0.05, 0, 0],
        head: [0, 0, 0],
        shoulderR: [0.9, 0, -0.5],
        elbowR: [0, 0, -1.5],
        shoulderL: [0.5, 0, 0.35],
        elbowL: [0, 0, 0.9],
        hipR: [-0.1, 0, 0.05],
        kneeR: [0.2, 0, 0],
        hipL: [0.1, 0, -0.05],
        kneeL: [0.2, 0, 0],
      },
    },
  },
  {
    duration: 0.4,
    pose: {
      rootYaw: 0.75,
      rootLift: -0.05,
      joints: {
        hips: [0, 0.2, 0],
        torso: [0.1, 0.35, 0],
        head: [0, -0.7, 0],
        shoulderR: [0.3, 0, -0.7],
        elbowR: [0, 0, -1.1],
        shoulderL: [0.7, 0, 0.5],
        elbowL: [0, 0, 1.1],
        hipR: [-0.5, 0, 0.1],
        kneeR: [0.9, 0, 0],
        hipL: [0.35, 0, -0.1],
        kneeL: [0.15, 0, 0],
      },
    },
  },
  {
    duration: 0.3,
    pose: {
      rootYaw: 1.7,
      rootLift: -0.12,
      joints: {
        hips: [0, 0.3, 0],
        torso: [0.18, 0.5, 0],
        head: [0, -1.2, 0],
        shoulderR: [-0.35, 0, -1.25],
        elbowR: [0, 0, -0.45],
        shoulderL: [0.95, 0, 0.75],
        elbowL: [0, 0, 1.3],
        hipR: [-0.35, 0, 0.12],
        kneeR: [1.1, 0, 0],
        hipL: [0.5, 0, -0.12],
        kneeL: [0.25, 0, 0],
      },
    },
  },
  {
    duration: 0.16,
    pose: {
      rootYaw: 0.5,
      rootLift: -0.1,
      joints: {
        hips: [0, -0.15, 0],
        torso: [0.1, 0.1, 0],
        head: [0, -0.35, 0],
        shoulderR: [0.15, 0, -0.35],
        elbowR: [0, 0, -2.1],
        shoulderL: [0.5, 0, 1.0],
        elbowL: [0, 0, 0.7],
        hipR: [-0.15, 0, 0.1],
        kneeR: [0.5, 0, 0],
        hipL: [0.25, 0, -0.1],
        kneeL: [0.2, 0, 0],
      },
    },
  },
  {
    duration: 0.12,
    pose: {
      rootYaw: -0.45,
      rootLift: -0.02,
      joints: {
        hips: [0, -0.45, 0],
        torso: [0.05, -0.3, 0],
        head: [0, 0.2, 0],
        shoulderR: [0.1, 0, 1.45],
        elbowR: [0, 0, -0.12],
        shoulderL: [0.1, 0, -1.2],
        elbowL: [0, 0, 0.3],
        hipR: [0.15, 0, 0.1],
        kneeR: [0.25, 0, 0],
        hipL: [-0.15, 0, -0.1],
        kneeL: [0.35, 0, 0],
      },
    },
  },
  {
    duration: 0.45,
    pose: {
      rootYaw: -1.5,
      rootLift: 0.02,
      joints: {
        hips: [0, -0.5, 0],
        torso: [0.02, -0.45, 0],
        head: [0, 0.6, 0],
        shoulderR: [0.2, 0, 0.9],
        elbowR: [0, 0, -0.5],
        shoulderL: [0.15, 0, -0.95],
        elbowL: [0, 0, 0.45],
        hipR: [0.25, 0, 0.1],
        kneeR: [0.2, 0, 0],
        hipL: [-0.7, 0, -0.15],
        kneeL: [1.5, 0, 0],
      },
    },
  },
];

const RELEASE_INDEX = 4;
const RECOVER_DURATION = 0.9;
const GOLFER_SCALE = 2.25;

const FOREHAND_SEQUENCE: { pose: Pose; duration: number }[] = [
  {
    duration: 0.3,
    pose: {
      rootYaw: -0.15,
      rootLift: 0,
      joints: {
        torso: [0.05, -0.1, 0],
        shoulderR: [0.55, 0, 0.75],
        elbowR: [0, 0, -1.3],
        shoulderL: [0.3, 0, -0.4],
        elbowL: [0, 0, 0.6],
        hipR: [-0.1, 0, 0.05],
        kneeR: [0.2, 0, 0],
        hipL: [0.1, 0, -0.05],
        kneeL: [0.2, 0, 0],
      },
    },
  },
  {
    duration: 0.3,
    pose: {
      rootYaw: -0.5,
      rootLift: -0.06,
      joints: {
        torso: [0.1, -0.3, 0],
        shoulderR: [0.3, 0, 1.15],
        elbowR: [0, 0, -1.7],
        shoulderL: [0.4, 0, -0.7],
        elbowL: [0, 0, 0.8],
        hipR: [-0.3, 0, 0.1],
        kneeR: [0.6, 0, 0],
        hipL: [0.3, 0, -0.1],
        kneeL: [0.2, 0, 0],
      },
    },
  },
  {
    duration: 0.22,
    pose: {
      rootYaw: -0.9,
      rootLift: -0.12,
      joints: {
        torso: [0.14, -0.55, 0],
        shoulderR: [-0.1, 0, 1.5],
        elbowR: [0, 0, -2.3],
        shoulderL: [0.5, 0, -0.9],
        elbowL: [0, 0, 1.0],
        hipR: [-0.4, 0, 0.12],
        kneeR: [0.8, 0, 0],
        hipL: [0.4, 0, -0.12],
        kneeL: [0.3, 0, 0],
      },
    },
  },
  {
    duration: 0.13,
    pose: {
      rootYaw: -0.25,
      rootLift: -0.08,
      joints: {
        torso: [0.08, -0.15, 0],
        shoulderR: [0.1, 0, 1.3],
        elbowR: [0, 0, -1.5],
        shoulderL: [0.4, 0, -0.6],
        elbowL: [0, 0, 0.6],
        hipR: [-0.1, 0, 0.1],
        kneeR: [0.4, 0, 0],
        hipL: [0.2, 0, -0.1],
        kneeL: [0.2, 0, 0],
      },
    },
  },
  {
    duration: 0.1,
    pose: {
      rootYaw: 0.35,
      rootLift: -0.02,
      joints: {
        torso: [0.02, 0.3, 0],
        shoulderR: [0.15, 0, 1.52],
        elbowR: [0, 0, -0.1],
        shoulderL: [0.2, 0, -1.1],
        elbowL: [0, 0, 0.3],
        hipR: [0.1, 0, 0.1],
        kneeR: [0.25, 0, 0],
        hipL: [-0.1, 0, -0.1],
        kneeL: [0.3, 0, 0],
      },
    },
  },
  {
    duration: 0.4,
    pose: {
      rootYaw: 0.8,
      rootLift: 0.02,
      joints: {
        torso: [0, 0.5, 0],
        shoulderR: [0.3, 0, 1.0],
        elbowR: [0, 0, -0.8],
        shoulderL: [0.2, 0, -0.9],
        elbowL: [0, 0, 0.5],
        hipR: [0.2, 0, 0.1],
        kneeR: [0.2, 0, 0],
        hipL: [-0.4, 0, -0.12],
        kneeL: [1.1, 0, 0],
      },
    },
  },
];

const OVERHAND_SEQUENCE: { pose: Pose; duration: number }[] = [
  {
    duration: 0.3,
    pose: {
      rootYaw: 0,
      rootLift: 0,
      joints: {
        torso: [0.05, 0, 0],
        shoulderR: [0.8, 0, -0.4],
        elbowR: [0, 0, -1.4],
        shoulderL: [0.4, 0, 0.3],
        elbowL: [0, 0, 0.8],
        hipR: [-0.1, 0, 0.05],
        kneeR: [0.2, 0, 0],
        hipL: [0.1, 0, -0.05],
        kneeL: [0.2, 0, 0],
      },
    },
  },
  {
    duration: 0.32,
    pose: {
      rootYaw: 0.4,
      rootLift: -0.05,
      joints: {
        torso: [0.12, 0.25, 0],
        shoulderR: [-0.5, 0, -0.9],
        elbowR: [0, 0, -1.1],
        shoulderL: [0.7, 0, 0.5],
        elbowL: [0, 0, 1.0],
        hipR: [-0.35, 0, 0.1],
        kneeR: [0.7, 0, 0],
        hipL: [0.3, 0, -0.1],
        kneeL: [0.2, 0, 0],
      },
    },
  },
  {
    duration: 0.24,
    pose: {
      rootYaw: 0.6,
      rootLift: -0.1,
      joints: {
        torso: [0.2, 0.35, 0],
        shoulderR: [-1.5, 0, -0.5],
        elbowR: [0, 0, -1.9],
        shoulderL: [0.9, 0, 0.6],
        elbowL: [0, 0, 1.2],
        hipR: [-0.3, 0, 0.12],
        kneeR: [0.9, 0, 0],
        hipL: [0.45, 0, -0.12],
        kneeL: [0.25, 0, 0],
      },
    },
  },
  {
    duration: 0.14,
    pose: {
      rootYaw: 0.25,
      rootLift: -0.06,
      joints: {
        torso: [0.05, 0.1, 0],
        shoulderR: [-2.4, 0, -0.25],
        elbowR: [0, 0, -1.3],
        shoulderL: [0.6, 0, 0.6],
        elbowL: [0, 0, 0.8],
        hipR: [-0.1, 0, 0.1],
        kneeR: [0.4, 0, 0],
        hipL: [0.2, 0, -0.1],
        kneeL: [0.2, 0, 0],
      },
    },
  },
  {
    duration: 0.1,
    pose: {
      rootYaw: -0.1,
      rootLift: 0,
      joints: {
        torso: [-0.15, -0.1, 0],
        shoulderR: [-2.95, 0, -0.12],
        elbowR: [0, 0, -0.15],
        shoulderL: [0.3, 0, -0.5],
        elbowL: [0, 0, 0.3],
        hipR: [0.1, 0, 0.1],
        kneeR: [0.25, 0, 0],
        hipL: [-0.1, 0, -0.1],
        kneeL: [0.3, 0, 0],
      },
    },
  },
  {
    duration: 0.42,
    pose: {
      rootYaw: -0.4,
      rootLift: 0.02,
      joints: {
        torso: [-0.3, -0.3, 0],
        shoulderR: [-3.0, 0, 0.3],
        elbowR: [0, 0, -0.6],
        shoulderL: [0.2, 0, -0.8],
        elbowL: [0, 0, 0.4],
        hipR: [0.2, 0, 0.1],
        kneeR: [0.2, 0, 0],
        hipL: [-0.5, 0, -0.12],
        kneeL: [1.2, 0, 0],
      },
    },
  },
];

const PUTT_SEQUENCE: { pose: Pose; duration: number }[] = [
  {
    duration: 0.3,
    pose: {
      rootYaw: 0,
      rootLift: 0,
      joints: {
        torso: [0.04, 0, 0],
        shoulderR: [0.95, 0, -0.55],
        elbowR: [0, 0, -1.7],
        shoulderL: [0.5, 0, 0.3],
        elbowL: [0, 0, 0.9],
        hipR: [-0.08, 0, 0.05],
        kneeR: [0.18, 0, 0],
        hipL: [0.08, 0, -0.05],
        kneeL: [0.18, 0, 0],
      },
    },
  },
  {
    duration: 0.28,
    pose: {
      rootYaw: 0.06,
      rootLift: -0.12,
      joints: {
        torso: [0.16, 0.05, 0],
        shoulderR: [1.05, 0, -0.5],
        elbowR: [0, 0, -2.0],
        shoulderL: [0.5, 0, 0.3],
        elbowL: [0, 0, 1.0],
        hipR: [-0.3, 0, 0.06],
        kneeR: [0.6, 0, 0],
        hipL: [-0.28, 0, -0.06],
        kneeL: [0.58, 0, 0],
      },
    },
  },
  {
    duration: 0.2,
    pose: {
      rootYaw: 0.08,
      rootLift: -0.18,
      joints: {
        torso: [0.22, 0.08, 0],
        shoulderR: [1.15, 0, -0.45],
        elbowR: [0, 0, -2.25],
        shoulderL: [0.48, 0, 0.28],
        elbowL: [0, 0, 1.05],
        hipR: [-0.4, 0, 0.06],
        kneeR: [0.8, 0, 0],
        hipL: [-0.38, 0, -0.06],
        kneeL: [0.78, 0, 0],
      },
    },
  },
  {
    duration: 0.14,
    pose: {
      rootYaw: 0.02,
      rootLift: -0.06,
      joints: {
        torso: [0.06, 0.02, 0],
        shoulderR: [0.95, 0, -0.3],
        elbowR: [0, 0, -1.2],
        shoulderL: [0.42, 0, 0.26],
        elbowL: [0, 0, 0.8],
        hipR: [-0.15, 0, 0.06],
        kneeR: [0.3, 0, 0],
        hipL: [-0.14, 0, -0.06],
        kneeL: [0.28, 0, 0],
      },
    },
  },
  {
    duration: 0.12,
    pose: {
      rootYaw: 0,
      rootLift: 0.05,
      joints: {
        torso: [-0.1, 0, 0],
        shoulderR: [1.35, 0, -0.14],
        elbowR: [0, 0, -0.1],
        shoulderL: [0.35, 0, 0.22],
        elbowL: [0, 0, 0.6],
        hipR: [0.05, 0, 0.05],
        kneeR: [0.1, 0, 0],
        hipL: [0.04, 0, -0.05],
        kneeL: [0.1, 0, 0],
      },
    },
  },
  {
    duration: 0.35,
    pose: {
      rootYaw: 0,
      rootLift: 0.02,
      joints: {
        torso: [-0.14, 0, 0],
        shoulderR: [1.5, 0, -0.1],
        elbowR: [0, 0, -0.2],
        shoulderL: [0.3, 0, 0.2],
        elbowL: [0, 0, 0.5],
        hipR: [0.02, 0, 0.05],
        kneeR: [0.12, 0, 0],
        hipL: [0.02, 0, -0.05],
        kneeL: [0.12, 0, 0],
      },
    },
  },
];

const SEQUENCES = {
  backhand: THROW_SEQUENCE,
  forehand: FOREHAND_SEQUENCE,
  overhand: OVERHAND_SEQUENCE,
  putt: PUTT_SEQUENCE,
};

export type ThrowAnimation = keyof typeof SEQUENCES;

function limb(length: number, radius: number, color: number): THREE.Mesh {
  const geometry = new THREE.CapsuleGeometry(radius, length, 6, 14);
  geometry.translate(0, -length / 2 - radius, 0);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.04 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createDiscVisual(color: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(0.124, 0.124, 0.027, 20);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.rotation.z = Math.PI / 2;
  return mesh;
}

export class Face {
  readonly root = new THREE.Group();
  private config: FaceConfig;
  private hairRoot?: THREE.Group;

  constructor(config: Partial<FaceConfig> = {}) {
    this.config = { ...FACE_PRESETS.neutral, ...config };
    this.build();
    this.apply();
  }

  setConfig(config: Partial<FaceConfig>) {
    this.config = { ...this.config, ...config };
    this.apply();
  }

  updateFeature(
    feature: keyof Pick<
      FaceConfig,
      | 'headScale'
      | 'jawWidth'
      | 'chinShape'
      | 'brow'
      | 'nose'
      | 'eyeSpacing'
      | 'mouth'
      | 'beard'
      | 'stubble'
    >,
    value: number
  ) {
    this.config[feature] = value;
    this.apply();
  }

  resetToPreset(preset: FacePresetId) {
    this.config = { ...FACE_PRESETS[preset], preset };
    this.apply();
  }

  dispose() {
    this.root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material.dispose();
      }
    });
  }

  private build() {
    const headMaterial = new THREE.MeshStandardMaterial({
      color: this.config.skinTone,
      roughness: 0.68,
      metalness: 0.04,
    });

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.136, 28, 24), headMaterial);
    skull.name = 'head-part';
    skull.castShadow = true;
    skull.scale.set(1.0, 1.1, 0.96);
    this.root.add(skull);

    const jaw = new THREE.Mesh(
      new THREE.SphereGeometry(0.094, 22, 16),
      new THREE.MeshStandardMaterial({
        color: this.config.skinTone,
        roughness: 0.74,
        metalness: 0.02,
      })
    );
    jaw.name = 'jaw-part';
    jaw.scale.set(1.08, 0.76, 0.9);
    jaw.position.set(0, -0.079, 0.02);
    this.root.add(jaw);

    const leftEar = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 12, 10),
      new THREE.MeshStandardMaterial({ color: this.config.skinTone, roughness: 0.8 })
    );
    leftEar.scale.set(1.08, 1.3, 0.72);
    leftEar.position.set(-0.145, 0.018, 0);
    this.root.add(leftEar);

    const rightEar = leftEar.clone();
    rightEar.position.x = 0.145;
    this.root.add(rightEar);

    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xeff4ff,
      roughness: 0.22,
      metalness: 0.02,
    });
    const whiteLeft = new THREE.Mesh(new THREE.SphereGeometry(0.026, 18, 14), eyeMaterial);
    whiteLeft.name = 'eye-white-left';
    whiteLeft.position.set(-0.045, 0.028, 0.11);
    this.root.add(whiteLeft);

    const whiteRight = whiteLeft.clone();
    whiteRight.name = 'eye-white-right';
    whiteRight.position.x = 0.045;
    this.root.add(whiteRight);

    const irisMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e4560,
      roughness: 0.4,
      metalness: 0.08,
    });
    const irisLeft = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), irisMaterial);
    irisLeft.name = 'iris-left';
    irisLeft.position.set(-0.045, 0.026, 0.126);
    this.root.add(irisLeft);

    const irisRight = irisLeft.clone();
    irisRight.name = 'iris-right';
    irisRight.position.x = 0.045;
    this.root.add(irisRight);

    const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x0f1720, roughness: 0.7 });
    const pupilLeft = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 10, 8), pupilMaterial);
    pupilLeft.name = 'pupil-left';
    pupilLeft.position.set(-0.045, 0.026, 0.136);
    this.root.add(pupilLeft);

    const pupilRight = pupilLeft.clone();
    pupilRight.name = 'pupil-right';
    pupilRight.position.x = 0.045;
    this.root.add(pupilRight);

    const browMaterial = new THREE.MeshStandardMaterial({
      color: this.config.hairColor,
      roughness: 0.96,
    });
    const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.014, 0.014), browMaterial);
    leftBrow.name = 'brow-left';
    leftBrow.position.set(-0.045, 0.082, 0.104);
    leftBrow.rotation.z = 0.12;
    this.root.add(leftBrow);

    const rightBrow = leftBrow.clone();
    rightBrow.name = 'brow-right';
    rightBrow.position.x = 0.045;
    rightBrow.rotation.z = -0.12;
    this.root.add(rightBrow);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.02, 0.078, 12),
      new THREE.MeshStandardMaterial({ color: this.config.skinTone, roughness: 0.7 })
    );
    nose.name = 'nose-part';
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.03, 0.118);
    this.root.add(nose);

    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.034, 0.005, 10, 32, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xab5a60, roughness: 0.9 })
    );
    smile.name = 'mouth-part';
    smile.position.set(0, -0.094, 0.109);
    smile.rotation.z = Math.PI;
    this.root.add(smile);

    const beard = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 14, 10),
      new THREE.MeshStandardMaterial({ color: this.config.hairColor, roughness: 0.96 })
    );
    beard.name = 'beard-part';
    beard.scale.set(1.08, 0.7, 0.9);
    beard.position.set(0, -0.118, 0.03);
    beard.visible = false;
    this.root.add(beard);

    const stubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.084, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x5a4530, roughness: 0.8 })
    );
    stubble.name = 'stubble-part';
    stubble.scale.set(1.04, 0.22, 0.9);
    stubble.position.set(0, -0.086, 0.09);
    stubble.visible = false;
    this.root.add(stubble);

    this.addHair();
  }

  private addHair() {
    if (this.hairRoot) {
      this.hairRoot.removeFromParent();
    }

    const hairRoot = new THREE.Group();
    hairRoot.name = 'hair-root';
    this.root.add(hairRoot);
    this.hairRoot = hairRoot;

    const hairColor = this.config.hairColor;
    const hairMaterial = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });

    if (this.config.hairStyle === 'bald') {
      return;
    }

    if (this.config.hairStyle === 'ponytail') {
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.142, 18, 12), hairMaterial);
      crown.scale.set(1.1, 0.82, 1.04);
      crown.position.set(0, 0.07, 0.02);
      hairRoot.add(crown);
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.28, 6, 12), hairMaterial);
      tail.rotation.x = -1.1;
      tail.position.set(0, -0.02, 0.12);
      hairRoot.add(tail);
      return;
    }

    if (this.config.hairStyle === 'bun') {
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.124, 18, 12), hairMaterial);
      crown.scale.set(1.18, 0.7, 1.1);
      crown.position.set(0, 0.07, 0.02);
      hairRoot.add(crown);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 10), hairMaterial);
      bun.position.set(0, 0.04, -0.09);
      hairRoot.add(bun);
      return;
    }

    if (this.config.hairStyle === 'buzzCut') {
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.124, 18, 12), hairMaterial);
      top.scale.set(1.28, 0.74, 1.12);
      top.position.set(0, 0.07, 0.02);
      hairRoot.add(top);
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.08), hairMaterial);
      fringe.position.set(0, 0.02, 0.1);
      hairRoot.add(fringe);
      return;
    }

    if (this.config.hairStyle === 'undercut') {
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), hairMaterial);
      top.scale.set(1.3, 0.8, 1.12);
      top.position.set(0, 0.08, 0.02);
      hairRoot.add(top);
      const left = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 10), hairMaterial);
      left.scale.set(0.9, 0.7, 1.14);
      left.position.set(-0.12, 0.02, 0.04);
      hairRoot.add(left);
      const right = left.clone();
      right.position.x = 0.12;
      hairRoot.add(right);
      return;
    }

    if (this.config.hairStyle === 'sidePart') {
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.132, 18, 12), hairMaterial);
      top.scale.set(1.22, 0.76, 1.12);
      top.position.set(0, 0.08, 0.03);
      hairRoot.add(top);
      const sweep = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.2), hairMaterial);
      sweep.position.set(0.14, 0.02, 0.1);
      sweep.rotation.z = -0.9;
      hairRoot.add(sweep);
      return;
    }

    const crop = new THREE.Mesh(new THREE.SphereGeometry(0.136, 18, 12), hairMaterial);
    crop.scale.set(1.16, 0.78, 1.08);
    crop.position.set(0, 0.08, 0.02);
    hairRoot.add(crop);
  }

  private apply() {
    const headPart = this.root.getObjectByName('head-part');
    if (headPart instanceof THREE.Mesh) {
      headPart.scale.set(
        1.0 + (this.config.headScale - 1) * 0.5,
        1.1 + (this.config.headScale - 1) * 0.5,
        0.96 + (this.config.headScale - 1) * 0.3
      );
    }

    const jaw = this.root.getObjectByName('jaw-part');
    if (jaw instanceof THREE.Mesh) {
      jaw.scale.set(this.config.jawWidth, 0.72 * this.config.chinShape, 0.9);
    }

    const eyeLeft = this.root.getObjectByName('eye-white-left');
    const eyeRight = this.root.getObjectByName('eye-white-right');
    if (eyeLeft instanceof THREE.Mesh && eyeRight instanceof THREE.Mesh) {
      const spacing = (0.66 - this.config.eyeSpacing) * 0.14;
      eyeLeft.position.x = -0.047 - spacing;
      eyeRight.position.x = 0.047 + spacing;
      eyeLeft.position.y = 0.028 + (0.5 - this.config.brow) * 0.016;
      eyeRight.position.y = eyeLeft.position.y;

      const irisLeft = this.root.getObjectByName('iris-left');
      const irisRight = this.root.getObjectByName('iris-right');
      const pupilLeft = this.root.getObjectByName('pupil-left');
      const pupilRight = this.root.getObjectByName('pupil-right');
      if (
        irisLeft instanceof THREE.Mesh &&
        irisRight instanceof THREE.Mesh &&
        pupilLeft instanceof THREE.Mesh &&
        pupilRight instanceof THREE.Mesh
      ) {
        irisLeft.position.x = eyeLeft.position.x;
        irisRight.position.x = eyeRight.position.x;
        pupilLeft.position.x = eyeLeft.position.x;
        pupilRight.position.x = eyeRight.position.x;
      }
    }

    const leftBrow = this.root.getObjectByName('brow-left');
    const rightBrow = this.root.getObjectByName('brow-right');
    if (leftBrow instanceof THREE.Mesh && rightBrow instanceof THREE.Mesh) {
      const lift = 0.04 + this.config.brow * 0.03;
      leftBrow.position.y = 0.082 + lift;
      rightBrow.position.y = leftBrow.position.y;
      leftBrow.scale.set(0.9 + this.config.brow * 0.75, 0.9 + this.config.brow * 0.2, 1);
      rightBrow.scale.set(0.9 + this.config.brow * 0.75, 0.9 + this.config.brow * 0.2, 1);
      leftBrow.position.x = -0.047 - (0.66 - this.config.eyeSpacing) * 0.07;
      rightBrow.position.x = 0.047 + (0.66 - this.config.eyeSpacing) * 0.07;
    }

    const nose = this.root.getObjectByName('nose-part');
    if (nose instanceof THREE.Mesh) {
      nose.scale.set(
        0.9 + this.config.nose * 0.7,
        1.1 + (this.config.nose - 0.5) * 0.8,
        0.9 + (this.config.nose - 0.5) * 0.7
      );
      nose.position.z = 0.117 + (this.config.nose - 0.5) * 0.038;
    }

    const mouth = this.root.getObjectByName('mouth-part');
    if (mouth instanceof THREE.Mesh) {
      mouth.scale.set(
        1 + (this.config.mouth - 0.5) * 0.9,
        0.7 + (this.config.mouth - 0.5) * 0.5,
        1
      );
      mouth.rotation.z = Math.PI + (this.config.mouth - 0.5) * 0.75;
    }

    const beard = this.root.getObjectByName('beard-part');
    if (beard instanceof THREE.Mesh) {
      beard.visible = this.config.beard > 0.04;
      beard.scale.set(
        1.08 + this.config.beard * 0.9,
        0.62 + this.config.beard * 1.3,
        0.9 + this.config.beard * 0.45
      );
      beard.position.set(0, -0.12 - this.config.beard * 0.04, 0.03 + this.config.beard * 0.02);
    }

    const stubble = this.root.getObjectByName('stubble-part');
    if (stubble instanceof THREE.Mesh) {
      stubble.visible = this.config.stubble > 0.04;
      stubble.scale.set(
        1.04 + this.config.stubble * 0.9,
        0.22 + this.config.stubble * 0.34,
        0.9 + this.config.stubble * 0.3
      );
      stubble.position.set(
        0,
        -0.086 - this.config.stubble * 0.02,
        0.09 + this.config.stubble * 0.02
      );
    }

    this.addHair();
  }
}

export class Golfer {
  readonly root = new THREE.Group();

  private joints = new Map<JointName, THREE.Group>();
  private attachPoints = new Map<string, THREE.Object3D>();
  private hand = new THREE.Group();
  private disc!: THREE.Mesh;
  private hairRoot?: THREE.Group;
  private face!: Face;
  private appearance: GolferAppearance;
  private baseY = 0;
  private look: GolferLook;

  private playing = false;
  private index = 0;
  private elapsed = 0;
  private releasing = false;
  private sequence = SEQUENCES.backhand;
  private idleT = 0;
  private idlePhase = Math.random() * 10;
  private accessories = new Map<AccessorySlot, THREE.Group>();

  constructor(look: GolferLook | Partial<GolferAppearance> = DEFAULT_LOOK) {
    this.look = (look as GolferLook) ?? DEFAULT_LOOK;
    const normalized = this.normalizeAppearance(look as Partial<GolferAppearance>);
    this.appearance = normalized;
    this.root.scale.setScalar(GOLFER_SCALE * (this.look.build ?? 1));
    this.build();
    this.applyProfileToRig();
    this.applyPose(THROW_SEQUENCE[0].pose, THROW_SEQUENCE[0].pose, 0);
  }

  private normalizeAppearance(input: Partial<GolferAppearance>): GolferAppearance {
    const legacy = input as GolferLook & Partial<GolferAppearance>;
    const bodyProfile = legacy.bodyProfile ?? legacy.profile?.id ?? 'neutralLean';
    const profile = legacy.profile ?? BODY_PROFILES[bodyProfile];
    const base = buildCharacterAppearance({
      bodyProfile,
      profile,
      facePreset: legacy.facePreset,
      skinTone: legacy.skinTone ?? legacy.skin ?? SKIN,
      hairStyle: (legacy.hairStyle as HairStyle) ?? 'shortCrop',
      hairColor: legacy.hairColor ?? legacy.hair ?? HAIR,
      shirtColor: legacy.shirtColor ?? legacy.jersey ?? JERSEY,
      shortsColor: legacy.shortsColor ?? legacy.shorts ?? SHORTS,
      shoeColor: legacy.shoeColor ?? SHOE,
      accentColor: legacy.accentColor ?? legacy.accent ?? 0x8e2f20,
      brow: legacy.brow ?? 0.5,
      nose: legacy.nose ?? 0.5,
      eyeSpacing: legacy.eyeSpacing ?? 0.5,
      mouth: legacy.mouth ?? 0.5,
      beard: legacy.beard ?? 0,
      stubble: legacy.stubble ?? 0,
      sleeveLength: legacy.sleeveLength ?? 1,
      collarHeight: legacy.collarHeight ?? 1,
      shirtFit: legacy.shirtFit ?? 1,
      shortsLength: legacy.shortsLength ?? 1,
      pantsFit: legacy.pantsFit ?? 0.9,
    });

    return {
      ...base,
      outfit: {
        sleeveLength: legacy.sleeveLength ?? base.outfit.sleeveLength,
        collarHeight: legacy.collarHeight ?? base.outfit.collarHeight,
        shirtFit: legacy.shirtFit ?? base.outfit.shirtFit,
        shortsLength: legacy.shortsLength ?? base.outfit.shortsLength,
        pantsFit: legacy.pantsFit ?? base.outfit.pantsFit,
      },
      face: {
        brow: legacy.brow ?? base.face.brow,
        nose: legacy.nose ?? base.face.nose,
        eyeSpacing: legacy.eyeSpacing ?? base.face.eyeSpacing,
        mouth: legacy.mouth ?? base.face.mouth,
        beard: legacy.beard ?? base.face.beard,
        stubble: legacy.stubble ?? base.face.stubble,
      },
    };
  }

  private joint(name: JointName, parent: THREE.Object3D, position: THREE.Vector3): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(position);
    parent.add(group);
    this.joints.set(name, group);
    return group;
  }

  private build() {
    const look = this.look;
    const hips = this.joint('hips', this.root, new THREE.Vector3(0, 0.92, 0));
    const pelvis = limb(0.22, 0.17, this.appearance.shortsColor);
    pelvis.name = 'pelvis-part';
    pelvis.scale.set(1.06, 1, 0.82);
    hips.add(pelvis);

    const torso = this.joint('torso', hips, new THREE.Vector3(0, 0.02, 0));
    const chest = limb(0.42, 0.19, this.appearance.shirtColor);
    chest.name = 'torso-part';
    chest.geometry.translate(0, 0.62, 0);
    chest.scale.set(1.04, 1, 0.78);
    torso.add(chest);

    const collar = limb(0.1, 0.185, look.accent);
    collar.name = 'collar-part';
    collar.geometry.translate(0, 0.78, 0);
    collar.scale.set(1.04, 1, 0.78);
    torso.add(collar);

    const placket = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.34, 0.02),
      new THREE.MeshStandardMaterial({ color: look.accent, roughness: 0.8 })
    );
    placket.position.set(0, 0.56, 0.149);
    torso.add(placket);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.07, 0.1, 10),
      new THREE.MeshStandardMaterial({ color: this.appearance.skinTone, roughness: 0.75 })
    );
    neck.position.y = 0.74;
    torso.add(neck);

    const head = this.joint('head', torso, new THREE.Vector3(0, 0.78, 0));
    const faceConfig: FaceConfig = {
      preset: this.appearance.facePreset ?? 'neutral',
      skinTone: this.appearance.skinTone,
      hairColor: this.appearance.hairColor,
      hairStyle: this.appearance.hairStyle,
      headScale: this.appearance.profile.headScale,
      jawWidth: this.appearance.profile.jawWidth,
      chinShape: this.appearance.profile.chinShape,
      brow: this.appearance.face.brow,
      nose: this.appearance.face.nose,
      eyeSpacing: this.appearance.face.eyeSpacing,
      mouth: this.appearance.face.mouth,
      beard: this.appearance.face.beard,
      stubble: this.appearance.face.stubble,
    };
    this.face = new Face(faceConfig);
    head.add(this.face.root);
    this.attachPoints.set('head', head);

    const backPoint = new THREE.Group();
    backPoint.position.set(0, 0.1, -0.17);
    torso.add(backPoint);
    this.attachPoints.set('back', backPoint);

    for (const side of [1, -1] as const) {
      const isRight = side === 1;
      const shoulderName: JointName = isRight ? 'shoulderR' : 'shoulderL';
      const elbowName: JointName = isRight ? 'elbowR' : 'elbowL';
      const shoulder = this.joint(shoulderName, torso, new THREE.Vector3(side * 0.22, 0.62, 0));
      const sleeve = limb(0.26, 0.07, this.appearance.shirtColor);
      shoulder.add(sleeve);

      const upperArm = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 12, 10),
        new THREE.MeshStandardMaterial({ color: this.appearance.shirtColor, roughness: 0.78 })
      );
      shoulder.add(upperArm);

      const elbow = this.joint(elbowName, shoulder, new THREE.Vector3(0, -0.4, 0));
      const forearm = limb(0.26, 0.06, this.appearance.skinTone);
      elbow.add(forearm);

      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.072, 10, 8),
        new THREE.MeshStandardMaterial({ color: this.appearance.skinTone, roughness: 0.75 })
      );
      hand.scale.set(0.9, 1.15, 0.7);
      hand.position.y = -0.4;
      hand.castShadow = true;
      elbow.add(hand);

      if (isRight) {
        this.hand.position.set(0, -0.38, 0);
        elbow.add(this.hand);
        this.attachPoints.set('rightHand', this.hand);
      } else {
        this.attachPoints.set('leftHand', hand);
      }

      const hipName: JointName = isRight ? 'hipR' : 'hipL';
      const kneeName: JointName = isRight ? 'kneeR' : 'kneeL';

      const hip = this.joint(hipName, hips, new THREE.Vector3(side * 0.11, -0.12, 0));
      hip.add(limb(0.34, 0.09, this.appearance.skinTone));

      const knee = this.joint(kneeName, hip, new THREE.Vector3(0, -0.5, 0));
      const calf = limb(0.32, 0.08, this.appearance.skinTone);
      knee.add(calf);

      const sock = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.081, 0.16, 12),
        new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.8 })
      );
      sock.position.y = -0.31;
      knee.add(sock);

      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.1, 0.24),
        new THREE.MeshStandardMaterial({ color: this.appearance.shoeColor, roughness: 0.85 })
      );
      shoe.position.set(0, -0.46, -0.03);
      shoe.castShadow = true;
      knee.add(shoe);

      const toe = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 10, 8),
        new THREE.MeshStandardMaterial({ color: this.appearance.shoeColor, roughness: 0.8 })
      );
      toe.scale.set(1, 0.72, 1.3);
      toe.position.set(0, -0.47, -0.14);
      knee.add(toe);
    }

    this.disc = createDiscVisual(0xe03a2f);
    this.disc.name = 'held-disc';
    this.hand.add(this.disc);
    this.equipAccessory('disc', { visible: true });
  }

  private addHair(head: THREE.Group) {
    if (this.hairRoot) {
      this.hairRoot.removeFromParent();
    }

    const hairRoot = new THREE.Group();
    hairRoot.name = 'hair-root';
    head.add(hairRoot);
    this.hairRoot = hairRoot;

    const hairColor = this.appearance.hairColor;
    const hairMaterial = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });

    if (this.appearance.hairStyle === 'bald') {
      return;
    }

    if (this.appearance.hairStyle === 'ponytail') {
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.138, 12, 10), hairMaterial);
      crown.scale.set(1.12, 0.82, 1.04);
      crown.position.set(0, 0.06, 0.02);
      hairRoot.add(crown);

      const tail = limb(0.29, 0.07, hairColor);
      tail.rotation.x = -1.1;
      tail.position.set(0, -0.02, 0.12);
      hairRoot.add(tail);
      return;
    }

    if (this.appearance.hairStyle === 'bun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.078, 12, 10), hairMaterial);
      bun.position.set(0, 0.02, -0.08);
      hairRoot.add(bun);

      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), hairMaterial);
      crown.scale.set(1.18, 0.68, 1.08);
      crown.position.set(0, 0.06, 0.02);
      hairRoot.add(crown);
      return;
    }

    if (this.appearance.hairStyle === 'buzzCut') {
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), hairMaterial);
      top.scale.set(1.28, 0.72, 1.12);
      top.position.set(0, 0.06, 0.02);
      hairRoot.add(top);

      const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.08), hairMaterial);
      fringe.position.set(0, 0.02, 0.1);
      hairRoot.add(fringe);
      return;
    }

    if (this.appearance.hairStyle === 'undercut') {
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.126, 12, 10), hairMaterial);
      top.scale.set(1.28, 0.82, 1.14);
      top.position.set(0, 0.06, 0.02);
      hairRoot.add(top);

      const sideLeft = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), hairMaterial);
      sideLeft.scale.set(0.94, 0.74, 1.14);
      sideLeft.position.set(-0.12, 0.0, 0.04);
      hairRoot.add(sideLeft);

      const sideRight = sideLeft.clone();
      sideRight.position.x = 0.12;
      hairRoot.add(sideRight);
      return;
    }

    if (this.appearance.hairStyle === 'sidePart') {
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.128, 12, 10), hairMaterial);
      top.scale.set(1.2, 0.72, 1.12);
      top.position.set(0, 0.07, 0.02);
      hairRoot.add(top);

      const sweep = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.22), hairMaterial);
      sweep.position.set(0.14, 0.0, 0.1);
      sweep.rotation.z = -0.9;
      hairRoot.add(sweep);
      return;
    }

    const crop = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), hairMaterial);
    crop.scale.set(1.12, 0.76, 1.06);
    crop.position.set(0, 0.06, 0.02);
    hairRoot.add(crop);
  }

  private applyProfileToRig() {
    const profile =
      this.appearance.profile ?? BODY_PROFILES[this.appearance.bodyProfile ?? 'neutralLean'];

    const torso = this.joints.get('torso');
    if (torso) {
      torso.scale.set(1, profile.torsoLength, 1.05 + (1 - profile.torsoTaper) * 0.4);
    }

    const head = this.joints.get('head');
    if (head) {
      head.scale.set(profile.headScale, profile.headScale, profile.headScale);
    }

    const pelvis = this.root.getObjectByName('pelvis-part');
    if (pelvis instanceof THREE.Mesh) {
      pelvis.scale.set(1.06 * profile.hipWidth, 1, 0.82 * profile.torsoTaper);
    }

    const shoulderL = this.joints.get('shoulderL');
    const shoulderR = this.joints.get('shoulderR');
    if (shoulderL) {
      shoulderL.scale.set(profile.shoulderWidth, 1, 1);
    }
    if (shoulderR) {
      shoulderR.scale.set(profile.shoulderWidth, 1, 1);
    }

    const hipL = this.joints.get('hipL');
    const hipR = this.joints.get('hipR');
    if (hipL) {
      hipL.scale.set(profile.hipWidth, profile.legLength, 1);
    }
    if (hipR) {
      hipR.scale.set(profile.hipWidth, profile.legLength, 1);
    }

    this.face?.setConfig({
      skinTone: this.appearance.skinTone,
      hairColor: this.appearance.hairColor,
      hairStyle: this.appearance.hairStyle,
      headScale: profile.headScale,
      jawWidth: profile.jawWidth,
      chinShape: profile.chinShape,
      brow: this.appearance.face.brow,
      nose: this.appearance.face.nose,
      eyeSpacing: this.appearance.face.eyeSpacing,
      mouth: this.appearance.face.mouth,
      beard: this.appearance.face.beard,
      stubble: this.appearance.face.stubble,
    });
  }

  setAppearance(options: Partial<GolferAppearance>) {
    const merged = {
      ...this.appearance,
      ...options,
    } as GolferAppearance;

    const nextBodyProfile =
      options.profile ?? BODY_PROFILES[options.bodyProfile ?? merged.bodyProfile ?? 'neutralLean'];
    merged.profile = nextBodyProfile;
    merged.bodyProfile = nextBodyProfile.id;

    const outfit = {
      ...this.appearance.outfit,
      ...(merged.outfit ?? {}),
    };
    const face = {
      ...this.appearance.face,
      ...(merged.face ?? {}),
    };
    const nextFacePreset = options.facePreset ?? this.appearance.facePreset ?? 'neutral';

    this.appearance = {
      ...this.appearance,
      ...merged,
      profile: nextBodyProfile,
      bodyProfile: nextBodyProfile.id,
      facePreset: nextFacePreset,
      outfit,
      face,
    };

    this.look.hairStyle = this.appearance.hairStyle as unknown as GolferLook['hairStyle'];
    this.look.hair = this.appearance.hairColor;
    this.look.jersey = this.appearance.shirtColor;
    this.look.shorts = this.appearance.shortsColor;
    this.look.skin = this.appearance.skinTone;

    const head = this.joints.get('head');
    if (head && this.face) {
      this.face.setConfig({
        skinTone: this.appearance.skinTone,
        hairColor: this.appearance.hairColor,
        hairStyle: this.appearance.hairStyle,
      });
    }

    this.applyProfileToRig();
    this.refreshAppearance();
  }

  private refreshAppearance() {
    this.root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }
      const material = child.material as THREE.MeshStandardMaterial;
      if (!material || material.color === undefined) {
        return;
      }

      const name = child.name;
      if (name === 'skin-part') {
        material.color.setHex(this.appearance.skinTone);
      }
      if (name === 'hair-part') {
        material.color.setHex(this.appearance.hairColor);
      }
      if (name === 'shirt-part') {
        material.color.setHex(this.appearance.shirtColor);
      }
      if (name === 'shorts-part') {
        material.color.setHex(this.appearance.shortsColor);
      }
      if (name === 'shoe-part') {
        material.color.setHex(this.appearance.shoeColor);
      }
    });
  }

  setPosition(x: number, y: number, z: number) {
    this.baseY = y;
    this.root.position.set(x, y, z);
  }

  setVisible(visible: boolean) {
    this.root.visible = visible;
  }

  setHeading(yaw: number) {
    this.root.userData.headingYaw = yaw;
  }

  get isThrowing() {
    return this.playing;
  }

  equipAccessory(slot: AccessorySlot, config: AccessoryConfig = {}) {
    const existing = this.accessories.get(slot);
    if (existing) {
      this.removeAccessory(slot);
    }

    const root = this.attachPoints.get(
      slot === 'bag' ? 'back' : slot === 'disc' ? 'rightHand' : 'head'
    );
    if (!root) {
      return;
    }

    const group = new THREE.Group();
    group.name = `${slot}-accessory`;

    if (slot === 'cap') {
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({
          color: config.color ?? this.appearance.shirtColor,
          roughness: 0.82,
        })
      );
      cap.rotation.z = Math.PI;
      cap.position.y = 0.08;
      group.add(cap);

      const visor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.025, 12, 1, false, -Math.PI / 2, Math.PI),
        new THREE.MeshStandardMaterial({
          color: config.accent ?? this.appearance.shirtColor,
          roughness: 0.85,
        })
      );
      visor.position.set(0, 0.02, -0.08);
      group.add(visor);
    }

    if (slot === 'glasses') {
      const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1c22,
        roughness: 0.5,
        metalness: 0.7,
      });
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.03, 0.02), frameMaterial);
      const right = left.clone();
      left.position.set(-0.045, 0.02, 0.11);
      right.position.set(0.045, 0.02, 0.11);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.02), frameMaterial);
      bridge.position.set(0, 0.02, 0.115);
      group.add(left, right, bridge);

      const lensMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c6d8d,
        transparent: true,
        opacity: 0.7,
        roughness: 0.2,
      });
      const leftLens = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.005), lensMaterial);
      const rightLens = leftLens.clone();
      leftLens.position.set(-0.045, 0.02, 0.12);
      rightLens.position.set(0.045, 0.02, 0.12);
      group.add(leftLens, rightLens);
    }

    if (slot === 'bag') {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.26, 0.12),
        new THREE.MeshStandardMaterial({ color: config.color ?? 0x5c7d52, roughness: 0.9 })
      );
      body.position.set(0, 0.1, -0.1);
      group.add(body);
      const strap = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.18, 0.025),
        new THREE.MeshStandardMaterial({ color: config.accent ?? 0x26343a, roughness: 0.7 })
      );
      strap.position.set(0, 0.22, 0);
      group.add(strap);
    }

    if (slot === 'disc') {
      const disc = createDiscVisual(config.color ?? 0xe03a2f);
      disc.scale.setScalar(config.scale ?? 0.82);
      disc.position.set(0.08, 0, 0.06);
      disc.rotation.z = Math.PI / 2;
      disc.visible = config.visible ?? true;
      group.add(disc);
      this.disc = disc;
    }

    root.add(group);
    this.accessories.set(slot, group);
  }

  removeAccessory(slot: AccessorySlot) {
    const accessory = this.accessories.get(slot);
    if (!accessory) {
      return;
    }

    accessory.removeFromParent();
    this.disposeGroup(accessory);
    this.accessories.delete(slot);

    if (slot === 'disc') {
      this.disc.visible = true;
    }
  }

  private disposeGroup(group: THREE.Group) {
    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material.dispose();
      }
    });
  }

  private idle(dt: number) {
    this.idleT += dt;

    const setup = this.sequence[0].pose;
    this.applyPose(setup, setup, 0);

    const t = this.idleT + this.idlePhase;
    const torso = this.joints.get('torso');
    const head = this.joints.get('head');

    if (torso) {
      torso.rotation.y += Math.sin(t * 0.8) * 0.07;
      torso.rotation.x += Math.sin(t * 1.3) * 0.015;
    }
    if (head) {
      head.rotation.y += Math.sin(t * 0.45) * 0.3;
    }

    this.root.position.y = this.baseY + Math.sin(t * 1.9) * 0.012 * GOLFER_SCALE;
  }

  play(animation: ThrowAnimation = 'backhand') {
    this.sequence = SEQUENCES[animation];
    this.playing = true;
    this.index = 0;
    this.elapsed = 0;
    this.releasing = false;
    if (this.disc) {
      this.disc.visible = true;
    }
  }

  setDiscColor(color: number) {
    if (!this.disc) {
      return;
    }
    (this.disc.material as THREE.MeshStandardMaterial).color.setHex(color);
  }

  getDiscWorldPosition(target: THREE.Vector3): THREE.Vector3 {
    if (!this.disc) {
      return target.copy(this.root.position);
    }
    return this.disc.getWorldPosition(target);
  }

  update(dt: number): boolean {
    if (!this.playing) {
      this.idle(dt);
      return false;
    }

    const isRecovering = this.index >= this.sequence.length - 1;
    const duration = isRecovering ? RECOVER_DURATION : this.sequence[this.index + 1].duration;

    this.elapsed += dt;
    const t = Math.min(this.elapsed / duration, 1);

    const from = this.sequence[this.index].pose;
    const to = isRecovering ? this.sequence[0].pose : this.sequence[this.index + 1].pose;
    const eased = this.index < RELEASE_INDEX - 1 ? t * t * (3 - 2 * t) : t * t;
    this.applyPose(from, to, eased);

    let released = false;

    if (t >= 1) {
      if (isRecovering) {
        this.playing = false;
        this.index = 0;
        this.elapsed = 0;
      } else {
        this.index += 1;
        this.elapsed = 0;

        if (this.index === RELEASE_INDEX && !this.releasing) {
          this.releasing = true;
          released = true;
          if (this.disc) {
            this.disc.visible = false;
          }
        }
      }
    }

    return released;
  }

  private applyPose(from: Pose, to: Pose, t: number) {
    const headingYaw = (this.root.userData.headingYaw as number) ?? 0;
    this.root.rotation.y = headingYaw + THREE.MathUtils.lerp(from.rootYaw, to.rootYaw, t);
    this.root.position.y =
      this.baseY + THREE.MathUtils.lerp(from.rootLift, to.rootLift, t) * GOLFER_SCALE;

    for (const [name, group] of this.joints) {
      const a = from.joints[name] ?? [0, 0, 0];
      const b = to.joints[name] ?? [0, 0, 0];
      group.rotation.set(
        THREE.MathUtils.lerp(a[0], b[0], t),
        THREE.MathUtils.lerp(a[1], b[1], t),
        THREE.MathUtils.lerp(a[2], b[2], t)
      );
    }
  }

  dispose() {
    this.root.removeFromParent();
    this.root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material.dispose();
      }
    });
  }
}
