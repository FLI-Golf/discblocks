import { describe, it, expect } from 'vitest';
import {
  ActionLibrary,
  PoseLibrary,
  createDefaultPoseLibrary,
  NEUTRAL_STANDING_POSE,
  type GolferPose,
  type GolferAction,
} from '@/rendering/avatar';

describe('PoseLibrary', () => {
  it('registers, gets, has, and lists poses', () => {
    const lib = new PoseLibrary();
    const pose: GolferPose = { id: 'backhand/reach-back', name: 'Reach Back' };
    lib.register(pose);
    expect(lib.has('backhand/reach-back')).toBe(true);
    expect(lib.get('backhand/reach-back')?.name).toBe('Reach Back');
    expect(lib.list()).toHaveLength(1);
    expect(lib.get('missing')).toBeUndefined();
  });

  it('default library contains the neutral standing pose', () => {
    const lib = createDefaultPoseLibrary();
    expect(lib.has('neutral/standing')).toBe(true);
    expect(lib.get('neutral/standing')).toEqual(NEUTRAL_STANDING_POSE);
  });
});

describe('ActionLibrary', () => {
  it('registers and retrieves actions with stages', () => {
    const lib = new ActionLibrary();
    const action: GolferAction = {
      id: 'backhand',
      stages: [
        { pose: 'backhand/ready', time: 0 },
        { pose: 'backhand/release', time: 0.74 },
      ],
    };
    lib.register(action);
    expect(lib.has('backhand')).toBe(true);
    expect(lib.get('backhand')?.stages).toHaveLength(2);
    expect(lib.list()).toHaveLength(1);
  });
});
