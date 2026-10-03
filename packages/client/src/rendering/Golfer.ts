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
  armRaise: number;
  armLength: number;
  legLength: number;
  thighLength: number;
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
  | 'eyeSize'
  | 'mouth'
  | 'beard'
  | 'stubble';

export type FaceAdvancedKey =
  | 'headWidth'
  | 'headHeight'
  | 'headDepth'
  | 'headPositionY'
  | 'headPositionZ'
  | 'cheekSize'
  | 'cheekWidth'
  | 'cheekHeight'
  | 'cheekDepth'
  | 'cheekSpacing'
  | 'cheekPositionY'
  | 'cheekPositionZ'
  | 'jawHeight'
  | 'jawDepth'
  | 'jawPositionY'
  | 'jawPositionZ'
  | 'chinSize'
  | 'chinWidth'
  | 'chinHeight'
  | 'chinDepth'
  | 'chinPositionY'
  | 'chinPositionZ'
  | 'eyeWidth'
  | 'eyeHeight'
  | 'eyeDepth'
  | 'eyePositionY'
  | 'eyePositionZ'
  | 'noseWidth'
  | 'noseHeight'
  | 'noseDepth'
  | 'nosePositionY'
  | 'nosePositionZ'
  | 'mouthWidth'
  | 'mouthHeight'
  | 'mouthDepth'
  | 'mouthPositionY'
  | 'mouthPositionZ'
  | 'browWidth'
  | 'browThickness'
  | 'browSpacing'
  | 'browPositionY'
  | 'browAngle'
  | 'hairScale'
  | 'hairWidth'
  | 'hairHeight'
  | 'hairDepth'
  | 'hairPositionY'
  | 'hairPositionZ';

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
  eyeSize: { min: 0.5, max: 1.5, default: 1.0, step: 0.01 },
  mouth: { min: 0.3, max: 1.4, default: 0.42, step: 0.01 },
  beard: { min: 0.0, max: 1.0, default: 0.0, step: 0.01 },
  stubble: { min: 0.0, max: 1.0, default: 0.0, step: 0.01 },
};

export const FACE_ADVANCED_DEFAULTS: Record<FaceAdvancedKey, number> = {
  headWidth: 1,
  headHeight: 1,
  headDepth: 1,
  headPositionY: 0,
  headPositionZ: 0,
  cheekSize: 1,
  cheekWidth: 1,
  cheekHeight: 1,
  cheekDepth: 1,
  cheekSpacing: 1,
  cheekPositionY: 0,
  cheekPositionZ: 0,
  jawHeight: 1,
  jawDepth: 1,
  jawPositionY: 0,
  jawPositionZ: 0,
  chinSize: 1,
  chinWidth: 1,
  chinHeight: 1,
  chinDepth: 1,
  chinPositionY: 0,
  chinPositionZ: 0,
  eyeWidth: 1,
  eyeHeight: 1,
  eyeDepth: 1,
  eyePositionY: 0,
  eyePositionZ: 0,
  noseWidth: 1,
  noseHeight: 1,
  noseDepth: 1,
  nosePositionY: 0,
  nosePositionZ: 0,
  mouthWidth: 1,
  mouthHeight: 1,
  mouthDepth: 1,
  mouthPositionY: 0,
  mouthPositionZ: 0,
  browWidth: 1,
  browThickness: 1,
  browSpacing: 1,
  browPositionY: 0,
  browAngle: 0,
  hairScale: 1,
  hairWidth: 1,
  hairHeight: 1,
  hairDepth: 1,
  hairPositionY: 0,
  hairPositionZ: 0,
};

const FACE_ADVANCED_LIMITS: Record<FaceAdvancedKey, { min: number; max: number }> = {
  headWidth: { min: 0.5, max: 1.5 },
  headHeight: { min: 0.5, max: 1.5 },
  headDepth: { min: 0.5, max: 1.5 },
  headPositionY: { min: -0.1, max: 0.1 },
  headPositionZ: { min: -0.1, max: 0.1 },
  cheekSize: { min: 0.5, max: 1.5 },
  cheekWidth: { min: 0.5, max: 1.5 },
  cheekHeight: { min: 0.5, max: 1.5 },
  cheekDepth: { min: 0.5, max: 1.5 },
  cheekSpacing: { min: 0.5, max: 1.5 },
  cheekPositionY: { min: -0.1, max: 0.1 },
  cheekPositionZ: { min: -0.1, max: 0.1 },
  jawHeight: { min: 0.5, max: 1.5 },
  jawDepth: { min: 0.5, max: 1.5 },
  jawPositionY: { min: -0.1, max: 0.1 },
  jawPositionZ: { min: -0.1, max: 0.1 },
  chinSize: { min: 0.5, max: 1.5 },
  chinWidth: { min: 0.5, max: 1.5 },
  chinHeight: { min: 0.5, max: 1.5 },
  chinDepth: { min: 0.5, max: 1.5 },
  chinPositionY: { min: -0.1, max: 0.1 },
  chinPositionZ: { min: -0.1, max: 0.1 },
  eyeWidth: { min: 0.5, max: 1.5 },
  eyeHeight: { min: 0.5, max: 1.5 },
  eyeDepth: { min: 0.5, max: 1.5 },
  eyePositionY: { min: -0.1, max: 0.1 },
  eyePositionZ: { min: -0.1, max: 0.1 },
  noseWidth: { min: 0.5, max: 1.5 },
  noseHeight: { min: 0.5, max: 1.5 },
  noseDepth: { min: 0.5, max: 1.5 },
  nosePositionY: { min: -0.1, max: 0.1 },
  nosePositionZ: { min: -0.1, max: 0.1 },
  mouthWidth: { min: 0.5, max: 1.5 },
  mouthHeight: { min: 0.5, max: 1.5 },
  mouthDepth: { min: 0.5, max: 1.5 },
  mouthPositionY: { min: -0.1, max: 0.1 },
  mouthPositionZ: { min: -0.1, max: 0.1 },
  browWidth: { min: 0.5, max: 1.5 },
  browThickness: { min: 0.5, max: 1.5 },
  browSpacing: { min: 0.5, max: 1.5 },
  browPositionY: { min: -0.1, max: 0.1 },
  browAngle: { min: -30, max: 30 },
  hairScale: { min: 0.5, max: 1.5 },
  hairWidth: { min: 0.5, max: 1.5 },
  hairHeight: { min: 0.5, max: 1.5 },
  hairDepth: { min: 0.5, max: 1.5 },
  hairPositionY: { min: -0.1, max: 0.1 },
  hairPositionZ: { min: -0.1, max: 0.1 },
};

export function clampFaceParameterValue(key: FaceParameterKey, value: number): number {
  const limit = FACE_PARAMETER_LIMITS[key];
  return THREE.MathUtils.clamp(value, limit.min, limit.max);
}

export function clampFaceAdvancedValue(key: FaceAdvancedKey, value: number): number {
  const limit = FACE_ADVANCED_LIMITS[key];
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
  eyeSize: number;
  mouth: number;
  beard: number;
  stubble: number;
  headWidth: number;
  headHeight: number;
  headDepth: number;
  headPositionY: number;
  headPositionZ: number;
  cheekSize: number;
  cheekWidth: number;
  cheekHeight: number;
  cheekDepth: number;
  cheekSpacing: number;
  cheekPositionY: number;
  cheekPositionZ: number;
  jawHeight: number;
  jawDepth: number;
  jawPositionY: number;
  jawPositionZ: number;
  chinSize: number;
  chinWidth: number;
  chinHeight: number;
  chinDepth: number;
  chinPositionY: number;
  chinPositionZ: number;
  eyeWidth: number;
  eyeHeight: number;
  eyeDepth: number;
  eyePositionY: number;
  eyePositionZ: number;
  noseWidth: number;
  noseHeight: number;
  noseDepth: number;
  nosePositionY: number;
  nosePositionZ: number;
  mouthWidth: number;
  mouthHeight: number;
  mouthDepth: number;
  mouthPositionY: number;
  mouthPositionZ: number;
  browWidth: number;
  browThickness: number;
  browSpacing: number;
  browPositionY: number;
  browAngle: number;
  hairScale: number;
  hairWidth: number;
  hairHeight: number;
  hairDepth: number;
  hairPositionY: number;
  hairPositionZ: number;
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
    eyeSize: number;
    mouth: number;
    beard: number;
    stubble: number;
    headWidth: number;
    headHeight: number;
    headDepth: number;
    headPositionY: number;
    headPositionZ: number;
    cheekSize: number;
    cheekWidth: number;
    cheekHeight: number;
    cheekDepth: number;
    cheekSpacing: number;
    cheekPositionY: number;
    cheekPositionZ: number;
    jawHeight: number;
    jawDepth: number;
    jawPositionY: number;
    jawPositionZ: number;
    chinSize: number;
    chinWidth: number;
    chinHeight: number;
    chinDepth: number;
    chinPositionY: number;
    chinPositionZ: number;
    eyeWidth: number;
    eyeHeight: number;
    eyeDepth: number;
    eyePositionY: number;
    eyePositionZ: number;
    noseWidth: number;
    noseHeight: number;
    noseDepth: number;
    nosePositionY: number;
    nosePositionZ: number;
    mouthWidth: number;
    mouthHeight: number;
    mouthDepth: number;
    mouthPositionY: number;
    mouthPositionZ: number;
    browWidth: number;
    browThickness: number;
    browSpacing: number;
    browPositionY: number;
    browAngle: number;
    hairScale: number;
    hairWidth: number;
    hairHeight: number;
    hairDepth: number;
    hairPositionY: number;
    hairPositionZ: number;
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

// Neutral standing/calibration pose for the BODY preview. Arms hang nearly
// straight down from the shoulders with a slight outward angle and a slight
// elbow bend, mirrored left/right. Gameplay throw poses are separate.
const STAND_POSE: Pose = {
  rootYaw: 0,
  rootLift: 0,
  joints: {
    hips: [0, 0, 0],
    torso: [0.08, 0, 0],
    head: [0, -0.12, 0],
    shoulderR: [0.02, 0, -0.34],
    elbowR: [0.01, 0, -0.12],
    shoulderL: [0.02, 0, 0.34],
    elbowL: [0.01, 0, 0.12],
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
    armRaise: 0,
    armLength: 1,
    thighLength: 1,
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
    armRaise: 0,
    armLength: 1,
    thighLength: 1,
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
    armRaise: 0,
    armLength: 1,
    thighLength: 1,
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
    eyeSize: overrides.face?.eyeSize ?? facePreset.eyeSize,
    mouth: overrides.mouth ?? overrides.face?.mouth ?? facePreset.mouth,
    beard: overrides.beard ?? overrides.face?.beard ?? facePreset.beard,
    stubble: overrides.stubble ?? overrides.face?.stubble ?? facePreset.stubble,
    headWidth: overrides.face?.headWidth ?? facePreset.headWidth,
    headHeight: overrides.face?.headHeight ?? facePreset.headHeight,
    headDepth: overrides.face?.headDepth ?? facePreset.headDepth,
    headPositionY: overrides.face?.headPositionY ?? facePreset.headPositionY,
    headPositionZ: overrides.face?.headPositionZ ?? facePreset.headPositionZ,
    cheekSize: overrides.face?.cheekSize ?? facePreset.cheekSize,
    cheekWidth: overrides.face?.cheekWidth ?? facePreset.cheekWidth,
    cheekHeight: overrides.face?.cheekHeight ?? facePreset.cheekHeight,
    cheekDepth: overrides.face?.cheekDepth ?? facePreset.cheekDepth,
    cheekSpacing: overrides.face?.cheekSpacing ?? facePreset.cheekSpacing,
    cheekPositionY: overrides.face?.cheekPositionY ?? facePreset.cheekPositionY,
    cheekPositionZ: overrides.face?.cheekPositionZ ?? facePreset.cheekPositionZ,
    jawHeight: overrides.face?.jawHeight ?? facePreset.jawHeight,
    jawDepth: overrides.face?.jawDepth ?? facePreset.jawDepth,
    jawPositionY: overrides.face?.jawPositionY ?? facePreset.jawPositionY,
    jawPositionZ: overrides.face?.jawPositionZ ?? facePreset.jawPositionZ,
    chinSize: overrides.face?.chinSize ?? facePreset.chinSize,
    chinWidth: overrides.face?.chinWidth ?? facePreset.chinWidth,
    chinHeight: overrides.face?.chinHeight ?? facePreset.chinHeight,
    chinDepth: overrides.face?.chinDepth ?? facePreset.chinDepth,
    chinPositionY: overrides.face?.chinPositionY ?? facePreset.chinPositionY,
    chinPositionZ: overrides.face?.chinPositionZ ?? facePreset.chinPositionZ,
    eyeWidth: overrides.face?.eyeWidth ?? facePreset.eyeWidth,
    eyeHeight: overrides.face?.eyeHeight ?? facePreset.eyeHeight,
    eyeDepth: overrides.face?.eyeDepth ?? facePreset.eyeDepth,
    eyePositionY: overrides.face?.eyePositionY ?? facePreset.eyePositionY,
    eyePositionZ: overrides.face?.eyePositionZ ?? facePreset.eyePositionZ,
    noseWidth: overrides.face?.noseWidth ?? facePreset.noseWidth,
    noseHeight: overrides.face?.noseHeight ?? facePreset.noseHeight,
    noseDepth: overrides.face?.noseDepth ?? facePreset.noseDepth,
    nosePositionY: overrides.face?.nosePositionY ?? facePreset.nosePositionY,
    nosePositionZ: overrides.face?.nosePositionZ ?? facePreset.nosePositionZ,
    mouthWidth: overrides.face?.mouthWidth ?? facePreset.mouthWidth,
    mouthHeight: overrides.face?.mouthHeight ?? facePreset.mouthHeight,
    mouthDepth: overrides.face?.mouthDepth ?? facePreset.mouthDepth,
    mouthPositionY: overrides.face?.mouthPositionY ?? facePreset.mouthPositionY,
    mouthPositionZ: overrides.face?.mouthPositionZ ?? facePreset.mouthPositionZ,
    browWidth: overrides.face?.browWidth ?? facePreset.browWidth,
    browThickness: overrides.face?.browThickness ?? facePreset.browThickness,
    browSpacing: overrides.face?.browSpacing ?? facePreset.browSpacing,
    browPositionY: overrides.face?.browPositionY ?? facePreset.browPositionY,
    browAngle: overrides.face?.browAngle ?? facePreset.browAngle,
    hairScale: overrides.face?.hairScale ?? facePreset.hairScale,
    hairWidth: overrides.face?.hairWidth ?? facePreset.hairWidth,
    hairHeight: overrides.face?.hairHeight ?? facePreset.hairHeight,
    hairDepth: overrides.face?.hairDepth ?? facePreset.hairDepth,
    hairPositionY: overrides.face?.hairPositionY ?? facePreset.hairPositionY,
    hairPositionZ: overrides.face?.hairPositionZ ?? facePreset.hairPositionZ,
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
    eyeSize: 1.0,
    mouth: 0.42,
    beard: 0,
    stubble: 0,
    ...FACE_ADVANCED_DEFAULTS,
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
    eyeSize: 1.0,
    mouth: 0.36,
    beard: 0,
    stubble: 0,
    ...FACE_ADVANCED_DEFAULTS,
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
    eyeSize: 1.0,
    mouth: 0.52,
    beard: 0,
    stubble: 0.02,
    ...FACE_ADVANCED_DEFAULTS,
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
  public config: FaceConfig;
  private faceMesh?: THREE.Mesh & {
    morphTargetDictionary?: Record<string, number>;
    morphTargetInfluences?: number[];
  };
  private hairRoot?: THREE.Group;
  private lastJawDebugValue?: number;
  private lastEyeDebugValue?: number;
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
    jaw.scale.set(0.85, 0.6, 0.9);
    jaw.position.set(0, -0.125, 0.06);
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
    if (this.hairRoot) {
      this.faceParts.hairRoot = this.hairRoot;
      this.captureBaseline(this.hairRoot);
    }
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
        'eyeSize',
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
      | 'eyeSize'
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
      eyeSize: [
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

  private getBaseline(object: THREE.Object3D) {
    return (
      this.baselineTransforms.get(object) ?? {
        position: object.position.clone(),
        rotation: object.rotation.clone(),
        scale: object.scale.clone(),
      }
    );
  }

  private advancedValue(key: FaceAdvancedKey): number {
    return this.config[key] ?? FACE_ADVANCED_DEFAULTS[key];
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
        'eyeSize',
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
    if (this.hairRoot) {
      this.faceParts.hairRoot = this.hairRoot;
      if (!this.baselineTransforms.has(this.hairRoot)) {
        this.captureBaseline(this.hairRoot);
      }
    }

    const headPart = this.faceParts.head;
    if (headPart) {
      const headScaleFactor = 1.06 + (this.config.headScale - 1) * 0.5;
      const headYFactor = 1.18 + (this.config.headScale - 1) * 0.52;
      const headZFactor = 0.98 + (this.config.headScale - 1) * 0.3;
      const baseX = this.getBaseline(headPart).scale.x;
      const baseY = this.getBaseline(headPart).scale.y;
      const baseZ = this.getBaseline(headPart).scale.z;
      const macroX = (baseX * headScaleFactor) / 1.12;
      const macroY = (baseY * headYFactor) / 1.34;
      const macroZ = (baseZ * headZFactor) / 1.06;
      const adv = {
        width: this.advancedValue('headWidth'),
        height: this.advancedValue('headHeight'),
        depth: this.advancedValue('headDepth'),
        posY: this.advancedValue('headPositionY'),
        posZ: this.advancedValue('headPositionZ'),
      };
      headPart.scale.set(macroX * adv.width, macroY * adv.height, macroZ * adv.depth);
      const basePos = this.getBaseline(headPart).position;
      headPart.position.set(
        basePos.x,
        basePos.y + (this.config.headScale - 1) * 0.014 + adv.posY,
        basePos.z + adv.posZ
      );
    }

    const jaw = this.faceParts.jaw;
    if (jaw) {
      const jawLimit = FACE_PARAMETER_LIMITS.jawWidth;
      const jawValue = clampFaceParameterValue('jawWidth', this.config.jawWidth);
      const jawT =
        jawValue >= jawLimit.default
          ? (jawValue - jawLimit.default) / (jawLimit.max - jawLimit.default)
          : (jawValue - jawLimit.default) / (jawLimit.default - jawLimit.min);
      const wideT = Math.max(0, jawT);
      const narrowT = Math.max(0, -jawT);

      const jawScaleX = 1 + 0.22 * wideT - 0.3 * narrowT;
      const jawScaleY = 1 + 0.06 * wideT - 0.1 * narrowT;
      const jawScaleZ = 1 + 0.05 * wideT - 0.06 * narrowT;
      const jawOffsetY = 0.008 * narrowT - 0.004 * wideT;

      const chinScaleY =
        1 + (this.config.chinShape - FACE_PARAMETER_LIMITS.chinShape.default) * 0.5;

      const jawAdv = {
        height: this.advancedValue('jawHeight'),
        depth: this.advancedValue('jawDepth'),
        posY: this.advancedValue('jawPositionY'),
        posZ: this.advancedValue('jawPositionZ'),
      };
      const chinAdv = {
        size: this.advancedValue('chinSize'),
        width: this.advancedValue('chinWidth'),
        height: this.advancedValue('chinHeight'),
        depth: this.advancedValue('chinDepth'),
        posY: this.advancedValue('chinPositionY'),
        posZ: this.advancedValue('chinPositionZ'),
      };

      let resultScaleX = this.getBaseline(jaw).scale.x * jawScaleX * chinAdv.size * chinAdv.width;
      if (headPart) {
        const jawGeometry = jaw.geometry as THREE.SphereGeometry;
        const headGeometry = headPart.geometry as THREE.SphereGeometry;
        const jawRadius = jawGeometry.parameters?.radius ?? 0.118;
        const headRadius = headGeometry.parameters?.radius ?? 0.16;
        const maxJawScaleX = ((headRadius * headPart.scale.x) / jawRadius) * 0.85;
        resultScaleX = Math.min(resultScaleX, maxJawScaleX);
      }

      const resultScaleY =
        this.getBaseline(jaw).scale.y * chinScaleY * jawScaleY * jawAdv.height * chinAdv.height;
      const resultScaleZ = this.getBaseline(jaw).scale.z * jawScaleZ * jawAdv.depth * chinAdv.depth;
      const resultPosY =
        this.getBaseline(jaw).position.y -
        (this.config.chinShape - 1) * 0.03 +
        jawOffsetY +
        jawAdv.posY +
        chinAdv.posY;

      jaw.scale.set(resultScaleX, resultScaleY, resultScaleZ);
      jaw.position.set(
        this.getBaseline(jaw).position.x,
        resultPosY,
        this.getBaseline(jaw).position.z + jawAdv.posZ + chinAdv.posZ
      );

      if (this.lastJawDebugValue !== jawValue) {
        this.lastJawDebugValue = jawValue;
        console.warn('[JAW DEBUG]', {
          value: jawValue,
          normalizedValue: jawT,
          baselineScale: this.getBaseline(jaw).scale.clone(),
          resultingScale: jaw.scale.clone(),
          baselinePosition: this.getBaseline(jaw).position.clone(),
          resultingPosition: jaw.position.clone(),
        });
      }
    }

    const cheekLeft = this.faceParts.cheeks.left;
    const cheekRight = this.faceParts.cheeks.right;
    if (cheekLeft && cheekRight) {
      const adv = {
        size: this.advancedValue('cheekSize'),
        width: this.advancedValue('cheekWidth'),
        height: this.advancedValue('cheekHeight'),
        depth: this.advancedValue('cheekDepth'),
        spacing: this.advancedValue('cheekSpacing'),
        posY: this.advancedValue('cheekPositionY'),
        posZ: this.advancedValue('cheekPositionZ'),
      };
      const leftBaseline = this.getBaseline(cheekLeft);
      const rightBaseline = this.getBaseline(cheekRight);
      const spacingOffset = (adv.spacing - 1) * 0.05;

      cheekLeft.scale.set(
        leftBaseline.scale.x * adv.size * adv.width,
        leftBaseline.scale.y * adv.size * adv.height,
        leftBaseline.scale.z * adv.size * adv.depth
      );
      cheekRight.scale.set(
        rightBaseline.scale.x * adv.size * adv.width,
        rightBaseline.scale.y * adv.size * adv.height,
        rightBaseline.scale.z * adv.size * adv.depth
      );
      cheekLeft.position.set(
        leftBaseline.position.x - spacingOffset,
        leftBaseline.position.y + adv.posY,
        leftBaseline.position.z + adv.posZ
      );
      cheekRight.position.set(
        rightBaseline.position.x + spacingOffset,
        rightBaseline.position.y + adv.posY,
        rightBaseline.position.z + adv.posZ
      );
    }

    const eyeLeftWhite = this.faceParts.eyes.left.white;
    const eyeRightWhite = this.faceParts.eyes.right.white;
    if (eyeLeftWhite && eyeRightWhite) {
      const eyeSizeValue = clampFaceParameterValue('eyeSize', this.config.eyeSize);
      const eyeSpacingValue = clampFaceParameterValue('eyeSpacing', this.config.eyeSpacing);
      const eyeAdv = {
        width: this.advancedValue('eyeWidth'),
        height: this.advancedValue('eyeHeight'),
        depth: this.advancedValue('eyeDepth'),
        posY: this.advancedValue('eyePositionY'),
        posZ: this.advancedValue('eyePositionZ'),
      };
      const spacingStride = 0.052 + (1 - eyeSpacingValue) * 0.056;

      const applyEyeAssembly = (
        white: THREE.Mesh,
        iris: THREE.Mesh | undefined,
        eyelid: THREE.Mesh | undefined,
        sideSign: 1 | -1
      ) => {
        const whiteBaseline = this.getBaseline(white);
        const centerX = sideSign * spacingStride;
        white.position.set(
          centerX,
          whiteBaseline.position.y + eyeAdv.posY,
          whiteBaseline.position.z + eyeAdv.posZ
        );
        white.scale.set(
          whiteBaseline.scale.x * eyeSizeValue * eyeAdv.width,
          whiteBaseline.scale.y * eyeSizeValue * eyeAdv.height,
          whiteBaseline.scale.z * eyeSizeValue * eyeAdv.depth
        );

        if (iris) {
          const irisBaseline = this.getBaseline(iris);
          iris.position.set(
            white.position.x,
            irisBaseline.position.y + eyeAdv.posY,
            irisBaseline.position.z + eyeAdv.posZ
          );
          iris.scale.set(
            irisBaseline.scale.x * eyeSizeValue * eyeAdv.width,
            irisBaseline.scale.y * eyeSizeValue * eyeAdv.height,
            irisBaseline.scale.z * eyeSizeValue * eyeAdv.depth
          );
        }

        if (eyelid) {
          const eyelidBaseline = this.getBaseline(eyelid);
          eyelid.position.set(
            white.position.x,
            eyelidBaseline.position.y + eyeAdv.posY,
            eyelidBaseline.position.z + eyeAdv.posZ
          );
          eyelid.scale.set(
            eyelidBaseline.scale.x * eyeSizeValue * eyeAdv.width,
            eyelidBaseline.scale.y * eyeSizeValue * eyeAdv.height,
            eyelidBaseline.scale.z * eyeSizeValue * eyeAdv.depth
          );
        }
      };

      const irisLeft = this.faceParts.eyes.left.iris;
      const irisRight = this.faceParts.eyes.right.iris;
      const leftEyelid = this.faceParts.eyes.left.eyelid;
      const rightEyelid = this.faceParts.eyes.right.eyelid;

      applyEyeAssembly(eyeLeftWhite, irisLeft, leftEyelid, -1);
      applyEyeAssembly(eyeRightWhite, irisRight, rightEyelid, 1);

      if (this.lastEyeDebugValue !== eyeSizeValue) {
        this.lastEyeDebugValue = eyeSizeValue;
        console.warn('[EYE SIZE DEBUG]', {
          value: eyeSizeValue,
          spacing: eyeSpacingValue,
          left: {
            whiteScale: eyeLeftWhite.scale.clone(),
            irisScale: irisLeft?.scale.clone(),
            eyelidScale: leftEyelid?.scale.clone(),
            whitePosition: eyeLeftWhite.position.clone(),
            irisPosition: irisLeft?.position.clone(),
          },
          right: {
            whiteScale: eyeRightWhite.scale.clone(),
            irisScale: irisRight?.scale.clone(),
            eyelidScale: rightEyelid?.scale.clone(),
            whitePosition: eyeRightWhite.position.clone(),
            irisPosition: irisRight?.position.clone(),
          },
          affectedObjects: [
            'eye-white-left',
            'iris-left',
            'eyelid-left',
            'eye-white-right',
            'iris-right',
            'eyelid-right',
          ],
        });
      }
    }

    const browLeft = this.faceParts.brows.left;
    const browRight = this.faceParts.brows.right;
    if (browLeft && browRight) {
      const brow = clampFaceParameterValue('brow', this.config.brow);
      const browAdv = {
        width: this.advancedValue('browWidth'),
        thickness: this.advancedValue('browThickness'),
        spacing: this.advancedValue('browSpacing'),
        posY: this.advancedValue('browPositionY'),
        angle: this.advancedValue('browAngle'),
      };
      const leftBaseline = this.getBaseline(browLeft);
      const rightBaseline = this.getBaseline(browRight);
      const browLift = 0.07 + (brow - 0.5) * 0.05;
      const spacingOffset = (browAdv.spacing - 1) * 0.03;
      const angleRad = (browAdv.angle * Math.PI) / 180;

      browLeft.scale.set(
        leftBaseline.scale.x * browAdv.width * (0.98 + brow * 0.52),
        leftBaseline.scale.y * browAdv.thickness,
        leftBaseline.scale.z
      );
      browRight.scale.set(
        rightBaseline.scale.x * browAdv.width * (0.98 + brow * 0.52),
        rightBaseline.scale.y * browAdv.thickness,
        rightBaseline.scale.z
      );
      browLeft.position.set(
        leftBaseline.position.x - spacingOffset,
        browLift + browAdv.posY,
        leftBaseline.position.z
      );
      browRight.position.set(
        rightBaseline.position.x + spacingOffset,
        browLift + browAdv.posY,
        rightBaseline.position.z
      );
      browLeft.rotation.z = leftBaseline.rotation.z + angleRad;
      browRight.rotation.z = rightBaseline.rotation.z - angleRad;
    }

    const nose = this.faceParts.nose;
    if (nose) {
      const noseSize = clampFaceParameterValue('nose', this.config.nose);
      const noseAdv = {
        width: this.advancedValue('noseWidth'),
        height: this.advancedValue('noseHeight'),
        depth: this.advancedValue('noseDepth'),
        posY: this.advancedValue('nosePositionY'),
        posZ: this.advancedValue('nosePositionZ'),
      };
      const baseline = this.getBaseline(nose);
      nose.scale.set(
        ((baseline.scale.x * (1.06 + noseSize * 0.92)) / 0.95) * noseAdv.width,
        ((baseline.scale.y * (1.18 + noseSize * 1.06)) / 0.98) * noseAdv.height,
        ((baseline.scale.z * (0.92 + (noseSize - 0.5) * 1.08)) / 1.1) * noseAdv.depth
      );
      nose.position.set(
        baseline.position.x,
        baseline.position.y + (noseSize - 0.5) * 0.03 + noseAdv.posY,
        baseline.position.z + (noseSize - 0.5) * 0.08 + noseAdv.posZ
      );
    }

    const mouth = this.faceParts.mouth;
    if (mouth) {
      const mouthSize = clampFaceParameterValue('mouth', this.config.mouth);
      const mouthAdv = {
        width: this.advancedValue('mouthWidth'),
        height: this.advancedValue('mouthHeight'),
        depth: this.advancedValue('mouthDepth'),
        posY: this.advancedValue('mouthPositionY'),
        posZ: this.advancedValue('mouthPositionZ'),
      };
      const baseline = this.getBaseline(mouth);
      const mouthScaleX = 1.06 + (mouthSize - 0.5) * 1.15;
      const mouthScaleY = 0.86 + (mouthSize - 0.5) * 0.5;
      mouth.scale.set(
        baseline.scale.x * mouthScaleX * mouthAdv.width,
        baseline.scale.y * mouthScaleY * mouthAdv.height,
        baseline.scale.z * 1.08 * mouthAdv.depth
      );
      mouth.position.set(
        baseline.position.x,
        baseline.position.y - (mouthSize - 0.5) * 0.012 + mouthAdv.posY,
        baseline.position.z + (mouthSize - 0.5) * 0.018 + mouthAdv.posZ
      );
      mouth.rotation.z = Math.PI + (mouthSize - 0.5) * 0.75;
    }

    const hairRoot = this.faceParts.hairRoot;
    if (hairRoot) {
      const hairAdv = {
        scale: this.advancedValue('hairScale'),
        width: this.advancedValue('hairWidth'),
        height: this.advancedValue('hairHeight'),
        depth: this.advancedValue('hairDepth'),
        posY: this.advancedValue('hairPositionY'),
        posZ: this.advancedValue('hairPositionZ'),
      };
      const baseline = this.getBaseline(hairRoot);
      hairRoot.scale.set(
        baseline.scale.x * hairAdv.scale * hairAdv.width,
        baseline.scale.y * hairAdv.scale * hairAdv.height,
        baseline.scale.z * hairAdv.scale * hairAdv.depth
      );
      hairRoot.position.set(
        baseline.position.x,
        baseline.position.y + hairAdv.posY,
        baseline.position.z + hairAdv.posZ
      );
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

  // CANONICAL GOLFER ORIENTATION
  // Anatomical forward for this procedural rig is +Z (golfer-local).
  // Established by the face: nose/eyes/mouth and the chest/placket all face +Z.
  //   - head/face front  -> +Z
  //   - chest/torso front -> +Z
  //   - toes/shoes front  -> +Z
  //   - knees front       -> +Z
  // Gameplay rotates ONLY Golfer.root (see setHeading) to face the basket.
  // Individual body parts are NEVER authored backwards to match a rear camera.
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
      ...this.appearance.face,
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
      // Shoulder pivot at the anatomical shoulder line: upper corner of the
      // torso (torso local top y=0.62, half-width ~0.19). Pivot sits AT torso
      // top, slightly inside the silhouette so the arm reads as attached.
      const shoulder = this.joint(shoulderName, torso, new THREE.Vector3(side * 0.32, 0.6, 0));
      // Sleeve = compact cap AT the shoulder pivot (bridges torso -> upper arm),
      // not a long capsule drooping down the arm.
      const sleeve = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 14, 12),
        createJerseyMaterial(this.appearance)
      );
      sleeve.scale.set(1.1, 0.8, 1.0);
      sleeve.position.set(side * 0.02, -0.02, 0);
      sleeve.castShadow = true;
      shoulder.add(sleeve);

      // Upper arm spans SHOULDER -> ELBOW exactly (top at pivot, bottom at elbow).
      const upperArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.082, 0.28, 6, 12),
        new THREE.MeshStandardMaterial({ color: this.appearance.skinTone, roughness: 0.78 })
      );
      upperArm.name = isRight ? 'upper-arm-right' : 'upper-arm-left';
      upperArm.geometry.translate(0, -0.22, 0);
      upperArm.castShadow = true;
      shoulder.add(upperArm);

      const elbow = this.joint(elbowName, shoulder, new THREE.Vector3(0, -0.44, 0));
      // Forearm spans ELBOW -> WRIST exactly.
      const forearm = limb(0.3, 0.072, this.appearance.skinTone);
      forearm.name = isRight ? 'forearm-right' : 'forearm-left';
      elbow.add(forearm);

      // Hand at the wrist (end of forearm).
      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.082, 10, 8),
        new THREE.MeshStandardMaterial({ color: this.appearance.skinTone, roughness: 0.75 })
      );
      hand.name = isRight ? 'hand-right-mesh' : 'hand-left-mesh';
      hand.scale.set(0.9, 1.15, 0.7);
      hand.position.y = -0.46;
      hand.castShadow = true;
      elbow.add(hand);

      if (isRight) {
        this.hand.position.set(0, -0.44, 0);
        elbow.add(this.hand);
        this.attachPoints.set('rightHand', this.hand);
      } else {
        this.attachPoints.set('leftHand', hand);
      }

      const hipName: JointName = isRight ? 'hipR' : 'hipL';
      const kneeName: JointName = isRight ? 'kneeR' : 'kneeL';

      const hip = this.joint(hipName, hips, new THREE.Vector3(side * 0.11, -0.12, 0));
      const thigh = limb(0.34, 0.09, this.appearance.skinTone);
      thigh.name = isRight ? 'thigh-right' : 'thigh-left';
      hip.add(thigh);

      const knee = this.joint(kneeName, hip, new THREE.Vector3(0, -0.5, 0));
      const calf = limb(0.32, 0.08, this.appearance.skinTone);
      knee.add(calf);

      const sock = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.081, 0.16, 12),
        new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.8 })
      );
      sock.position.y = -0.31;
      knee.add(sock);

      // CANONICAL GOLFER ORIENTATION: anatomical forward is +Z (defined by the
      // face: nose/eyes/mouth/chest all face +Z). Feet must point toes toward +Z.
      // Ankle sits near the heel (slightly -Z); toe projects forward (+Z).
      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.1, 0.24),
        new THREE.MeshStandardMaterial({ color: this.appearance.shoeColor, roughness: 0.85 })
      );
      shoe.name = isRight ? 'shoe-right' : 'shoe-left';
      shoe.position.set(0, -0.46, 0.03);
      shoe.castShadow = true;
      knee.add(shoe);

      const toe = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 10, 8),
        new THREE.MeshStandardMaterial({ color: this.appearance.shoeColor, roughness: 0.8 })
      );
      toe.name = isRight ? 'toe-right' : 'toe-left';
      toe.scale.set(1, 0.72, 1.3);
      toe.position.set(0, -0.47, 0.14);
      knee.add(toe);
    }

    // ONE held disc, parented to the throwing (right) hand chain so it follows
    // the arm. Sized/positioned to sit in the hand rather than a giant slab at
    // the wrist. Do NOT also call equipAccessory('disc') here — that creates a
    // second overlapping disc (the duplicate seen in the BODY preview).
    this.disc = createDiscVisual(0xe03a2f);
    this.disc.name = 'held-disc';
    this.disc.rotation.set(Math.PI / 2, 0, 0);
    this.disc.scale.setScalar(0.5);
    this.disc.position.set(0, -0.05, 0.06);
    this.disc.visible = false; // hidden during arm-chain calibration
    this.hand.add(this.disc);

    if (import.meta.env.DEV) {
      this.logArmRigDebug();
    }
  }

  private logArmRigDebug() {
    this.root.updateMatrixWorld(true);
    const world = (name: JointName) =>
      this.joints
        .get(name)
        ?.getWorldPosition(new THREE.Vector3())
        .toArray()
        .map((v) => Number(v.toFixed(3)));
    const torsoMesh = this.root.getObjectByName('torso-part') as THREE.Mesh | undefined;
    let torsoWidth: number | undefined;
    if (torsoMesh) {
      torsoMesh.geometry.computeBoundingBox();
      const box = torsoMesh.geometry.boundingBox!.clone().applyMatrix4(torsoMesh.matrixWorld);
      torsoWidth = Number((box.max.x - box.min.x).toFixed(3));
    }
    console.info('[ARM RIG DEBUG]', {
      torsoWidth,
      leftShoulderPosition: world('shoulderL'),
      rightShoulderPosition: world('shoulderR'),
      leftElbowPosition: world('elbowL'),
      rightElbowPosition: world('elbowR'),
      shoulderLocalX: this.joints.get('shoulderL')?.position.x,
      shoulderLocalY: this.joints.get('shoulderL')?.position.y,
    });

    // Front/back plane diagnostic (canonical anatomical forward = +Z).
    if (torsoMesh) {
      const tb = new THREE.Box3().setFromObject(torsoMesh);
      const zOf = (name: JointName) =>
        Number((this.joints.get(name)?.getWorldPosition(new THREE.Vector3()).z ?? 0).toFixed(3));
      console.info('[ARM PLANE DEBUG]', {
        anatomicalForwardAxis: '+Z',
        torsoFront: Number(tb.max.z.toFixed(3)),
        torsoCenter: Number(((tb.min.z + tb.max.z) / 2).toFixed(3)),
        torsoBack: Number(tb.min.z.toFixed(3)),
        leftShoulder: zOf('shoulderL'),
        leftElbow: zOf('elbowL'),
        rightShoulder: zOf('shoulderR'),
        rightElbow: zOf('elbowR'),
      });
    }
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

    // Arm length: scale the whole arm chain's Y (elbow offset + segments) so both
    // arms lengthen/shorten together.
    const armLength = profile.armLength ?? 1;
    if (shoulderL) {
      shoulderL.scale.set(profile.shoulderWidth, armLength, 1);
    }
    if (shoulderR) {
      shoulderR.scale.set(profile.shoulderWidth, armLength, 1);
    }

    // Arm thickness: scale arm meshes radially (X/Z), preserving length (Y).
    const armThickness = profile.armThickness ?? 1;
    [
      'upper-arm-left',
      'upper-arm-right',
      'forearm-left',
      'forearm-right',
      'hand-left-mesh',
      'hand-right-mesh',
    ].forEach((name) => {
      const mesh = this.root.getObjectByName(name);
      if (mesh) {
        const base = name.startsWith('hand') ? new THREE.Vector3(0.9, 1.15, 0.7) : undefined;
        if (base) {
          mesh.scale.set(base.x * armThickness, base.y, base.z * armThickness);
        } else {
          mesh.scale.set(armThickness, 1, armThickness);
        }
      }
    });

    const hipL = this.joints.get('hipL');
    const hipR = this.joints.get('hipR');
    if (hipL) {
      hipL.scale.set(profile.hipWidth, profile.legLength, 1);
    }
    if (hipR) {
      hipR.scale.set(profile.hipWidth, profile.legLength, 1);
    }

    // Thigh length: scale the thigh mesh (hip -> knee segment) Y on both legs.
    const thighLength = profile.thighLength ?? 1;
    ['thigh-left', 'thigh-right'].forEach((name) => {
      const mesh = this.root.getObjectByName(name);
      if (mesh) {
        mesh.scale.set(1, thighLength, 1);
      }
    });

    this.face?.setConfig({
      skinTone: this.appearance.skinTone,
      hairColor: this.appearance.hairColor,
      hairStyle: this.appearance.hairStyle,
      headScale: profile.headScale,
      jawWidth: profile.jawWidth,
      chinShape: profile.chinShape,
      ...this.appearance.face,
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
    // Re-apply the neutral pose so appearance-driven pose params (e.g. armRaise)
    // take effect immediately in the Change Look preview without needing update().
    this.applyPose(STAND_POSE, STAND_POSE, 0);
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

  // Read-only access to the joint map for the avatar PoseTarget adapter.
  // Additive accessor; does not change any rig/animation behavior.
  getJointGroup(name: JointName): THREE.Group | undefined {
    return this.joints.get(name);
  }

  // Reset all joints to the neutral STAND_POSE baseline. Used by the dev
  // shoulder-test page to re-apply a clean baseline each frame before applying
  // semantic pose data. Additive; does not change existing behavior.
  applyPoseBaseline() {
    this.applyPose(STAND_POSE, STAND_POSE, 0);
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

    // Arm raise (jumping-jack lateral abduction). Composed AFTER the pose lerp
    // so it adds to the neutral/throw shoulder rotation.
    const armRaise = Math.min(100, Math.max(0, this.appearance.profile?.armRaise ?? 0)) / 100;
    if (armRaise > 0) {
      this.setShoulderAbduction(armRaise * (Math.PI / 2) * 1.4); // 0 -> ~126deg extra
    }
  }

  // Anatomical shoulder abduction (jumping-jack): rotate each arm in the
  // shoulder's local Z axis to move the arm OUT away from the torso and UP.
  // Correct mirrored signs (verified by T-pose diagnostic): right += angle,
  // left -= angle. Keeps the arm in the body's shoulder plane (no backward sweep).
  private setShoulderAbduction(angle: number) {
    const shoulderR = this.joints.get('shoulderR');
    const shoulderL = this.joints.get('shoulderL');
    if (shoulderR) {
      shoulderR.rotation.z += angle;
    }
    if (shoulderL) {
      shoulderL.rotation.z -= angle;
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
