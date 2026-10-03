export * from './types';
export { PoseLibrary } from './PoseLibrary';
export { ActionLibrary } from './ActionLibrary';
export type { PoseTarget } from './PoseTarget';
export { GolferPoseTarget } from './GolferPoseTarget';

import type { GolferPose } from './types';
import { PoseLibrary } from './PoseLibrary';

// First reusable pose: neutral standing. Milestone 2.
export const NEUTRAL_STANDING_POSE: GolferPose = {
  id: 'neutral/standing',
  name: 'Neutral Standing',
  torso: { rotation: 0, lean: 0 },
  leftShoulder: { abduction: 0.15, flexion: 0, rotation: 0 },
  rightShoulder: { abduction: 0.15, flexion: 0, rotation: 0 },
  leftElbow: { flexion: 0.1 },
  rightElbow: { flexion: 0.1 },
};

export function createDefaultPoseLibrary(): PoseLibrary {
  const library = new PoseLibrary();
  library.register(NEUTRAL_STANDING_POSE);
  return library;
}
