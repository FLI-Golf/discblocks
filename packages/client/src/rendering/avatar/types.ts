// Semantic, serializable types for the disc-golf avatar rig/pose/action system.
// Pose data is anatomical (leftShoulder.abduction), never mesh-specific.

export type JointName =
  | 'pelvis'
  | 'torso'
  | 'neck'
  | 'head'
  | 'leftShoulder'
  | 'leftElbow'
  | 'leftWrist'
  | 'rightShoulder'
  | 'rightElbow'
  | 'rightWrist'
  | 'leftHip'
  | 'leftKnee'
  | 'leftAnkle'
  | 'rightHip'
  | 'rightKnee'
  | 'rightAnkle';

export interface JointTransform {
  readonly position?: readonly [number, number, number];
  readonly rotation?: readonly [number, number, number];
  readonly scale?: readonly [number, number, number];
}

export interface ShoulderPose {
  readonly abduction?: number;
  readonly flexion?: number;
  readonly rotation?: number;
}

export interface ElbowPose {
  readonly flexion?: number;
}

export interface TorsoPose {
  readonly rotation?: number; // turn left/right
  readonly lean?: number; // lean forward/back
  readonly flexion?: number; // alias of lean (forward/back)
  readonly lateralLean?: number; // lean left/right
  readonly twist?: number;
}

export interface PelvisPose {
  readonly rotation?: number; // turn left/right
  readonly lateralTilt?: number; // tilt left/right
  readonly flexion?: number; // forward/back
}

export interface HeadPose {
  readonly yaw?: number; // face left/right (radians)
  readonly pitch?: number; // look up/down (radians)
}

export interface HipPose {
  readonly flexion?: number; // step forward/back (radians)
  readonly abduction?: number; // leg out/in (radians)
  readonly rotation?: number; // hip rotation (radians)
}

export interface KneePose {
  readonly flexion?: number; // bend (radians)
}

export interface FootPose {
  readonly rotation?: number; // foot direction (radians)
}

export type PoseId = string;
export type ActionId = string;

export interface GolferPose {
  readonly id: PoseId;
  readonly name: string;
  readonly torso?: TorsoPose;
  readonly pelvis?: PelvisPose;
  readonly head?: HeadPose;
  readonly leftShoulder?: ShoulderPose;
  readonly rightShoulder?: ShoulderPose;
  readonly leftElbow?: ElbowPose;
  readonly rightElbow?: ElbowPose;
  readonly leftHip?: HipPose;
  readonly rightHip?: HipPose;
  readonly leftKnee?: KneePose;
  readonly rightKnee?: KneePose;
  readonly leftFoot?: FootPose;
  readonly rightFoot?: FootPose;
}

export interface ActionStage {
  readonly pose: PoseId;
  readonly time: number; // normalized 0..1 along the action
}

export interface GolferAction {
  readonly id: ActionId;
  readonly stages: readonly ActionStage[];
}
