import type { GolferPose, JointName, JointTransform } from './types';

// Boundary between semantic pose data and a concrete Three.js rig.
// Golfer.ts will implement this against its joints; it is defined here first so
// pose/action code stays decoupled from the procedural mesh.
export interface PoseTarget {
  applyPose(pose: GolferPose): void;
  setJoint(name: JointName, transform: JointTransform): void;
  getJoint(name: JointName): JointTransform | undefined;
}
