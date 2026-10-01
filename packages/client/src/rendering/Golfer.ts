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

/**
 * Right-handed backhand, matching public/throw_positions/step1..6.
 * Angles are hand-authored; tweak these to retime or reshape the throw.
 */
const THROW_SEQUENCE: { pose: Pose; duration: number }[] = [
  // step1 - setup, square to the target, disc held at the chest
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
  // step2 - x-step, body starts turning away from the target
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
  // step3 - full reachback, weight loaded on the rear leg
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
  // step4 - pull through, elbow tight to the chest in the power pocket
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
  // step5 - release, arm snapped out along the line of the throw
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
  // step6 - follow through, rear leg swings up as the body keeps rotating
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

/** Index of the pose the disc leaves the hand on. */
const RELEASE_INDEX = 4;
const RECOVER_DURATION = 0.9;
const GOLFER_SCALE = 2.25;

/** Sidearm flick: compact, open stance, arm whips through at waist height. */
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

/** Tomahawk: arm comes up and over the shoulder, body stays square. */
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

/** Putt: square stance, small crouch, disc pushed out from the chest. */
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

export class Golfer {
  readonly root = new THREE.Group();

  private joints = new Map<JointName, THREE.Group>();
  private hand = new THREE.Group();
  private disc!: THREE.Mesh;
  private baseY = 0;
  private look: GolferLook;

  private playing = false;
  private index = 0;
  private elapsed = 0;
  private releasing = false;
  private sequence = SEQUENCES.backhand;
  private idleT = 0;
  /** Offsets the idle cycle so the group does not sway in unison. */
  private idlePhase = Math.random() * 10;

  constructor(look: GolferLook = DEFAULT_LOOK) {
    this.look = look;
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
    const pelvis = limb(0.22, 0.17, look.shorts);
    // Bodies are flatter front-to-back than they are wide.
    pelvis.scale.set(1.06, 1, 0.82);
    hips.add(pelvis);

    const torso = this.joint('torso', hips, new THREE.Vector3(0, 0.02, 0));
    const chest = limb(0.42, 0.19, look.jersey);
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
      new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.75 })
    );
    neck.position.y = 0.74;
    torso.add(neck);

    const head = this.joint('head', torso, new THREE.Vector3(0, 0.78, 0));
    const skull = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 16, 12),
      new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.72 })
    );
    skull.scale.set(0.94, 1.06, 1);
    skull.castShadow = true;
    head.add(skull);

    this.addHair(head);

    for (const side of [1, -1] as const) {
      const isRight = side === 1;
      const shoulderName: JointName = isRight ? 'shoulderR' : 'shoulderL';
      const elbowName: JointName = isRight ? 'elbowR' : 'elbowL';

      const shoulder = this.joint(shoulderName, torso, new THREE.Vector3(side * 0.22, 0.62, 0));
      shoulder.add(limb(0.26, 0.07, look.accent));

      const deltoid = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 12, 10),
        new THREE.MeshStandardMaterial({ color: look.accent, roughness: 0.78 })
      );
      shoulder.add(deltoid);

      const elbow = this.joint(elbowName, shoulder, new THREE.Vector3(0, -0.4, 0));
      elbow.add(limb(0.26, 0.06, look.skin));

      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.072, 10, 8),
        new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.75 })
      );
      hand.scale.set(0.9, 1.15, 0.7);
      hand.position.y = -0.4;
      hand.castShadow = true;
      elbow.add(hand);

      if (isRight) {
        this.hand.position.set(0, -0.38, 0);
        elbow.add(this.hand);
      }

      const hipName: JointName = isRight ? 'hipR' : 'hipL';
      const kneeName: JointName = isRight ? 'kneeR' : 'kneeL';

      const hip = this.joint(hipName, hips, new THREE.Vector3(side * 0.11, -0.12, 0));
      hip.add(limb(0.34, 0.09, look.skin));

      const knee = this.joint(kneeName, hip, new THREE.Vector3(0, -0.5, 0));
      knee.add(limb(0.32, 0.08, look.skin));

      const sock = limb(0.12, 0.082, 0xf2f4f8);
      sock.position.y = -0.3;
      knee.add(sock);

      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.1, 0.24),
        new THREE.MeshStandardMaterial({ color: SHOE, roughness: 0.85 })
      );
      shoe.position.set(0, -0.46, -0.03);
      shoe.castShadow = true;
      knee.add(shoe);

      const toe = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 10, 8),
        new THREE.MeshStandardMaterial({ color: look.accent, roughness: 0.8 })
      );
      toe.scale.set(1, 0.72, 1.3);
      toe.position.set(0, -0.47, -0.14);
      knee.add(toe);
    }

    this.disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.124, 0.124, 0.027, 20),
      new THREE.MeshStandardMaterial({ color: 0xe03a2f, roughness: 0.45 })
    );
    this.disc.rotation.z = Math.PI / 2;
    this.disc.castShadow = true;
    this.hand.add(this.disc);
  }

  private addHair(head: THREE.Group) {
    const look = this.look;
    const hairMaterial = new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.9 });

    if (look.hairStyle === 'ponytail') {
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.138, 10, 8), hairMaterial);
      crown.scale.set(1, 0.85, 1);
      crown.position.y = 0.02;
      head.add(crown);

      const tail = limb(0.24, 0.07, look.hair);
      tail.rotation.x = -0.9;
      tail.position.set(0, 0.06, 0.1);
      head.add(tail);
      return;
    }

    if (look.hairStyle === 'short') {
      const crop = new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 8), hairMaterial);
      crop.scale.set(1, 0.78, 1);
      crop.position.y = 0.035;
      head.add(crop);
      return;
    }

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.139, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: look.accent, roughness: 0.85 })
    );
    cap.position.y = 0.025;
    head.add(cap);

    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.02, 12, 1, false, -Math.PI / 2, Math.PI),
      new THREE.MeshStandardMaterial({ color: look.accent, roughness: 0.85 })
    );
    brim.position.set(0, 0.025, -0.06);
    head.add(brim);
  }

  setPosition(x: number, y: number, z: number) {
    this.baseY = y;
    this.root.position.set(x, y, z);
  }

  setVisible(visible: boolean) {
    this.root.visible = visible;
  }

  /** Aims the whole sequence down the given horizontal heading. */
  setHeading(yaw: number) {
    this.root.userData.headingYaw = yaw;
  }

  get isThrowing() {
    return this.playing;
  }

  /** Gentle breathing and weight shift while waiting to throw. */
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
    this.disc.visible = true;
  }

  /** Tints the held disc to match whatever is selected in the bag. */
  setDiscColor(color: number) {
    (this.disc.material as THREE.MeshStandardMaterial).color.setHex(color);
  }

  getDiscWorldPosition(target: THREE.Vector3): THREE.Vector3 {
    return this.disc.getWorldPosition(target);
  }

  /** Advances the animation; returns true on the single frame the disc is released. */
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
    // Ease out into the reachback, then drive hard through the pull and release.
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
          this.disc.visible = false;
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
}
