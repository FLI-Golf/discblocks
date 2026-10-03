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
  readonly rotation?: number;
  readonly lean?: number;
  readonly twist?: number;
}

export type PoseId = string;
export type ActionId = string;

export interface GolferPose {
  readonly id: PoseId;
  readonly name: string;
  readonly torso?: TorsoPose;
  readonly leftShoulder?: ShoulderPose;
  readonly rightShoulder?: ShoulderPose;
  readonly leftElbow?: ElbowPose;
  readonly rightElbow?: ElbowPose;
}

export interface ActionStage {
  readonly pose: PoseId;
  readonly time: number; // normalized 0..1 along the action
}

export interface GolferAction {
  readonly id: ActionId;
  readonly stages: readonly ActionStage[];
}
