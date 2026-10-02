import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
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

export function printSceneGraph(root: THREE.Object3D, label: string) {
  const rows: Array<{
    name: string;
    type: string;
    visible: boolean;
    childCount: number;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }> = [];
  const seen = new Set<THREE.Object3D>();

  const visit = (node: THREE.Object3D) => {
    if (seen.has(node)) {
      return;
    }
    seen.add(node);

    const name = node.name || node.type;
    const isRelevant = /(head|face|hair|jaw|eye|nose|mouth|brow|sidepart|cap)/i.test(name);
    if (isRelevant || node === root) {
      const position = (node.position.toArray().slice(0, 3) as number[]).map((value) =>
        Number(value.toFixed(4))
      ) as [number, number, number];
      const rotation = (node.rotation.toArray().slice(0, 3) as number[]).map((value) =>
        Number(value.toFixed(4))
      ) as [number, number, number];
      const scale = (node.scale.toArray().slice(0, 3) as number[]).map((value) =>
        Number(value.toFixed(4))
      ) as [number, number, number];

      rows.push({
        name,
        type: node.type,
        visible: node.visible,
        childCount: node.children.length,
        position,
        rotation,
        scale,
      });
    }

    node.children.forEach(visit);
  };

  visit(root);

  if (rows.length === 0) {
    console.warn(label, {
      rootName: root.name || root.type,
      type: root.type,
      visible: root.visible,
      childCount: root.children.length,
    });
    return;
  }

  console.groupCollapsed(label);
  console.table(rows);
  console.groupEnd();
}

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
  neckWidth: number;
  neckLength: number;
}

export type FacePresetId = 'male' | 'female' | 'neutral';
export type AvatarModelId = 'male' | 'female' | 'none';

export const AVATAR_MODEL_URLS: Record<'male' | 'female', string> = {
  male: '/models/male_avatar.glb',
  female: '/models/female_avatar.glb',
};

export type FaceParameterKey =
  | 'headScale'
  | 'jawWidth'
  | 'chinShape'
  | 'brow'
  | 'nose'
  | 'eyeSpacing'
  | 'mouth'
  | 'beard'
  | 'stubble';

export const FACE_PARAMETER_LIMITS: Record<
  FaceParameterKey,
  { min: number; max: number; default: number; step: number }
> = {
  headScale: { min: 0.7, max: 1.3, default: 1.0, step: 0.01 },
  jawWidth: { min: 0.4, max: 1.6, default: 0.99, step: 0.01 },
  chinShape: { min: 0.5, max: 1.6, default: 0.96, step: 0.01 },
  brow: { min: 0.0, max: 1.2, default: 0.72, step: 0.01 },
  nose: { min: 0.55, max: 1.45, default: 0.5, step: 0.01 },
  eyeSpacing: { min: 0.3, max: 1.2, default: 0.7, step: 0.01 },
  mouth: { min: 0.3, max: 1.4, default: 0.42, step: 0.01 },
  beard: { min: 0.0, max: 1.0, default: 0.0, step: 0.01 },
  stubble: { min: 0.0, max: 1.0, default: 0.0, step: 0.01 },
};

export function clampFaceParameterValue(key: FaceParameterKey, value: number): number {
  const limit = FACE_PARAMETER_LIMITS[key];
  return THREE.MathUtils.clamp(value, limit.min, limit.max);
}

export function mapFaceParameterToGeometry(key: FaceParameterKey, value: number): number {
  const clamped = clampFaceParameterValue(key, value);
  switch (key) {
    case 'jawWidth':
      return clamped / FACE_PARAMETER_LIMITS.jawWidth.default;
    case 'headScale':
      return clamped / FACE_PARAMETER_LIMITS.headScale.default;
    case 'chinShape':
      return clamped / FACE_PARAMETER_LIMITS.chinShape.default;
    default:
      return clamped;
  }
}

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
  avatarModelId: AvatarModelId;
  bodyProfile: BodyProfileId;
  profile: BodyProfile;
  skinTone: number;
  hairStyle: HairStyle;
  hairColor: number;
  shirtColor: number;
  shortsColor: number;
  shoeColor: number;
  accentColor: number;
  jerseyNumber: number;
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

export type PartialGolferAppearance = Omit<
  Partial<GolferAppearance>,
  'profile' | 'face' | 'outfit'
> & {
  profile?: Partial<BodyProfile>;
  face?: Partial<CharacterAppearance['face']>;
  outfit?: Partial<CharacterAppearance['outfit']>;
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

const JERSEY = 0x111827;
const SHORTS = 0x1a1a1e;
const SHOE = 0x111114;

const DEFAULT_LOOK: GolferLook = {
  jersey: 0xf2f4f8,
  accent: 0xe02b20,
  shorts: 0x1a1a1e,
  skin: 0xf0c8a0,
  hair: 0x3b241b,
  hairStyle: 'sidePart',
  build: 1.04,
};

const STAND_POSE: Pose = {
  rootYaw: 0,
  rootLift: 0,
  joints: {
    hips: [0, 0, 0],
    torso: [0.08, 0, 0],
    head: [0, -0.12, 0],
    shoulderR: [0.25, 0, -0.7],
    elbowR: [0, 0, -0.28],
    shoulderL: [0.15, 0, 0.78],
    elbowL: [0, 0, 0.38],
    hipR: [0.06, 0, 0.08],
    kneeR: [0.12, 0, 0],
    hipL: [0.04, 0, -0.08],
    kneeL: [0.12, 0, 0],
  },
};

export const BODY_PROFILES: Record<BodyProfileId, BodyProfile> = {
  athleticMale: {
    id: 'athleticMale',
    shoulderWidth: 1.18,
    torsoLength: 1.22,
    torsoTaper: 1.12,
    hipWidth: 0.82,
    armThickness: 1.18,
    legLength: 1.08,
    legTaper: 1.14,
    headScale: 1.08,
    jawWidth: 1.12,
    chinShape: 1.06,
    neckWidth: 1.0,
    neckLength: 1.0,
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
    neckWidth: 0.9,
    neckLength: 0.92,
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
    neckWidth: 0.88,
    neckLength: 0.96,
  },
};

export function buildCharacterAppearance(
  overrides: PartialGolferAppearance = {}
): CharacterAppearance {
  const baseProfile = overrides.bodyProfile ?? 'neutralLean';
  const baseProfileData = BODY_PROFILES[baseProfile] ?? BODY_PROFILES.neutralLean;
  const profile = {
    ...baseProfileData,
    ...overrides.profile,
    id: overrides.profile?.id ?? baseProfileData.id ?? baseProfile,
  };
  const presetId = overrides.facePreset ?? (baseProfile === 'athleticFemale' ? 'female' : 'male');
  const facePreset = FACE_PRESETS[presetId] ?? FACE_PRESETS.male;

  const normalizedHairStyle =
    overrides.hairStyle === 'short' ||
    overrides.hairStyle === 'cap' ||
    overrides.hairStyle === 'visor'
      ? 'shortCrop'
      : (overrides.hairStyle ?? facePreset.hairStyle);

  const outfitDefaults = {
    sleeveLength: 1,
    collarHeight: 1,
    shirtFit: 1,
    shortsLength: 1,
    pantsFit: 0.9,
  };

  const outfit = {
    ...outfitDefaults,
    ...overrides.outfit,
    sleeveLength:
      overrides.outfit?.sleeveLength ?? overrides.sleeveLength ?? outfitDefaults.sleeveLength,
    collarHeight:
      overrides.outfit?.collarHeight ?? overrides.collarHeight ?? outfitDefaults.collarHeight,
    shirtFit: overrides.outfit?.shirtFit ?? overrides.shirtFit ?? outfitDefaults.shirtFit,
    shortsLength:
      overrides.outfit?.shortsLength ?? overrides.shortsLength ?? outfitDefaults.shortsLength,
    pantsFit: overrides.outfit?.pantsFit ?? overrides.pantsFit ?? outfitDefaults.pantsFit,
  };

  const face = {
    brow: overrides.brow ?? overrides.face?.brow ?? facePreset.brow,
    nose: overrides.nose ?? overrides.face?.nose ?? facePreset.nose,
    eyeSpacing: overrides.eyeSpacing ?? overrides.face?.eyeSpacing ?? facePreset.eyeSpacing,
    mouth: overrides.mouth ?? overrides.face?.mouth ?? facePreset.mouth,
    beard: overrides.beard ?? overrides.face?.beard ?? facePreset.beard,
    stubble: overrides.stubble ?? overrides.face?.stubble ?? facePreset.stubble,
  };

  const appearance: CharacterAppearance = {
    avatarModelId: overrides.avatarModelId ?? 'none',
    bodyProfile: baseProfile,
    profile,
    skinTone: overrides.skinTone ?? facePreset.skinTone,
    hairStyle: normalizedHairStyle,
    hairColor: overrides.hairColor ?? facePreset.hairColor,
    shirtColor: overrides.shirtColor ?? JERSEY,
    shortsColor: overrides.shortsColor ?? SHORTS,
    shoeColor: overrides.shoeColor ?? SHOE,
    accentColor: overrides.accentColor ?? 0xd72638,
    jerseyNumber: overrides.jerseyNumber ?? 1,
    brow: face.brow,
    nose: face.nose,
    eyeSpacing: face.eyeSpacing,
    mouth: face.mouth,
    beard: face.beard,
    stubble: face.stubble,
    sleeveLength: outfit.sleeveLength,
    collarHeight: outfit.collarHeight,
    shirtFit: outfit.shirtFit,
    shortsLength: outfit.shortsLength,
    pantsFit: outfit.pantsFit,
    facePreset: presetId,
    outfit,
    face,
  };

  return appearance;
}

export const FACE_PRESETS: Record<FacePresetId, FaceConfig> = {
  male: {
    preset: 'male',
    skinTone: 0xe8c4b8,
    hairColor: 0x1b120d,
    hairStyle: 'sidePart',
    headScale: 1.0,
    jawWidth: 0.99,
    chinShape: 0.96,
    brow: 0.72,
    nose: 0.5,
    eyeSpacing: 0.7,
    mouth: 0.42,
    beard: 0,
    stubble: 0,
  },
  female: {
    preset: 'female',
    skinTone: 0xeec19a,
    hairColor: 0x6b4a2f,
    hairStyle: 'bun',
    headScale: 0.96,
    jawWidth: 0.78,
    chinShape: 0.7,
    brow: 0.28,
    nose: 0.72,
    eyeSpacing: 0.62,
    mouth: 0.36,
    beard: 0,
    stubble: 0,
  },
  neutral: {
    preset: 'neutral',
    skinTone: 0xefc49d,
    hairColor: 0x533725,
    hairStyle: 'shortCrop',
    headScale: 1.04,
    jawWidth: 1.08,
    chinShape: 0.99,
    brow: 0.55,
    nose: 0.57,
    eyeSpacing: 0.57,
    mouth: 0.52,
    beard: 0,
    stubble: 0.02,
  },
};

export const DEFAULT_MALE_FACE: FaceConfig = { ...FACE_PRESETS.male };

export const DEFAULT_MALE_APPEARANCE: GolferAppearance = buildCharacterAppearance({
  avatarModelId: 'none',
  bodyProfile: 'athleticMale',
  skinTone: 0xe8c4b8,
  hairStyle: 'sidePart',
  hairColor: 0x1b120d,
  shirtColor: 0xf2f4f8,
  shortsColor: 0x1a1a1e,
  shoeColor: SHOE,
  accentColor: 0xe02b20,
  jerseyNumber: 1,
  beard: 0,
  stubble: 0,
  facePreset: 'male',
  profile: {
    ...BODY_PROFILES.athleticMale,
    headScale: 1.02,
    jawWidth: DEFAULT_MALE_FACE.jawWidth,
    chinShape: 0.98,
  },
  face: {
    brow: 0.62,
    nose: 0.48,
    eyeSpacing: 0.68,
    mouth: 0.44,
    beard: 0,
    stubble: 0,
  },
});

export const DEFAULT_GOLFER_APPEARANCE: GolferAppearance = DEFAULT_MALE_APPEARANCE;

/**
 * Right-handed backhand, matching public/throw_positions/step1..6.
 * Angles are hand-authored; tweak these to retime or reshape the throw.
 */
const THROW_SEQUENCE: { pose: Pose; duration: number }[] = [
  {
    duration: 0.35,
    pose: {
      rootYaw: 0.18,
      rootLift: 0,
      joints: {
        hips: [0, 0.08, 0],
        torso: [0.2, 0.12, 0],
        head: [0, -0.15, 0],
        shoulderR: [1.05, 0, -0.7],
        elbowR: [0, 0, -1.95],
        shoulderL: [0.52, 0, 0.38],
        elbowL: [0, 0, 0.88],
        hipR: [-0.15, 0, 0.08],
        kneeR: [0.15, 0, 0],
        hipL: [0.2, 0, -0.04],
        kneeL: [0.18, 0, 0],
      },
    },
  },
  {
    duration: 0.4,
    pose: {
      rootYaw: 0.82,
      rootLift: -0.05,
      joints: {
        hips: [0, 0.26, 0],
        torso: [0.26, 0.42, 0],
        head: [0, -0.7, 0],
        shoulderR: [0.38, 0, -0.95],
        elbowR: [0, 0, -1.2],
        shoulderL: [0.7, 0, 0.58],
        elbowL: [0, 0, 1.06],
        hipR: [-0.52, 0, 0.12],
        kneeR: [0.9, 0, 0],
        hipL: [0.38, 0, -0.1],
        kneeL: [0.18, 0, 0],
      },
    },
  },
  {
    duration: 0.3,
    pose: {
      rootYaw: 1.62,
      rootLift: -0.12,
      joints: {
        hips: [0, 0.32, 0],
        torso: [0.3, 0.56, 0],
        head: [0, -1.2, 0],
        shoulderR: [-0.3, 0, -1.2],
        elbowR: [0, 0, -0.52],
        shoulderL: [0.95, 0, 0.72],
        elbowL: [0, 0, 1.25],
        hipR: [-0.38, 0, 0.15],
        kneeR: [1.12, 0, 0],
        hipL: [0.52, 0, -0.12],
        kneeL: [0.26, 0, 0],
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

function createJerseyTexture(
  baseColor: number,
  accentColor: number,
  numberText: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof ctx.fillRect !== 'function') {
    const fallback = new THREE.CanvasTexture(canvas);
    fallback.colorSpace = THREE.SRGBColorSpace;
    return fallback;
  }

  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const base = new THREE.Color(baseColor);
  const accent = new THREE.Color(accentColor);
  const white = '#f5f7fb';
  const gray = '#d8dde6';
  const dark = '#0f172a';

  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = `#${accent.getHexString()}`;
  ctx.fillRect(0, 0, canvas.width, 54);
  ctx.fillRect(0, canvas.height - 54, canvas.width, 54);
  ctx.fillRect(0, 0, 54, canvas.height);
  ctx.fillRect(canvas.width - 54, 0, 54, canvas.height);

  ctx.fillStyle = gray;
  ctx.fillRect(120, 170, canvas.width - 240, 26);
  ctx.fillRect(120, 314, canvas.width - 240, 18);

  ctx.fillStyle = white;
  ctx.fillRect(150, 220, canvas.width - 300, 100);
  ctx.fillStyle = dark;
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 12;
  ctx.strokeRect(165, 235, canvas.width - 330, 70);

  ctx.fillStyle = '#e11d48';
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 116);
  ctx.lineTo(canvas.width / 2 - 44, 170);
  ctx.lineTo(canvas.width / 2 + 44, 170);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 110px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(numberText, canvas.width / 2, canvas.height / 2 + 28);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 44px sans-serif';
  ctx.fillText('ACE', canvas.width / 2, 208);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function createJerseyMaterial(appearance: GolferAppearance): THREE.MeshStandardMaterial {
  const texture = createJerseyTexture(
    appearance.shirtColor,
    appearance.accentColor ?? 0xe02b20,
    String(Math.max(0, Math.round(appearance.jerseyNumber || 1)))
  );

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.72,
    metalness: 0.04,
    color: 0xffffff,
  });
}

export const FACE_MODEL_URL = '/models/facecap.glb';
export const FACE_MODEL_MORPH_TARGETS = [
  'browInnerUp',
  'browDown_L',
  'browDown_R',
  'browOuterUp_L',
  'browOuterUp_R',
  'eyeLookUp_L',
  'eyeLookUp_R',
  'eyeLookDown_L',
  'eyeLookDown_R',
  'eyeLookIn_L',
  'eyeLookIn_R',
  'eyeLookOut_L',
  'eyeLookOut_R',
  'eyeBlink_L',
  'eyeBlink_R',
  'eyeSquint_L',
  'eyeSquint_R',
  'eyeWide_L',
  'eyeWide_R',
  'cheekPuff',
  'cheekSquint_L',
  'cheekSquint_R',
  'noseSneer_L',
  'noseSneer_R',
  'jawOpen',
  'jawForward',
  'jawLeft',
  'jawRight',
  'mouthFunnel',
  'mouthPucker',
  'mouthLeft',
  'mouthRight',
  'mouthRollUpper',
  'mouthRollLower',
  'mouthShrugUpper',
  'mouthShrugLower',
  'mouthClose',
  'mouthSmile_L',
  'mouthSmile_R',
  'mouthFrown_L',
  'mouthFrown_R',
  'mouthDimple_L',
  'mouthDimple_R',
  'mouthUpperUp_L',
  'mouthUpperUp_R',
  'mouthLowerDown_L',
  'mouthLowerDown_R',
  'mouthPress_L',
  'mouthPress_R',
  'mouthStretch_L',
  'mouthStretch_R',
  'tongueOut',
] as const;

export class Face {
  private static modelLoader?: GLTFLoader;
  private static sharedKTX2Loader?: KTX2Loader;

  readonly root = new THREE.Group();
  private config: FaceConfig;
  private faceMesh?: THREE.Mesh & {
    morphTargetDictionary?: Record<string, number>;
    morphTargetInfluences?: number[];
  };
  private hairRoot?: THREE.Group;
  private readonly baselineTransforms = new Map<
    THREE.Object3D,
    { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }
  >();
  private readonly faceParts = {
    head: undefined as THREE.Mesh | undefined,
    jaw: undefined as THREE.Mesh | undefined,
    cheeks: {
      left: undefined as THREE.Mesh | undefined,
      right: undefined as THREE.Mesh | undefined,
    },
    eyes: {
      left: {
        white: undefined as THREE.Mesh | undefined,
        iris: undefined as THREE.Mesh | undefined,
        eyelid: undefined as THREE.Mesh | undefined,
      },
      right: {
        white: undefined as THREE.Mesh | undefined,
        iris: undefined as THREE.Mesh | undefined,
        eyelid: undefined as THREE.Mesh | undefined,
      },
    },
    brows: {
      left: undefined as THREE.Mesh | undefined,
      right: undefined as THREE.Mesh | undefined,
    },
    nose: undefined as THREE.Mesh | undefined,
    mouth: undefined as THREE.Mesh | undefined,
    hairRoot: undefined as THREE.Group | undefined,
  };
  readonly ready: Promise<void>;

  static getModelLoader(): GLTFLoader {
    if (!Face.modelLoader) {
      const loader = new GLTFLoader();
      loader.setKTX2Loader(Face.getSharedKTX2Loader());
      loader.setMeshoptDecoder(MeshoptDecoder);
      Face.modelLoader = loader;
    }
    return Face.modelLoader;
  }

  static getSharedKTX2Loader(): KTX2Loader {
    if (!Face.sharedKTX2Loader) {
      const loader = new KTX2Loader();
      loader.setTranscoderPath('/node_modules/three/examples/jsm/libs/basis/');
      Face.sharedKTX2Loader = loader;
    }
    return Face.sharedKTX2Loader;
  }

  constructor(config: Partial<FaceConfig> = {}) {
    this.config = { ...FACE_PRESETS.male, ...config };
    this.config.hairStyle = this.normalizeHairStyle(this.config.hairStyle);
    this.root.visible = true;
    this.buildLegacyFallbackHead();
    const debugState = {
      preset: this.config.preset,
      hairStyle: this.config.hairStyle,
      headScale: this.config.headScale,
      jawWidth: this.config.jawWidth,
      chinShape: this.config.chinShape,
      faceMesh: null,
      visible: this.root.visible,
    };
    console.warn('[Face] constructor start', debugState);
    if (typeof window !== 'undefined') {
      (window as Window & { __faceDebug?: Record<string, unknown> }).__faceDebug = {
        ...(window as Window & { __faceDebug?: Record<string, unknown> }).__faceDebug,
        last: debugState,
      };
    }
    this.ready = Promise.resolve().then(() => {
      this.root.visible = true;
      this.apply();
      this.debugObjectState('procedural face active');
    });
  }

  getMorphTargetNames(): string[] {
    return [...FACE_MODEL_MORPH_TARGETS];
  }

  private normalizeHairStyle(style: HairStyle | undefined): HairStyle {
    if (style === 'short' || style === 'cap' || style === 'visor') {
      return 'shortCrop';
    }
    return style ?? 'shortCrop';
  }

  private buildLegacyFallbackHead() {
    this.root.clear();
    this.faceMesh = undefined;
    this.baselineTransforms.clear();

    const skin = new THREE.MeshStandardMaterial({
      color: this.config.skinTone,
      roughness: 0.72,
      metalness: 0.04,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 26, 24), skin);
    head.name = 'head-part';
    head.scale.set(1.12, 1.34, 1.06);
    head.position.y = 0.04;
    head.castShadow = true;
    this.root.add(head);

    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.118, 20, 18), skin.clone());
    jaw.name = 'jaw-part';
    jaw.scale.set(1.24, 0.96, 1.06);
    jaw.position.set(0, -0.14, 0.05);
    this.root.add(jaw);

    const cheekLeft = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), skin.clone());
    cheekLeft.name = 'cheek-left';
    cheekLeft.scale.set(1.44, 0.96, 0.8);
    cheekLeft.position.set(-0.1, -0.02, 0.1);
    this.root.add(cheekLeft);

    const cheekRight = cheekLeft.clone();
    cheekRight.name = 'cheek-right';
    cheekRight.position.x = 0.1;
    this.root.add(cheekRight);

    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f7ff, roughness: 0.25 });
    const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), eyeMaterial);
    eyeLeft.name = 'eye-white-left';
    eyeLeft.position.set(-0.058, 0.03, 0.12);
    this.root.add(eyeLeft);

    const eyeRight = eyeLeft.clone();
    eyeRight.name = 'eye-white-right';
    eyeRight.position.x = 0.058;
    this.root.add(eyeRight);

    const irisMaterial = new THREE.MeshStandardMaterial({ color: 0x5a7a45, roughness: 0.5 });
    const irisLeft = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 10), irisMaterial);
    irisLeft.name = 'iris-left';
    irisLeft.position.set(-0.058, 0.03, 0.146);
    this.root.add(irisLeft);

    const irisRight = irisLeft.clone();
    irisRight.name = 'iris-right';
    irisRight.position.x = 0.058;
    this.root.add(irisRight);

    const browMaterial = new THREE.MeshStandardMaterial({ color: 0x433129, roughness: 0.85 });
    const browLeft = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.018, 0.01), browMaterial);
    browLeft.name = 'brow-left';
    browLeft.position.set(-0.06, 0.086, 0.124);
    browLeft.rotation.z = 0.12;
    this.root.add(browLeft);

    const browRight = browLeft.clone();
    browRight.name = 'brow-right';
    browRight.position.x = 0.06;
    browRight.rotation.z = -0.12;
    this.root.add(browRight);

    const eyelidLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.014, 0.014),
      new THREE.MeshStandardMaterial({ color: this.config.skinTone, roughness: 0.75 })
    );
    eyelidLeft.name = 'eyelid-left';
    eyelidLeft.position.set(-0.05, 0.05, 0.106);
    eyelidLeft.rotation.z = 0.08;
    this.root.add(eyelidLeft);

    const eyelidRight = eyelidLeft.clone();
    eyelidRight.name = 'eyelid-right';
    eyelidRight.position.x = 0.05;
    eyelidRight.rotation.z = -0.08;
    this.root.add(eyelidRight);

    const nose = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.016, 0.072, 8, 12),
      new THREE.MeshStandardMaterial({ color: this.config.skinTone, roughness: 0.8 })
    );
    nose.name = 'nose-part';
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.012, 0.148);
    nose.scale.set(0.95, 0.98, 1.1);
    this.root.add(nose);

    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.024, 0.004, 8, 28, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xc68080, roughness: 0.9 })
    );
    mouth.name = 'mouth-part';
    mouth.position.set(0, -0.12, 0.124);
    mouth.rotation.z = Math.PI;
    this.root.add(mouth);

    this.faceParts.head = head;
    this.faceParts.jaw = jaw;
    this.faceParts.cheeks.left = cheekLeft;
    this.faceParts.cheeks.right = cheekRight;
    this.faceParts.eyes.left.white = eyeLeft;
    this.faceParts.eyes.left.iris = irisLeft;
    this.faceParts.eyes.left.eyelid = eyelidLeft;
    this.faceParts.eyes.right.white = eyeRight;
    this.faceParts.eyes.right.iris = irisRight;
    this.faceParts.eyes.right.eyelid = eyelidRight;
    this.faceParts.brows.left = browLeft;
    this.faceParts.brows.right = browRight;
    this.faceParts.nose = nose;
    this.faceParts.mouth = mouth;
    this.faceParts.hairRoot = this.hairRoot ?? new THREE.Group();

    [
      head,
      jaw,
      cheekLeft,
      cheekRight,
      eyeLeft,
      eyeRight,
      irisLeft,
      irisRight,
      browLeft,
      browRight,
      eyelidLeft,
      eyelidRight,
      nose,
      mouth,
    ].forEach((part) => this.captureBaseline(part));

    this.addHair();
    console.warn('[Face] fallback head built');
    this.debugObjectState('fallback head created');
  }

  private getSkullMetrics() {
    const headPart = this.root.getObjectByName('head-part') as THREE.Mesh | undefined;
    const headScale = headPart?.scale ?? new THREE.Vector3(1.12, 1.34, 1.06);
    const center = headPart?.position ?? new THREE.Vector3(0, 0.04, 0);
    const width = 0.32 * headScale.x;
    const height = 0.44 * headScale.y;
    const depth = 0.32 * headScale.z;

    return {
      width,
      height,
      depth,
      center,
      topY: center.y + height * 0.48,
      frontZ: center.z + depth * 0.42,
      backZ: center.z - depth * 0.56,
    };
  }

  private createHairCap(material: THREE.MeshStandardMaterial, options: { thin?: boolean } = {}) {
    const metrics = this.getSkullMetrics();
    const cap = new THREE.Group();
    cap.name = 'hair-cap';

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(metrics.width * 0.5, 24, 18, 0, Math.PI * 2, 0.2, 1.1),
      material
    );
    shell.name = 'hair-cap-shell';
    shell.scale.set(1.0, options.thin ? 0.65 : 0.8, 1.04);
    shell.position.set(
      metrics.center.x,
      metrics.center.y + metrics.height * 0.1,
      metrics.center.z - metrics.depth * 0.02
    );
    cap.add(shell);

    const front = new THREE.Mesh(
      new THREE.SphereGeometry(metrics.width * 0.26, 18, 12, 0, Math.PI * 2, 0.2, 0.88),
      material
    );
    front.name = 'hair-cap-front';
    front.scale.set(1.1, 0.45, 0.7);
    front.position.set(
      0,
      metrics.topY - metrics.height * 0.18,
      metrics.frontZ - metrics.depth * 0.08
    );
    cap.add(front);

    const left = new THREE.Mesh(
      new THREE.SphereGeometry(metrics.width * 0.18, 18, 12, 0, Math.PI * 2, 0.18, 0.8),
      material
    );
    left.name = 'hair-cap-left';
    left.scale.set(0.86, 0.56, 0.86);
    left.position.set(-metrics.width * 0.56, metrics.center.y + metrics.height * 0.12, 0.0);
    cap.add(left);

    const right = left.clone();
    right.name = 'hair-cap-right';
    right.position.x = metrics.width * 0.56;
    cap.add(right);

    return cap;
  }

  private createPonytail(material: THREE.MeshStandardMaterial) {
    const metrics = this.getSkullMetrics();
    const cap = this.createHairCap(material, { thin: false });
    cap.name = 'hair-ponytail-cap';

    const gather = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.024, metrics.width * 0.14), 16, 12),
      material
    );
    gather.name = 'hair-ponytail-gather';
    gather.position.set(
      metrics.center.x,
      metrics.center.y + metrics.height * 0.18,
      metrics.center.z - metrics.depth * 0.52
    );

    const tailMaterial = material.clone();
    tailMaterial.color = material.color.clone();

    const base = gather.position.clone();
    const midBack = base.clone().add(new THREE.Vector3(0, -0.08, -0.1));
    const midDown = base.clone().add(new THREE.Vector3(0, -0.24, -0.18));
    const end = base.clone().add(new THREE.Vector3(0, -0.44, -0.3));

    const curveA = new THREE.CatmullRomCurve3([base, midBack, midDown, end]);
    const segA = new THREE.Mesh(new THREE.TubeGeometry(curveA, 14, 0.028, 8, false), tailMaterial);
    segA.name = 'hair-ponytail-tail-a';

    const curveB = new THREE.CatmullRomCurve3([
      end.clone().add(new THREE.Vector3(0, -0.02, 0.02)),
      end.clone().add(new THREE.Vector3(0, -0.12, -0.04)),
      end.clone().add(new THREE.Vector3(0, -0.26, -0.1)),
      end.clone().add(new THREE.Vector3(0, -0.38, -0.18)),
    ]);
    const segB = new THREE.Mesh(new THREE.TubeGeometry(curveB, 12, 0.02, 8, false), tailMaterial);
    segB.name = 'hair-ponytail-tail-b';

    const tailRoot = new THREE.Group();
    tailRoot.name = 'hair-ponytail-tail';
    tailRoot.add(segA, segB);

    return { cap, gather, tail: tailRoot };
  }

  private addHair() {
    if (this.hairRoot) {
      this.hairRoot.removeFromParent();
    }

    const hairRoot = new THREE.Group();
    hairRoot.name = 'hair-root';
    this.root.add(hairRoot);
    this.hairRoot = hairRoot;

    const hairStyle = this.normalizeHairStyle(this.config.hairStyle);
    const hairMaterial = new THREE.MeshStandardMaterial({
      color: this.config.hairColor,
      roughness: 0.94,
      metalness: 0.04,
    });

    if (hairStyle === 'bald') {
      console.log('[procedural hair]', {
        style: hairStyle,
        children: hairRoot.children.map((child) => ({
          name: child.name,
          position: child.position.toArray(),
          scale: child.scale.toArray(),
        })),
      });
      return;
    }

    if (hairStyle === 'buzzCut') {
      const metrics = this.getSkullMetrics();
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(metrics.width * 0.46, 22, 16, 0, Math.PI * 2, 0.22, 1.1),
        hairMaterial
      );
      shell.name = 'hair-buzz-shell';
      shell.scale.set(1.0, 0.64, 1.04);
      shell.position.set(
        metrics.center.x,
        metrics.center.y + metrics.height * 0.12,
        metrics.center.z - metrics.depth * 0.02
      );
      hairRoot.add(shell);
      console.log('[procedural hair]', {
        style: hairStyle,
        children: hairRoot.children.map((child) => ({
          name: child.name,
          position: child.position.toArray(),
          scale: child.scale.toArray(),
        })),
      });
      return;
    }

    if (hairStyle === 'shortCrop') {
      const cap = this.createHairCap(hairMaterial, { thin: false });
      cap.name = 'hair-short-cap';
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.08, 18, 12), hairMaterial);
      top.name = 'hair-short-top';
      top.scale.set(1.2, 0.52, 0.9);
      top.position.set(0, this.getSkullMetrics().topY - 0.02, 0.04);
      hairRoot.add(cap, top);
      console.log('[procedural hair]', {
        style: hairStyle,
        children: hairRoot.children.map((child) => ({
          name: child.name,
          position: child.position.toArray(),
          scale: child.scale.toArray(),
        })),
      });
      return;
    }

    if (hairStyle === 'ponytail') {
      const ponytail = this.createPonytail(hairMaterial);
      hairRoot.add(ponytail.cap, ponytail.gather, ponytail.tail);
      console.log('[procedural hair]', {
        style: hairStyle,
        children: hairRoot.children.map((child) => ({
          name: child.name,
          position: child.position.toArray(),
          scale: child.scale.toArray(),
        })),
      });
      return;
    }

    if (hairStyle === 'undercut') {
      const cap = this.createHairCap(hairMaterial, { thin: false });
      cap.name = 'hair-undercut-cap';
      const left = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 12), hairMaterial);
      left.name = 'hair-undercut-left';
      left.scale.set(0.95, 0.56, 0.8);
      left.position.set(-0.1, 0.05, 0.04);
      const right = left.clone();
      right.name = 'hair-undercut-right';
      right.position.x = 0.1;
      hairRoot.add(cap, left, right);
      console.log('[procedural hair]', {
        style: hairStyle,
        children: hairRoot.children.map((child) => ({
          name: child.name,
          position: child.position.toArray(),
          scale: child.scale.toArray(),
        })),
      });
      return;
    }

    if (hairStyle === 'sidePart') {
      const cap = this.createHairCap(hairMaterial, { thin: false });
      cap.name = 'hair-sidepart-cap';
      cap.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name === 'hair-cap-shell') {
          child.name = 'hair-sidepart-shell';
        }
        if (child instanceof THREE.Mesh && child.name === 'hair-cap-front') {
          child.name = 'hair-sidepart-front';
        }
        if (child instanceof THREE.Mesh && child.name === 'hair-cap-left') {
          child.name = 'hair-sidepart-left';
        }
        if (child instanceof THREE.Mesh && child.name === 'hair-cap-right') {
          child.name = 'hair-sidepart-right';
        }
      });

      const sweep = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 12), hairMaterial);
      sweep.name = 'hair-sidepart-sweep';
      sweep.scale.set(1.2, 0.44, 0.9);
      sweep.position.set(0.07, 0.08, 0.08);
      sweep.rotation.z = -0.2;
      hairRoot.add(cap, sweep);
      console.log('[procedural hair]', {
        style: hairStyle,
        pieces: hairRoot.children.map((child) => child.name),
      });
      return;
    }

    const cap = this.createHairCap(hairMaterial, { thin: false });
    cap.name = 'hair-cap';
    hairRoot.add(cap);
    console.log('[procedural hair]', {
      style: hairStyle,
      children: hairRoot.children.map((child) => ({
        name: child.name,
        position: child.position.toArray(),
        scale: child.scale.toArray(),
      })),
    });
  }

  debugReport(label: string) {
    if (!this.faceMesh) {
      console.log(`[${label}] Face model pending`, {
        visible: this.root.visible,
        childCount: this.root.children.length,
        children: this.root.children.map((child) => child.name || child.type),
      });
      return;
    }
    const names = Object.keys(this.faceMesh.morphTargetDictionary ?? {}).map((key) =>
      key.replace('blendShape1.', '')
    );
    console.log(`[${label}] Face morph targets`, {
      visible: this.root.visible,
      childCount: this.root.children.length,
      faceMeshName: this.faceMesh.name,
      morphTargets: names.slice(0, 20),
      morphTargetCount: names.length,
    });
  }

  debugObjectState(label: string) {
    const names = this.root.children.map((child) => child.name || child.type);
    const payload = {
      visible: this.root.visible,
      childCount: this.root.children.length,
      childNames: names,
      hasFaceMesh: !!this.faceMesh,
      faceMeshName: this.faceMesh?.name,
      morphTargetCount: this.faceMesh
        ? Object.keys(this.faceMesh.morphTargetDictionary ?? {}).length
        : 0,
    };
    console.warn(`[${label}] Face root`, payload);
    if (typeof window !== 'undefined') {
      (window as Window & { __faceDebug?: Record<string, unknown> }).__faceDebug = {
        ...(window as Window & { __faceDebug?: Record<string, unknown> }).__faceDebug,
        last: payload,
      };
    }
  }

  private captureBaseline(object: THREE.Object3D) {
    this.baselineTransforms.set(object, {
      position: object.position.clone(),
      rotation: object.rotation.clone(),
      scale: object.scale.clone(),
    });
  }

  private debugParameterUpdate(parameter: string, value: number, affectedObjects: string[]) {
    console.info('[face parameter update]', {
      parameter,
      value,
      affectedObjects,
    });
  }

  setConfig(config: Partial<FaceConfig>) {
    this.config = { ...this.config, ...config };
    this.config.hairStyle = this.normalizeHairStyle(this.config.hairStyle);
    (
      [
        'headScale',
        'jawWidth',
        'chinShape',
        'brow',
        'nose',
        'eyeSpacing',
        'mouth',
        'beard',
        'stubble',
      ] as FaceParameterKey[]
    ).forEach((key) => {
      const value = this.config[key];
      this.config[key] = clampFaceParameterValue(key, value);
      if (typeof value === 'number') {
        const affectedObjects = this.getAffectedObjectsForParameter(key as keyof FaceConfig);
        this.debugParameterUpdate(key, this.config[key], affectedObjects);
      }
    });
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
    this.debugParameterUpdate(feature, value, this.getAffectedObjectsForParameter(feature));
    this.apply();
  }

  resetToPreset(preset: FacePresetId) {
    this.config = { ...FACE_PRESETS[preset], preset };
    this.debugParameterUpdate(
      'preset-reset',
      this.config.jawWidth,
      this.getAffectedObjectsForParameter('jawWidth')
    );
    this.apply();
  }

  dispose() {
    this.root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const material = child.material;
        if (Array.isArray(material)) {
          material.forEach((entry) => entry.dispose());
        } else {
          material.dispose();
        }
      }
    });
    this.root.clear();
  }

  private applyMorph(name: string, value: number) {
    if (!this.faceMesh || !this.faceMesh.morphTargetDictionary) {
      return;
    }

    const dictionary = this.faceMesh.morphTargetDictionary;
    const key = Object.keys(dictionary).find((entry) => {
      const morphName = entry.replace('blendShape1.', '');
      return morphName === name;
    });

    if (!key || this.faceMesh.morphTargetInfluences === undefined) {
      return;
    }

    const index = dictionary[key];
    if (typeof index === 'number') {
      this.faceMesh.morphTargetInfluences[index] = value;
    }
  }

  private getAffectedObjectsForParameter(parameter: keyof FaceConfig): string[] {
    const mapping: Record<string, string[]> = {
      headScale: ['head-part'],
      jawWidth: ['jaw-part'],
      chinShape: ['jaw-part'],
      brow: ['brow-left', 'brow-right'],
      nose: ['nose-part'],
      eyeSpacing: [
        'eye-white-left',
        'iris-left',
        'eyelid-left',
        'eye-white-right',
        'iris-right',
        'eyelid-right',
      ],
      mouth: ['mouth-part'],
      beard: ['beard-part'],
      stubble: ['stubble-part'],
    };

    return mapping[parameter as string] ?? [];
  }

  private apply() {
    (
      [
        'headScale',
        'jawWidth',
        'chinShape',
        'brow',
        'nose',
        'eyeSpacing',
        'mouth',
        'beard',
        'stubble',
      ] as FaceParameterKey[]
    ).forEach((key) => {
      this.config[key] = clampFaceParameterValue(key, this.config[key]);
    });

    this.root.scale.setScalar(Math.max(0.2, this.config.headScale ?? 1));
    const hairstyle = this.normalizeHairStyle(this.config.hairStyle);
    this.config.hairStyle = hairstyle;
    this.addHair();

    const headPart = this.faceParts.head;
    if (headPart) {
      const baseline = this.baselineTransforms.get(headPart) ?? {
        position: headPart.position.clone(),
        rotation: headPart.rotation.clone(),
        scale: headPart.scale.clone(),
      };
      const headScaleFactor = 1.06 + (this.config.headScale - 1) * 0.5;
      const headYFactor = 1.18 + (this.config.headScale - 1) * 0.52;
      const headZFactor = 0.98 + (this.config.headScale - 1) * 0.3;
      headPart.scale.set(
        (baseline.scale.x * headScaleFactor) / 1.12,
        (baseline.scale.y * headYFactor) / 1.34,
        (baseline.scale.z * headZFactor) / 1.06
      );
      headPart.position.set(
        baseline.position.x,
        baseline.position.y + (this.config.headScale - 1) * 0.014,
        baseline.position.z
      );
    }

    const jaw = this.faceParts.jaw;
    if (jaw) {
      const baseline = this.baselineTransforms.get(jaw) ?? {
        position: jaw.position.clone(),
        rotation: jaw.rotation.clone(),
        scale: jaw.scale.clone(),
      };
      const jawScaleX = mapFaceParameterToGeometry('jawWidth', this.config.jawWidth);
      const chinScaleY = mapFaceParameterToGeometry('chinShape', this.config.chinShape);
      jaw.scale.set(
        baseline.scale.x * jawScaleX,
        baseline.scale.y * chinScaleY,
        baseline.scale.z * 0.96
      );
      jaw.position.set(
        baseline.position.x,
        baseline.position.y - (this.config.chinShape - 1) * 0.04,
        baseline.position.z + 0.02 - 0.05 + 0.05
      );
    }

    const cheekLeft = this.faceParts.cheeks.left;
    const cheekRight = this.faceParts.cheeks.right;
    if (cheekLeft && cheekRight) {
      const leftBaseline = this.baselineTransforms.get(cheekLeft) ?? {
        position: cheekLeft.position.clone(),
        rotation: cheekLeft.rotation.clone(),
        scale: cheekLeft.scale.clone(),
      };
      const rightBaseline = this.baselineTransforms.get(cheekRight) ?? {
        position: cheekRight.position.clone(),
        rotation: cheekRight.rotation.clone(),
        scale: cheekRight.scale.clone(),
      };
      cheekLeft.position.set(
        leftBaseline.position.x,
        leftBaseline.position.y,
        leftBaseline.position.z
      );
      cheekRight.position.set(
        rightBaseline.position.x,
        rightBaseline.position.y,
        rightBaseline.position.z
      );
      cheekLeft.scale.set(leftBaseline.scale.x, leftBaseline.scale.y, leftBaseline.scale.z);
      cheekRight.scale.set(rightBaseline.scale.x, rightBaseline.scale.y, rightBaseline.scale.z);
    }

    const eyeLeftWhite = this.faceParts.eyes.left.white;
    const eyeRightWhite = this.faceParts.eyes.right.white;
    if (eyeLeftWhite && eyeRightWhite) {
      const leftBaseline = this.baselineTransforms.get(eyeLeftWhite) ?? {
        position: eyeLeftWhite.position.clone(),
        rotation: eyeLeftWhite.rotation.clone(),
        scale: eyeLeftWhite.scale.clone(),
      };
      const rightBaseline = this.baselineTransforms.get(eyeRightWhite) ?? {
        position: eyeRightWhite.position.clone(),
        rotation: eyeRightWhite.rotation.clone(),
        scale: eyeRightWhite.scale.clone(),
      };
      const eyeSpacing = clampFaceParameterValue('eyeSpacing', this.config.eyeSpacing);
      const eyeStride = 0.052 + (1 - eyeSpacing) * 0.056;
      eyeLeftWhite.position.set(-eyeStride, leftBaseline.position.y, leftBaseline.position.z);
      eyeRightWhite.position.set(eyeStride, rightBaseline.position.y, rightBaseline.position.z);
      const eyeScale = 0.9 + eyeSpacing * 0.44;
      eyeLeftWhite.scale.set(
        leftBaseline.scale.x * eyeScale,
        leftBaseline.scale.y * eyeScale,
        leftBaseline.scale.z * (0.95 + eyeSpacing * 0.25)
      );
      eyeRightWhite.scale.set(
        rightBaseline.scale.x * eyeScale,
        rightBaseline.scale.y * eyeScale,
        rightBaseline.scale.z * (0.95 + eyeSpacing * 0.25)
      );

      const irisLeft = this.faceParts.eyes.left.iris;
      const irisRight = this.faceParts.eyes.right.iris;
      if (irisLeft && irisRight) {
        const leftIrisBaseline = this.baselineTransforms.get(irisLeft) ?? {
          position: irisLeft.position.clone(),
          rotation: irisLeft.rotation.clone(),
          scale: irisLeft.scale.clone(),
        };
        const rightIrisBaseline = this.baselineTransforms.get(irisRight) ?? {
          position: irisRight.position.clone(),
          rotation: irisRight.rotation.clone(),
          scale: irisRight.scale.clone(),
        };
        irisLeft.position.set(-eyeStride, leftIrisBaseline.position.y, leftIrisBaseline.position.z);
        irisRight.position.set(
          eyeStride,
          rightIrisBaseline.position.y,
          rightIrisBaseline.position.z
        );
        irisLeft.scale.set(
          leftIrisBaseline.scale.x * eyeScale,
          leftIrisBaseline.scale.y * eyeScale,
          leftIrisBaseline.scale.z * 1.05
        );
        irisRight.scale.set(
          rightIrisBaseline.scale.x * eyeScale,
          rightIrisBaseline.scale.y * eyeScale,
          rightIrisBaseline.scale.z * 1.05
        );
      }

      const leftEyelid = this.faceParts.eyes.left.eyelid;
      const rightEyelid = this.faceParts.eyes.right.eyelid;
      if (leftEyelid && rightEyelid) {
        const leftEyelidBaseline = this.baselineTransforms.get(leftEyelid) ?? {
          position: leftEyelid.position.clone(),
          rotation: leftEyelid.rotation.clone(),
          scale: leftEyelid.scale.clone(),
        };
        const rightEyelidBaseline = this.baselineTransforms.get(rightEyelid) ?? {
          position: rightEyelid.position.clone(),
          rotation: rightEyelid.rotation.clone(),
          scale: rightEyelid.scale.clone(),
        };
        leftEyelid.position.set(
          -eyeStride,
          leftEyelidBaseline.position.y,
          leftEyelidBaseline.position.z
        );
        rightEyelid.position.set(
          eyeStride,
          rightEyelidBaseline.position.y,
          rightEyelidBaseline.position.z
        );
        leftEyelid.scale.set(
          leftEyelidBaseline.scale.x * eyeScale,
          leftEyelidBaseline.scale.y * eyeScale,
          leftEyelidBaseline.scale.z * 1.05
        );
        rightEyelid.scale.set(
          rightEyelidBaseline.scale.x * eyeScale,
          rightEyelidBaseline.scale.y * eyeScale,
          rightEyelidBaseline.scale.z * 1.05
        );
      }
    }

    const browLeft = this.faceParts.brows.left;
    const browRight = this.faceParts.brows.right;
    if (browLeft && browRight) {
      const eyeSpacing = clampFaceParameterValue('eyeSpacing', this.config.eyeSpacing);
      const brow = clampFaceParameterValue('brow', this.config.brow);
      const eyeStride = 0.052 + (1 - eyeSpacing) * 0.056;
      const baseLeftX = this.baselineTransforms.get(browLeft)?.position.x ?? browLeft.position.x;
      const baseRightX = this.baselineTransforms.get(browRight)?.position.x ?? browRight.position.x;
      const browLift = 0.07 + (brow - 0.5) * 0.05;
      const baseLeftScaleX = this.baselineTransforms.get(browLeft)?.scale.x ?? browLeft.scale.x;
      const baseRightScaleX = this.baselineTransforms.get(browRight)?.scale.x ?? browRight.scale.x;
      browLeft.position.set(-eyeStride + (baseLeftX + 0.06) * 0.1, browLift, browLeft.position.z);
      browRight.position.set(eyeStride + (baseRightX - 0.06) * 0.1, browLift, browRight.position.z);
      browLeft.scale.x = baseLeftScaleX * (0.98 + brow * 0.52);
      browRight.scale.x = baseRightScaleX * (0.98 + brow * 0.52);
      browLeft.rotation.z = 0.34 + (brow - 1) * 0.12;
      browRight.rotation.z = -0.34 - (brow - 1) * 0.12;
    }

    const nose = this.faceParts.nose;
    if (nose) {
      const noseSize = clampFaceParameterValue('nose', this.config.nose);
      const baseline = this.baselineTransforms.get(nose) ?? {
        position: nose.position.clone(),
        rotation: nose.rotation.clone(),
        scale: nose.scale.clone(),
      };
      nose.scale.set(
        (baseline.scale.x * (1.06 + noseSize * 0.92)) / 0.95,
        (baseline.scale.y * (1.18 + noseSize * 1.06)) / 0.98,
        (baseline.scale.z * (0.92 + (noseSize - 0.5) * 1.08)) / 1.1
      );
      nose.position.set(
        baseline.position.x,
        baseline.position.y + (noseSize - 0.5) * 0.03,
        baseline.position.z + (noseSize - 0.5) * 0.08
      );
    }

    const mouth = this.faceParts.mouth;
    if (mouth) {
      const mouthSize = clampFaceParameterValue('mouth', this.config.mouth);
      const baseline = this.baselineTransforms.get(mouth) ?? {
        position: mouth.position.clone(),
        rotation: mouth.rotation.clone(),
        scale: mouth.scale.clone(),
      };
      const mouthScaleX = 1.06 + (mouthSize - 0.5) * 1.15;
      const mouthScaleY = 0.86 + (mouthSize - 0.5) * 0.5;
      mouth.scale.set(
        baseline.scale.x * mouthScaleX,
        baseline.scale.y * mouthScaleY,
        baseline.scale.z * 1.08
      );
      mouth.position.set(
        baseline.position.x,
        baseline.position.y - (mouthSize - 0.5) * 0.012,
        baseline.position.z + (mouthSize - 0.5) * 0.018
      );
      mouth.rotation.z = Math.PI + (mouthSize - 0.5) * 0.75;
    }

    const beard = this.root.getObjectByName('beard-part');
    if (beard instanceof THREE.Mesh) {
      beard.visible = this.config.beard > 0.04;
      beard.scale.set(
        1.08 + this.config.beard * 0.9,
        0.62 + this.config.beard * 1.3,
        0.9 + this.config.beard * 0.45
      );
      beard.position.set(0, -0.116 - this.config.beard * 0.04, 0.032 + this.config.beard * 0.02);
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
        -0.088 - this.config.stubble * 0.02,
        0.092 + this.config.stubble * 0.02
      );
    }

    if (!this.faceMesh || !this.faceMesh.morphTargetDictionary) {
      return;
    }

    const browValue = Math.max(0, Math.min(1, this.config.brow ?? 0.5));
    this.applyMorph('browInnerUp', browValue);
    this.applyMorph('jawOpen', 0.12 * (this.config.jawWidth - 0.9));
    this.applyMorph('mouthClose', 0.5);
    this.applyMorph('mouthSmile_L', Math.max(0, this.config.mouth - 0.5));
    this.applyMorph('mouthSmile_R', Math.max(0, this.config.mouth - 0.5));
  }
}

export class Golfer {
  readonly root = new THREE.Group();

  private joints = new Map<JointName, THREE.Group>();
  private attachPoints = new Map<string, THREE.Object3D>();
  private hand = new THREE.Group();
  private disc!: THREE.Mesh;
  private face!: Face;
  public appearance: GolferAppearance;
  private baseY = 0;
  private look: GolferLook;

  private playing = false;
  private index = 0;
  private elapsed = 0;
  private releasing = false;
  private avatarModelId: AvatarModelId = 'male';
  private avatarModelRoot?: THREE.Group;
  private avatarModelError?: THREE.Group;
  private avatarModelLoading?: THREE.Group;
  private avatarLoadToken = 0;
  private onAvatarStatusChange?: (status: 'loading' | 'loaded' | 'error', message: string) => void;
  private sequence = SEQUENCES.backhand;
  private idleT = 0;
  private idlePhase = Math.random() * 10;
  private accessories = new Map<AccessorySlot, THREE.Group>();

  constructor(look: GolferLook | PartialGolferAppearance = DEFAULT_LOOK) {
    const input = (look as Partial<GolferLook> & PartialGolferAppearance) ?? {};
    this.look = {
      ...DEFAULT_LOOK,
      ...input,
      jersey: input.jersey ?? input.shirtColor ?? DEFAULT_LOOK.jersey,
      accent: input.accent ?? input.accentColor ?? DEFAULT_LOOK.accent,
      shorts: input.shorts ?? input.shortsColor ?? DEFAULT_LOOK.shorts,
      skin: input.skin ?? input.skinTone ?? DEFAULT_LOOK.skin,
      hair: input.hair ?? input.hairColor ?? DEFAULT_LOOK.hair,
      hairStyle: input.hairStyle ?? DEFAULT_LOOK.hairStyle,
      build: input.build ?? 1,
    };
    const normalized = this.normalizeAppearance(look as Partial<GolferAppearance>);
    this.appearance = normalized;
    this.avatarModelId = normalized.avatarModelId ?? 'none';
    this.root.scale.setScalar(GOLFER_SCALE * (this.look.build ?? 1));
    this.build();
    this.applyProfileToRig();
    this.applyPose(STAND_POSE, STAND_POSE, 0);
  }

  private normalizeAppearance(input: PartialGolferAppearance): GolferAppearance {
    const legacy = input as Partial<GolferLook> & Partial<GolferAppearance>;
    const bodyProfile = legacy.bodyProfile ?? legacy.profile?.id ?? 'neutralLean';
    const presetId = legacy.facePreset ?? (bodyProfile === 'athleticFemale' ? 'female' : 'male');
    const facePreset = FACE_PRESETS[presetId] ?? FACE_PRESETS.male;
    const profile = { ...BODY_PROFILES[bodyProfile], ...legacy.profile };
    const outfit = {
      sleeveLength: legacy.sleeveLength ?? legacy.outfit?.sleeveLength ?? 1,
      collarHeight: legacy.collarHeight ?? legacy.outfit?.collarHeight ?? 1,
      shirtFit: legacy.shirtFit ?? legacy.outfit?.shirtFit ?? 1,
      shortsLength: legacy.shortsLength ?? legacy.outfit?.shortsLength ?? 1,
      pantsFit: legacy.pantsFit ?? legacy.outfit?.pantsFit ?? 0.9,
    };
    const face = {
      brow: legacy.brow ?? legacy.face?.brow ?? facePreset.brow,
      nose: legacy.nose ?? legacy.face?.nose ?? facePreset.nose,
      eyeSpacing: legacy.eyeSpacing ?? legacy.face?.eyeSpacing ?? facePreset.eyeSpacing,
      mouth: legacy.mouth ?? legacy.face?.mouth ?? facePreset.mouth,
      beard: legacy.beard ?? legacy.face?.beard ?? facePreset.beard,
      stubble: legacy.stubble ?? legacy.face?.stubble ?? facePreset.stubble,
    };

    const base = buildCharacterAppearance({
      ...legacy,
      bodyProfile,
      profile,
      facePreset: presetId,
      face,
      outfit,
      skinTone: legacy.skinTone ?? legacy.skin ?? facePreset.skinTone,
      hairStyle: (legacy.hairStyle as HairStyle) ?? facePreset.hairStyle,
      hairColor: legacy.hairColor ?? legacy.hair ?? facePreset.hairColor,
      shirtColor: legacy.shirtColor ?? legacy.jersey ?? JERSEY,
      shortsColor: legacy.shortsColor ?? legacy.shorts ?? SHORTS,
      shoeColor: legacy.shoeColor ?? SHOE,
      accentColor: legacy.accentColor ?? legacy.accent ?? 0xd72638,
      jerseyNumber: legacy.jerseyNumber ?? 1,
      brow: face.brow,
      nose: face.nose,
      eyeSpacing: face.eyeSpacing,
      mouth: face.mouth,
      beard: face.beard,
      stubble: face.stubble,
      sleeveLength: outfit.sleeveLength,
      collarHeight: outfit.collarHeight,
      shirtFit: outfit.shirtFit,
      shortsLength: outfit.shortsLength,
      pantsFit: outfit.pantsFit,
    });

    return base;
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
    this.root.clear();
    this.joints.clear();
    this.attachPoints.clear();
    this.accessories.clear();

    if (
      this.avatarModelId !== 'none' &&
      AVATAR_MODEL_URLS[this.avatarModelId as 'male' | 'female']
    ) {
      this.loadModelAvatar(this.avatarModelId as 'male' | 'female');
      return;
    }

    const hips = this.joint('hips', this.root, new THREE.Vector3(0, 0.92, 0));
    const pelvis = limb(0.22, 0.17, this.appearance.shortsColor);
    pelvis.name = 'pelvis-part';
    pelvis.scale.set(1.06, 1, 0.82);
    hips.add(pelvis);

    const torso = this.joint('torso', hips, new THREE.Vector3(0, 0.02, 0));
    const chest = limb(0.42, 0.19, this.appearance.shirtColor);
    chest.name = 'torso-part';
    chest.material = createJerseyMaterial(this.appearance);
    chest.geometry.translate(0, 0.62, 0);
    chest.scale.set(0.98, 1, 0.76);
    torso.add(chest);

    const accentColor = this.appearance.accentColor ?? look.accent ?? DEFAULT_LOOK.accent;
    const collar = limb(0.1, 0.185, accentColor);
    collar.name = 'collar-part';
    collar.geometry.translate(0, 0.78, 0);
    collar.scale.set(1.0, 1, 0.74);
    torso.add(collar);

    const placket = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, 0.22, 0.016),
      new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.8 })
    );
    placket.name = 'placket-part';
    placket.position.set(0, 0.52, 0.148);
    torso.add(placket);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.07, 0.1, 10),
      new THREE.MeshStandardMaterial({ color: this.appearance.skinTone, roughness: 0.75 })
    );
    neck.name = 'neck-part';
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
    this.root.userData.hairRoot = this.face.root.getObjectByName('hair-root') as
      THREE.Group | undefined;
    this.root.userData.faceRoot = this.face.root;
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
      sleeve.material = createJerseyMaterial(this.appearance);
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

  private applyProfileToRig() {
    if (this.avatarModelRoot || this.avatarModelError) {
      return;
    }

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

    const neck = this.root.getObjectByName('neck-part');
    if (neck instanceof THREE.Mesh) {
      neck.scale.set(profile.neckWidth, profile.neckLength, profile.neckWidth);
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

  private findModelBone(root: THREE.Object3D, name: string): THREE.Object3D | undefined {
    let found: THREE.Object3D | undefined;
    root.traverse((child) => {
      if (found) {
        return;
      }
      if (child.name === name) {
        found = child;
      }
    });
    return found;
  }

  setAvatarStateListener(
    listener: ((status: 'loading' | 'loaded' | 'error', message: string) => void) | undefined
  ) {
    this.onAvatarStatusChange = listener;
  }

  getHairRoot(): THREE.Group | undefined {
    const resolved = this.root.getObjectByName('hair-root') as THREE.Group | undefined;
    if (resolved) {
      this.root.userData.hairRoot = resolved;
      return resolved;
    }

    const head = this.joints.get('head');
    const nested = head?.getObjectByName('hair-root') as THREE.Group | undefined;
    if (nested) {
      this.root.userData.hairRoot = nested;
      return nested;
    }

    return undefined;
  }

  setHeadOnlyPreview(enabled: boolean) {
    const groups: Array<JointName> = ['shoulderL', 'shoulderR', 'elbowL', 'elbowR'];
    groups.forEach((name) => {
      const group = this.joints.get(name);
      if (group) {
        group.visible = !enabled;
      }
    });
  }

  private loadModelAvatar(modelId: AvatarModelId) {
    if (modelId === 'none') {
      return;
    }

    const url = AVATAR_MODEL_URLS[modelId];
    if (!url) {
      return;
    }

    const token = ++this.avatarLoadToken;
    console.info(`[Golfer avatar] ${modelId} load start`, {
      url,
      token,
      rootChildren: this.root.children.length,
    });
    this.onAvatarStatusChange?.('loading', `Loading ${modelId} avatar…`);
    this.avatarModelError?.removeFromParent();
    this.avatarModelError = undefined;
    this.avatarModelRoot = undefined;
    this.avatarModelLoading = new THREE.Group();
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: (() => {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 128;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#121821';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#3aa8ff';
            ctx.lineWidth = 8;
            ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
            ctx.fillStyle = '#f4f7fa';
            ctx.font = 'bold 30px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Loading avatar…', canvas.width / 2, canvas.height / 2);
          }
          const texture = new THREE.CanvasTexture(canvas);
          texture.needsUpdate = true;
          return texture;
        })(),
        transparent: true,
        depthTest: false,
      })
    );
    label.scale.set(1.8, 0.45, 1);
    label.position.set(0, 1.1, 0);
    this.avatarModelLoading.add(label);
    this.root.add(this.avatarModelLoading);

    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (token !== this.avatarLoadToken) {
          return;
        }

        const model = gltf.scene.clone(true);
        model.name = `${modelId}-avatar`;
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        const previous = this.avatarModelRoot;
        if (previous) {
          previous.removeFromParent();
        }

        this.avatarModelLoading?.removeFromParent();
        this.avatarModelLoading = undefined;
        this.avatarModelRoot = model;
        this.avatarModelError = undefined;
        this.root.add(model);
        model.position.set(0, -0.45, 0);
        model.rotation.y = 0;
        model.scale.setScalar(1.18);
        model.visible = true;
        console.info(`[Golfer avatar] ${modelId} load success`, {
          token,
          meshCount: model.children.length,
          boundingBox: new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).toArray(),
        });
        this.onAvatarStatusChange?.('loaded', `${modelId} avatar ready`);

        const hand =
          this.findModelBone(model, 'RightHand') ?? this.findModelBone(model, 'rightHand');
        const head = this.findModelBone(model, 'Head') ?? this.findModelBone(model, 'head');
        const back =
          this.findModelBone(model, 'Spine') ?? this.findModelBone(model, 'hips') ?? model;

        if (hand) {
          this.attachPoints.set('rightHand', hand);
          const disc = createDiscVisual(0xe03a2f);
          disc.position.set(0.14, 0.1, 0.02);
          disc.rotation.z = Math.PI / 2;
          disc.scale.setScalar(0.82);
          hand.add(disc);
          this.disc = disc;
        }

        if (head) {
          this.attachPoints.set('head', head);
        }

        this.attachPoints.set('back', back);
        this.attachPoints.set(
          'leftHand',
          this.findModelBone(model, 'LeftHand') ?? this.findModelBone(model, 'leftHand') ?? model
        );
        this.attachPoints.set('rightHandAlt', hand ?? model);

        this.root.position.y = 0;
      },
      undefined,
      (error) => {
        if (token !== this.avatarLoadToken) {
          return;
        }
        console.error(`[Golfer avatar] ${modelId} load failed`, error);
        this.onAvatarStatusChange?.('error', `Avatar load failed: ${modelId}`);
        this.avatarModelLoading?.removeFromParent();
        this.avatarModelLoading = undefined;
        this.avatarModelRoot = undefined;
        this.avatarModelError = new THREE.Group();
        const label = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: (() => {
              const canvas = document.createElement('canvas');
              canvas.width = 512;
              canvas.height = 128;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#f8f8f8';
                ctx.font = 'bold 36px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Avatar load failed', canvas.width / 2, canvas.height / 2);
              }
              const texture = new THREE.CanvasTexture(canvas);
              texture.needsUpdate = true;
              return texture;
            })(),
            transparent: true,
            depthTest: false,
          })
        );
        label.scale.set(1.8, 0.45, 1);
        label.position.set(0, 1.1, 0);
        this.avatarModelError.add(label);
        this.root.add(this.avatarModelError);
      }
    );
  }

  private clearAvatarModelContent() {
    this.avatarModelLoading?.removeFromParent();
    this.avatarModelLoading = undefined;
    this.avatarModelError?.removeFromParent();
    this.avatarModelError = undefined;
    this.avatarModelRoot?.removeFromParent();
    this.avatarModelRoot = undefined;
  }

  setAvatarModelId(modelId: AvatarModelId) {
    this.avatarModelId = modelId;
    this.appearance.avatarModelId = modelId;
    this.attachPoints.clear();
    this.accessories.clear();
    this.joints.clear();
    this.clearAvatarModelContent();
    this.root.visible = true;

    if (modelId === 'none') {
      this.build();
      this.applyProfileToRig();
      this.applyPose(STAND_POSE, STAND_POSE, 0);
      return;
    }

    this.loadModelAvatar(modelId);
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
    if (options.avatarModelId) {
      this.setAvatarModelId(options.avatarModelId);
    }

    const hairRoot = this.getHairRoot();
    if (hairRoot) {
      this.root.userData.hairRoot = hairRoot;
    }

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
    this.root.rotation.y = yaw;
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

    const setup = STAND_POSE;
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
