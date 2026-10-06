import { describe, it, expect } from 'vitest';
import { Golfer, DEFAULT_GOLFER_APPEARANCE } from '@/rendering/Golfer';
import { GolferPoseTarget, type GolferPose } from '@/rendering/avatar';

function makeTarget() {
  const golfer = new Golfer(DEFAULT_GOLFER_APPEARANCE);
  const target = new GolferPoseTarget(golfer);
  return { golfer, target };
}

describe('GolferPoseTarget expanded controls', () => {
  it('shoulder flexion moves the arm forward (local -X) on the correct joint only', () => {
    const { golfer, target } = makeTarget();
    const pose: GolferPose = {
      id: 't',
      name: 't',
      rightShoulder: { flexion: 0.5 },
    };
    golfer.applyPoseBaseline();
    target.applyPose(pose);
    const sR = golfer.getJointGroup('shoulderR')!;
    const sL = golfer.getJointGroup('shoulderL')!;
    expect(sR.rotation.x).toBeLessThan(0); // forward
    expect(sL.rotation.x).not.toBeCloseTo(sR.rotation.x, 5); // left unchanged
    golfer.dispose();
  });

  it('elbow flexion bends only that elbow', () => {
    const { golfer, target } = makeTarget();
    golfer.applyPoseBaseline();
    target.applyPose({ id: 't', name: 't', leftElbow: { flexion: 0.6 } });
    const eL = golfer.getJointGroup('elbowL')!;
    const eR = golfer.getJointGroup('elbowR')!;
    expect(eL.rotation.z).toBeGreaterThan(0.5);
    expect(eR.rotation.z).not.toBeCloseTo(eL.rotation.z, 5);
    golfer.dispose();
  });

  it('head yaw turns the head without touching shoulders', () => {
    const { golfer, target } = makeTarget();
    golfer.applyPoseBaseline();
    const head = golfer.getJointGroup('head')!;
    const baseYaw = head.rotation.y;
    const basePitch = head.rotation.x;
    const sRz = golfer.getJointGroup('shoulderR')!.rotation.z;
    target.applyPose({ id: 't', name: 't', head: { yaw: 0.5, pitch: 0.2 } });
    // composed onto baseline
    expect(head.rotation.y).toBeCloseTo(baseYaw + 0.5, 5);
    expect(head.rotation.x).toBeCloseTo(basePitch - 0.2, 5); // pitch up = -x
    expect(golfer.getJointGroup('shoulderR')!.rotation.z).toBeCloseTo(sRz, 5);
    golfer.dispose();
  });

  it('does not accumulate: re-applying from baseline is idempotent', () => {
    const { golfer, target } = makeTarget();
    const sR = golfer.getJointGroup('shoulderR')!;
    const pose: GolferPose = { id: 't', name: 't', rightShoulder: { abduction: 0.7 } };
    golfer.applyPoseBaseline();
    target.applyPose(pose);
    const first = sR.rotation.z;
    golfer.applyPoseBaseline();
    target.applyPose(pose);
    expect(sR.rotation.z).toBeCloseTo(first, 5);
    golfer.dispose();
  });

  it('reset returns baseline (all semantic zero = STAND_POSE)', () => {
    const { golfer, target } = makeTarget();
    const sR = golfer.getJointGroup('shoulderR')!;
    golfer.applyPoseBaseline();
    const baseline = sR.rotation.z;
    target.applyPose({ id: 't', name: 't', rightShoulder: { abduction: 1.0 } });
    expect(sR.rotation.z).not.toBeCloseTo(baseline, 3);
    golfer.applyPoseBaseline();
    expect(sR.rotation.z).toBeCloseTo(baseline, 5);
    golfer.dispose();
  });
});
