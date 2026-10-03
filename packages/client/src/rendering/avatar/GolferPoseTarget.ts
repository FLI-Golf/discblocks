import type { Golfer } from '@/rendering/Golfer';
import type { GolferPose, JointName as SemanticJointName, JointTransform } from './types';
import type { PoseTarget } from './PoseTarget';

// Maps semantic avatar joints to the procedural Golfer's joint names.
const JOINT_MAP: Record<SemanticJointName, string> = {
  pelvis: 'hips',
  torso: 'torso',
  neck: 'neck',
  head: 'head',
  leftShoulder: 'shoulderL',
  leftElbow: 'elbowL',
  leftWrist: 'elbowL',
  rightShoulder: 'shoulderR',
  rightElbow: 'elbowR',
  rightWrist: 'elbowR',
  leftHip: 'hipL',
  leftKnee: 'kneeL',
  leftAnkle: 'kneeL',
  rightHip: 'hipR',
  rightKnee: 'kneeR',
  rightAnkle: 'kneeR',
};

// Golfer's JointName is not exported; use a narrow structural type.
type GolferJointName = Parameters<Golfer['getJointGroup']>[0];

export class GolferPoseTarget implements PoseTarget {
  private readonly golfer: Golfer;

  constructor(golfer: Golfer) {
    this.golfer = golfer;
  }

  applyPose(pose: GolferPose): void {
    if (pose.leftShoulder) {
      this.applyShoulder('shoulderL', 'left', pose.leftShoulder);
    }
    if (pose.rightShoulder) {
      this.applyShoulder('shoulderR', 'right', pose.rightShoulder);
    }
    if (pose.leftElbow?.flexion !== undefined) {
      this.setJointRotation('elbowL', [0, 0, pose.leftElbow.flexion * 0.5]);
    }
    if (pose.rightElbow?.flexion !== undefined) {
      this.setJointRotation('elbowR', [0, 0, -(pose.rightElbow.flexion ?? 0) * 0.5]);
    }
    if (pose.torso) {
      this.setJointRotation('torso', [pose.torso.lean ?? 0, pose.torso.rotation ?? 0, 0]);
    }
  }

  setJoint(name: SemanticJointName, transform: JointTransform): void {
    const group = this.golfer.getJointGroup(JOINT_MAP[name] as GolferJointName);
    if (!group) {
      return;
    }
    if (transform.position) {
      group.position.set(...(transform.position as [number, number, number]));
    }
    if (transform.rotation) {
      group.rotation.set(...(transform.rotation as [number, number, number]));
    }
    if (transform.scale) {
      group.scale.set(...(transform.scale as [number, number, number]));
    }
  }

  getJoint(name: SemanticJointName): JointTransform | undefined {
    const group = this.golfer.getJointGroup(JOINT_MAP[name] as GolferJointName);
    if (!group) {
      return undefined;
    }
    return {
      position: [group.position.x, group.position.y, group.position.z],
      rotation: [group.rotation.x, group.rotation.y, group.rotation.z],
      scale: [group.scale.x, group.scale.y, group.scale.z],
    };
  }

  // Anatomical shoulder: abduction swings the arm out/up (jumping-jack) along
  // the shoulder's local Z axis with mirrored signs (right +=, left -=).
  private applyShoulder(
    joint: 'shoulderL' | 'shoulderR',
    side: 'left' | 'right',
    pose: { abduction?: number; flexion?: number; rotation?: number }
  ): void {
    const group = this.golfer.getJointGroup(joint);
    if (!group) {
      return;
    }
    const sign = side === 'right' ? 1 : -1;
    const abduction = pose.abduction ?? 0;
    const flexion = pose.flexion ?? 0;
    const twist = pose.rotation ?? 0;
    group.rotation.set(
      group.rotation.x + flexion,
      group.rotation.y + twist * sign,
      group.rotation.z + abduction * sign
    );
  }

  private setJointRotation(joint: string, rotation: [number, number, number]): void {
    const group = this.golfer.getJointGroup(joint as GolferJointName);
    if (group) {
      group.rotation.set(...rotation);
    }
  }
}
