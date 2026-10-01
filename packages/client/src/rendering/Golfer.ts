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

export type HairStyle = 'ponytail' | 'short' | 'cap' | 'visor';
export type AccessorySlot = 'cap' | 'glasses' | 'disc' | 'bag';

export interface GolferAppearance {
  skinTone: number;
  hairStyle: HairStyle;
  hairColor: number;
  shirtColor: number;
  shortsColor: number;
  shoeColor: number;
}

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

export const DEFAULT_GOLFER_APPEARANCE: GolferAppearance = {
  skinTone: SKIN,
  hairStyle: 'ponytail',
  hairColor: HAIR,
  shirtColor: JERSEY,
  shortsColor: SHORTS,
  shoeColor: SHOE,
};

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

export class Golfer {
  readonly root = new THREE.Group();

  private joints = new Map<JointName, THREE.Group>();
  private attachPoints = new Map<string, THREE.Object3D>();
  private hand = new THREE.Group();
  private disc!: THREE.Mesh;
  private hairRoot?: THREE.Group;
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

  constructor(look: GolferLook = DEFAULT_LOOK) {
    this.look = look;
    this.appearance = {
      ...DEFAULT_GOLFER_APPEARANCE,
      skinTone: look.skin,
      hairStyle: look.hairStyle,
      hairColor: look.hair,
      shirtColor: look.jersey,
      shortsColor: look.shorts,
      shoeColor: SHOE,
    };
    this.root.scale.setScalar(GOLFER_SCALE * look.build);
    this.build();
    this.applyPose(THROW_SEQUENCE[0].pose, THROW_SEQUENCE[0].pose, 0);
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
    pelvis.scale.set(1.06, 1, 0.82);
    hips.add(pelvis);

    const torso = this.joint('torso', hips, new THREE.Vector3(0, 0.02, 0));
    const chest = limb(0.42, 0.19, this.appearance.shirtColor);
    chest.geometry.translate(0, 0.62, 0);
    chest.scale.set(1.04, 1, 0.78);
    torso.add(chest);

    const collar = limb(0.1, 0.185, look.accent);
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
    const skull = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 16, 12),
      new THREE.MeshStandardMaterial({ color: this.appearance.skinTone, roughness: 0.72 })
    );
    skull.scale.set(0.94, 1.06, 1);
    skull.castShadow = true;
    head.add(skull);

    const leftEar = new THREE.Mesh(
      new THREE.SphereGeometry(0.026, 10, 8),
      new THREE.MeshStandardMaterial({ color: this.appearance.skinTone, roughness: 0.8 })
    );
    leftEar.position.set(-0.128, 0.02, 0);
    head.add(leftEar);

    const rightEar = leftEar.clone();
    rightEar.position.x = 0.128;
    head.add(rightEar);

    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.4 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), eyeMaterial);
    leftEye.position.set(-0.04, 0.03, 0.105);
    head.add(leftEye);

    const rightEye = leftEye.clone();
    rightEye.position.x = 0.04;
    head.add(rightEye);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.016, 0.05, 8),
      new THREE.MeshStandardMaterial({ color: this.appearance.skinTone, roughness: 0.75 })
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.02, 0.113);
    head.add(nose);

    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.035, 0.004, 6, 18, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x8b3a3a, roughness: 0.8 })
    );
    smile.position.set(0, -0.07, 0.11);
    smile.rotation.z = Math.PI;
    head.add(smile);

    this.addHair(head);
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

    if (this.appearance.hairStyle === 'ponytail') {
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.138, 10, 8), hairMaterial);
      crown.scale.set(1, 0.85, 1);
      crown.position.y = 0.02;
      hairRoot.add(crown);

      const tail = limb(0.24, 0.07, hairColor);
      tail.rotation.x = -0.9;
      tail.position.set(0, 0.06, 0.1);
      hairRoot.add(tail);
      return;
    }

    if (this.appearance.hairStyle === 'short') {
      const crop = new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 8), hairMaterial);
      crop.scale.set(1, 0.78, 1);
      crop.position.y = 0.035;
      hairRoot.add(crop);
      return;
    }

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.139, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: this.appearance.shirtColor, roughness: 0.85 })
    );
    cap.position.y = 0.025;
    hairRoot.add(cap);

    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.02, 12, 1, false, -Math.PI / 2, Math.PI),
      new THREE.MeshStandardMaterial({ color: this.appearance.shirtColor, roughness: 0.85 })
    );
    brim.position.set(0, 0.025, -0.06);
    hairRoot.add(brim);
  }

  setAppearance(options: Partial<GolferAppearance>) {
    this.appearance = {
      ...this.appearance,
      ...options,
    };
    this.look.hairStyle = this.appearance.hairStyle;
    this.look.hair = this.appearance.hairColor;
    this.look.jersey = this.appearance.shirtColor;
    this.look.shorts = this.appearance.shortsColor;
    this.look.skin = this.appearance.skinTone;

    const head = this.joints.get('head');
    if (head) {
      this.addHair(head);
    }

    const torso = this.joints.get('torso');
    if (torso) {
      torso.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CapsuleGeometry) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (
            material &&
            (material.color.getHex() === this.look.jersey ||
              material.color.getHex() === this.appearance.shirtColor)
          ) {
            material.color.setHex(this.appearance.shirtColor);
          }
        }
      });
    }

    this.root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      const material = child.material as THREE.MeshStandardMaterial;
      if (!material || material.color === undefined) {
        return;
      }

      if (
        child.geometry instanceof THREE.CylinderGeometry &&
        child.position.y > 0.7 &&
        child.position.z > 0.12
      ) {
        material.color.setHex(this.appearance.shirtColor);
      }
    });

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
