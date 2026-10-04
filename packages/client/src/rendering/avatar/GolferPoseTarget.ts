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
    // All controls compose from the current baseline rotation (captured each
    // frame via applyPoseBaseline in the host). We add semantic offsets, never
    // accumulate.
    if (pose.leftShoulder) {
      this.applyShoulder('shoulderL', 'left', pose.leftShoulder);
    }
    if (pose.rightShoulder) {
      this.applyShoulder('shoulderR', 'right', pose.rightShoulder);
    }
    if (pose.leftElbow) {
      this.applyElbow('elbowL', pose.leftElbow);
    }
    if (pose.rightElbow) {
      this.applyElbow('elbowR', pose.rightElbow);
    }
    if (pose.head) {
      this.applyHead(pose.head);
    }
    if (pose.leftHip) {
      this.applyHip('hipL', 'left', pose.leftHip);
    }
    if (pose.rightHip) {
      this.applyHip('hipR', 'right', pose.rightHip);
    }
    if (pose.leftKnee) {
      this.applyKnee('kneeL', pose.leftKnee);
    }
    if (pose.rightKnee) {
      this.applyKnee('kneeR', pose.rightKnee);
    }
    if (pose.pelvis) {
      this.applyPelvis(pose.pelvis);
    }
    if (pose.torso) {
      this.applyTorso(pose.torso);
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

  // Anatomical shoulder. Local axes (empirically validated on this rig):
  //   abduction (arm out/in)  -> local Z, mirrored signs (right +=, left -=)
  //   flexion (arm fwd/back)  -> local X, same sign both sides (forward = -X)
  //   rotation (twist)        -> local Y, mirrored signs
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
      group.rotation.x - flexion,
      group.rotation.y + twist * sign,
      group.rotation.z + abduction * sign
    );
  }

  // Elbow flexion bends the forearm toward the body. Local Z, same + sign both
  // sides curls the hand up/in on this rig.
  private applyElbow(joint: 'elbowL' | 'elbowR', pose: { flexion?: number }): void {
    const group = this.golfer.getJointGroup(joint);
    if (!group) {
      return;
    }
    const flexion = pose.flexion ?? 0;
    group.rotation.set(group.rotation.x, group.rotation.y, group.rotation.z + flexion);
  }

  // Hip. flexion (step forward/back) -> local X (forward = -X). abduction
  // (leg out/in) -> local Z, mirrored (right +=, left -=). rotation (femur
  // axial twist) -> local Y, mirrored. All compose onto the captured baseline;
  // the hip socket position never moves (rotation-only pose).
  private applyHip(
    joint: 'hipL' | 'hipR',
    side: 'left' | 'right',
    pose: { flexion?: number; abduction?: number; rotation?: number }
  ): void {
    const group = this.golfer.getJointGroup(joint);
    if (!group) {
      return;
    }
    const sign = side === 'right' ? 1 : -1;
    const flexion = pose.flexion ?? 0;
    const abduction = pose.abduction ?? 0;
    const rotation = pose.rotation ?? 0;
    group.rotation.set(
      group.rotation.x - flexion,
      group.rotation.y + rotation * sign,
      group.rotation.z + abduction * sign
    );
  }

  // Pelvis (hips joint). Validated axes: turn left/right -> local Y, tilt
  // left/right -> local Z, forward/back -> local X. Rotates the lower body so
  // coil/uncoil can differ from torso rotation.
  private applyPelvis(pose: { rotation?: number; lateralTilt?: number; flexion?: number }): void {
    const group = this.golfer.getJointGroup('hips');
    if (!group) {
      return;
    }
    group.rotation.set(
      group.rotation.x + (pose.flexion ?? 0),
      group.rotation.y + (pose.rotation ?? 0),
      group.rotation.z + (pose.lateralTilt ?? 0)
    );
  }

  // Knee flexion bends the lower leg back/up. Local X.
  private applyKnee(joint: 'kneeL' | 'kneeR', pose: { flexion?: number }): void {
    const group = this.golfer.getJointGroup(joint);
    if (!group) {
      return;
    }
    const flexion = pose.flexion ?? 0;
    group.rotation.set(group.rotation.x + flexion, group.rotation.y, group.rotation.z);
  }

  // Head. yaw -> local Y (+ turns toward golfer's right), pitch -> local X
  // (- looks up). Rotates the whole head hierarchy; face features follow.
  private applyHead(pose: { yaw?: number; pitch?: number }): void {
    const group = this.golfer.getJointGroup('head');
    if (!group) {
      return;
    }
    const yaw = pose.yaw ?? 0;
    const pitch = pose.pitch ?? 0;
    group.rotation.set(group.rotation.x - pitch, group.rotation.y + yaw, group.rotation.z);
  }

  // Torso. Semantic zero = neutral baseline: offsets compose onto the
  // captured baseline rotation (like every other joint), never absolute.
  // turn -> local Y, lean/flexion -> local X, lateralLean -> local Z.
  private applyTorso(pose: {
    rotation?: number;
    lean?: number;
    flexion?: number;
    lateralLean?: number;
    twist?: number;
  }): void {
    const group = this.golfer.getJointGroup('torso');
    if (!group) {
      return;
    }
    const lean = pose.lean ?? pose.flexion ?? 0;
    group.rotation.set(
      group.rotation.x + lean,
      group.rotation.y + (pose.rotation ?? 0) + (pose.twist ?? 0),
      group.rotation.z + (pose.lateralLean ?? 0)
    );
  }
}
