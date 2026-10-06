import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Golfer, DEFAULT_GOLFER_APPEARANCE } from '@/rendering/Golfer';
import { GolferPoseTarget, type GolferPose } from '@/rendering/avatar';

describe('GolferPoseTarget', () => {
  it('applies semantic shoulder abduction to the real rig', () => {
    const golfer = new Golfer(DEFAULT_GOLFER_APPEARANCE);
    const target = new GolferPoseTarget(golfer);
    golfer.root.updateMatrixWorld(true);
    const hand = golfer.getJointGroup('shoulderR')!;
    const before = hand.rotation.z; // baseline (natural hang)

    // Semantic abduction is calibrated: 90° (PI/2) => upper arm horizontal.
    // 0.8 rad (~46°) should move the arm partway from baseline toward the
    // horizontal raw-Z value, i.e. baseline + frac*(horizontalZ - baseline).
    const pose: GolferPose = {
      id: 'test/abduct',
      name: 'Abduct',
      rightShoulder: { abduction: 0.8 },
    };
    target.applyPose(pose);
    const frac = 0.8 / (Math.PI / 2);
    const baselineZ = before; // right baseline is negative (~-0.34)
    const horizontalZ = (-Math.PI / 2) * Math.sign(baselineZ);
    const expected = baselineZ + frac * (horizontalZ - baselineZ);
    expect(hand.rotation.z).toBeCloseTo(expected, 5);
    golfer.dispose();
  });

  it('reads and writes joints through the semantic map', () => {
    const golfer = new Golfer(DEFAULT_GOLFER_APPEARANCE);
    const target = new GolferPoseTarget(golfer);
    const read = target.getJoint('rightShoulder');
    expect(read).toBeDefined();
    expect(read?.position).toHaveLength(3);

    target.setJoint('rightElbow', { rotation: [0, 0, 0.5] });
    const elbow = golfer.getJointGroup('elbowR')!;
    expect(elbow.rotation.z).toBeCloseTo(0.5, 5);
    golfer.dispose();
  });

  it('produces a lateral T-pose via semantic abduction (both arms out, in shoulder plane)', () => {
    const golfer = new Golfer(DEFAULT_GOLFER_APPEARANCE);
    const target = new GolferPoseTarget(golfer);
    const handR = () =>
      (golfer as unknown as { attachPoints: Map<string, THREE.Object3D> }).attachPoints
        .get('rightHand')!
        .getWorldPosition(new THREE.Vector3());
    const handL = () =>
      (golfer as unknown as { attachPoints: Map<string, THREE.Object3D> }).attachPoints
        .get('leftHand')!
        .getWorldPosition(new THREE.Vector3());

    const pose: GolferPose = {
      id: 'test/t-pose',
      name: 'T Pose',
      rightShoulder: { abduction: 1.2 },
      leftShoulder: { abduction: 1.2 },
    };
    target.applyPose(pose);
    golfer.root.updateMatrixWorld(true);
    const hR = handR();
    const hL = handL();
    // both hands move OUT away from their shoulders (mirrored) and stay near z=0
    expect(Math.abs(hR.x)).toBeGreaterThan(0);
    expect(hR.x).toBeCloseTo(-hL.x, 1);
    expect(Math.abs(hR.z)).toBeLessThan(0.5);
    golfer.dispose();
  });
});
