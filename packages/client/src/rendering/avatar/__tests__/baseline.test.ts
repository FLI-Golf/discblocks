// Focused tests for the deterministic male baseline:
//  - Reset To Male Baseline must always restore the exact same joint rotations
//  - Baseline restoration after arbitrary semantic pose application
//  - Canonical orientation documentation (face = +Z, current L/R convention)
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Golfer, DEFAULT_GOLFER_APPEARANCE } from '@/rendering/Golfer';
import { GolferPoseTarget, type GolferPose } from '@/rendering/avatar';

const JOINTS = [
  'hips',
  'torso',
  'head',
  'shoulderL',
  'elbowL',
  'shoulderR',
  'elbowR',
  'hipL',
  'kneeL',
  'hipL',
  'kneeR',
] as const;

type JointSnapshot = Record<string, [number, number, number]>;

function snapshotRotations(golfer: Golfer): JointSnapshot {
  const snap: JointSnapshot = {};
  for (const name of JOINTS) {
    const g = golfer.getJointGroup(name)!;
    snap[name] = [g.rotation.x, g.rotation.y, g.rotation.z];
  }
  return snap;
}

const OFFSET_POSE: GolferPose = {
  id: 'test/offsets',
  name: 'Offsets',
  leftShoulder: { abduction: 0.9 },
  rightShoulder: { abduction: 0.7 },
  leftHip: { flexion: 0.4, abduction: 0.2 },
  rightKnee: { flexion: 0.5 },
  torso: { rotation: 0.3, lean: 0.2 },
  pelvis: { rotation: -0.2, lateralTilt: 0.1, flexion: 0.1 },
  head: { yaw: 0.4, pitch: -0.2 },
};

describe('male baseline', () => {
  it('reset is deterministic across move/reset cycles', () => {
    const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    const target = new GolferPoseTarget(golfer);

    golfer.applyPoseBaseline();
    const first = snapshotRotations(golfer);

    for (let cycle = 0; cycle < 3; cycle++) {
      target.applyPose(OFFSET_POSE);
      golfer.applyPoseBaseline();
      const snap = snapshotRotations(golfer);
      for (const name of JOINTS) {
        expect(snap[name][0]).toBeCloseTo(first[name][0], 6);
        expect(snap[name][1]).toBeCloseTo(first[name][1], 6);
        expect(snap[name][2]).toBeCloseTo(first[name][2], 6);
      }
    }
    golfer.dispose();
  });

  it('a zero semantic pose exactly restores the baseline', () => {
    const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    const target = new GolferPoseTarget(golfer);
    golfer.applyPoseBaseline();
    const baseline = snapshotRotations(golfer);

    target.applyPose(OFFSET_POSE);
    const zeroPose: GolferPose = {
      id: 'test/zero',
      name: 'Zero',
      leftShoulder: { abduction: 0 },
      rightShoulder: { abduction: 0 },
      leftHip: { flexion: 0, abduction: 0 },
      rightHip: { flexion: 0, abduction: 0 },
      leftKnee: { flexion: 0 },
      rightKnee: { flexion: 0 },
      torso: { rotation: 0, lean: 0 },
      pelvis: { rotation: 0, lateralTilt: 0, flexion: 0 },
      head: { yaw: 0, pitch: 0 },
    };
    golfer.applyPoseBaseline();
    target.applyPose(zeroPose);
    const restored = snapshotRotations(golfer);
    for (const name of JOINTS) {
      expect(restored[name][0]).toBeCloseTo(baseline[name][0], 6);
      expect(restored[name][1]).toBeCloseTo(baseline[name][1], 6);
      expect(restored[name][2]).toBeCloseTo(baseline[name][2], 6);
    }
    golfer.dispose();
  });

  it('face defines anatomical forward (+Z)', () => {
    const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    golfer.applyPoseBaseline();
    golfer.root.updateMatrixWorld(true);
    const head = golfer.getJointGroup('head')!.getWorldPosition(new THREE.Vector3());
    const nose = golfer.root.getObjectByName('nose-part')!.getWorldPosition(new THREE.Vector3());
    expect(nose.z).toBeGreaterThan(head.z);
    golfer.dispose();
  });

  it('documents current rig L/R convention (joints named L sit at -X)', () => {
    const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    golfer.applyPoseBaseline();
    golfer.root.updateMatrixWorld(true);
    const l = golfer.getJointGroup('shoulderL')!.getWorldPosition(new THREE.Vector3());
    const r = golfer.getJointGroup('shoulderR')!.getWorldPosition(new THREE.Vector3());
    // CURRENT rig convention: "L" joints at -X, "R" joints at +X.
    // NOTE: with the face at +Z, anatomical left is +X from the golfer's
    // perspective — so this convention is MIRRORED vs the canonical rule.
    // Audit finding; pending decision before any rename/remap.
    expect(l.x).toBeLessThan(0);
    expect(r.x).toBeGreaterThan(0);
    expect(l.x).toBeCloseTo(-r.x, 4);
    golfer.dispose();
  });

  it.todo('canonical rule: anatomical left = +X (rig currently mirrored — see audit)');
});
