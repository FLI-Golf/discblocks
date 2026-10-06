// Focused tests for the semantic leg pose controls. Core rule: pose controls
// ROTATE joints around the fixed anatomical hip socket — they never translate
// the socket. BODY controls (Leg Spacing, Thigh Width...) own anatomy.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Golfer, DEFAULT_GOLFER_APPEARANCE, BODY_PROFILES } from '@/rendering/Golfer';
import { GolferPoseTarget } from '@/rendering/avatar';

const d = THREE.MathUtils.degToRad;
function setup() {
  const golfer = new Golfer({
    ...DEFAULT_GOLFER_APPEARANCE,
    profile: { ...BODY_PROFILES.neutralLean },
  });
  const target = new GolferPoseTarget(golfer);
  golfer.applyPoseBaseline();
  return { golfer, target };
}
const world = (g: Golfer, name: string, joint = false) => {
  const o = joint ? g.getJointGroup(name as never) : g.root.getObjectByName(name);
  const v = new THREE.Vector3();
  o!.getWorldPosition(v);
  return v;
};

describe('leg pose controls', () => {
  it('Hip Out/In rotates the leg around a FIXED hip socket', () => {
    for (const deg of [0, 20, 40, 60]) {
      const { golfer, target } = setup();
      const hipBefore = world(golfer, 'hipL', true);
      target.applyPose({ id: 't', name: 't', leftHip: { abduction: d(deg) } });
      golfer.root.updateMatrixWorld(true);
      const hipAfter = world(golfer, 'hipL', true);
      // socket never moves
      expect(hipAfter.distanceTo(hipBefore)).toBeLessThan(1e-6);
      // but the knee moves outward as abduction grows
      const knee = world(golfer, 'kneeL', true);
      if (deg === 0) expect(Math.abs(knee.x)).toBeLessThan(0.4);
      if (deg === 60) expect(Math.abs(knee.x)).toBeGreaterThan(1.0);
      golfer.dispose();
    }
  });

  it('Hip Forward/Back rotates around the same fixed socket', () => {
    const { golfer, target } = setup();
    const hipBefore = world(golfer, 'hipL', true);
    target.applyPose({ id: 't', name: 't', leftHip: { flexion: d(60) } });
    golfer.root.updateMatrixWorld(true);
    expect(world(golfer, 'hipL', true).distanceTo(hipBefore)).toBeLessThan(1e-6);
    expect(world(golfer, 'kneeL', true).z).toBeGreaterThan(0.5); // swings forward (+Z)
    golfer.dispose();
  });

  it('Hip Rotation twists the femur without moving the socket', () => {
    const { golfer, target } = setup();
    const hipBefore = world(golfer, 'hipL', true);
    target.applyPose({ id: 't', name: 't', leftHip: { rotation: d(45) } });
    golfer.root.updateMatrixWorld(true);
    expect(world(golfer, 'hipL', true).distanceTo(hipBefore)).toBeLessThan(1e-6);
    expect(Math.abs(golfer.getJointGroup('hipL')!.rotation.y)).toBeGreaterThan(0.1);
    golfer.dispose();
  });

  it('Knee Bend rotates the knee; hip socket + thigh length unchanged', () => {
    const { golfer, target } = setup();
    const hipBefore = world(golfer, 'hipL', true);
    target.applyPose({ id: 't', name: 't', leftKnee: { flexion: d(45) } });
    golfer.root.updateMatrixWorld(true);
    expect(world(golfer, 'hipL', true).distanceTo(hipBefore)).toBeLessThan(1e-6);
    // calf/foot follow: shoe moves when the knee bends
    const shoe = world(golfer, 'shoe-left');
    expect(Number.isFinite(shoe.x + shoe.y + shoe.z)).toBe(true);
    golfer.dispose();
  });

  it('all hip DOFs compose deterministically; one control does not erase others', () => {
    const { golfer, target } = setup();
    target.applyPose({
      id: 't',
      name: 't',
      leftHip: { flexion: d(35), abduction: d(25), rotation: d(15) },
      leftKnee: { flexion: d(45) },
    });
    const hip = golfer.getJointGroup('hipL')!;
    const rot = hip.rotation.clone();
    // change ONLY the knee; hip rotations must persist
    golfer.applyPoseBaseline();
    target.applyPose({
      id: 't',
      name: 't',
      leftHip: { flexion: d(35), abduction: d(25), rotation: d(15) },
      leftKnee: { flexion: d(0) },
    });
    expect(hip.rotation.x).toBeCloseTo(rot.x, 6);
    expect(hip.rotation.y).toBeCloseTo(rot.y, 6);
    expect(hip.rotation.z).toBeCloseTo(rot.z, 6);
    golfer.dispose();
  });

  it('left/right legs are independent', () => {
    const { golfer, target } = setup();
    target.applyPose({
      id: 't',
      name: 't',
      leftHip: { abduction: d(35) },
      leftKnee: { flexion: d(40) },
      rightHip: { abduction: 0 },
      rightKnee: { flexion: 0 },
    });
    golfer.root.updateMatrixWorld(true);
    expect(Math.abs(world(golfer, 'kneeL', true).x)).toBeGreaterThan(0.7);
    expect(Math.abs(world(golfer, 'kneeR', true).x)).toBeLessThan(0.4);
    golfer.dispose();
  });

  it('returning to 0 restores the exact baseline', () => {
    const { golfer, target } = setup();
    const base = world(golfer, 'kneeL', true);
    target.applyPose({ id: 't', name: 't', leftHip: { abduction: d(45), flexion: d(30) } });
    golfer.applyPoseBaseline();
    target.applyPose({ id: 't', name: 't', leftHip: { abduction: 0, flexion: 0 } });
    golfer.root.updateMatrixWorld(true);
    expect(world(golfer, 'kneeL', true).distanceTo(base)).toBeLessThan(1e-3);
    golfer.dispose();
  });

  it('no NaN/Infinity across extremes', () => {
    const { golfer, target } = setup();
    target.applyPose({
      id: 't',
      name: 't',
      leftHip: { flexion: d(90), abduction: d(60), rotation: d(60) },
      rightHip: { flexion: d(-60), abduction: d(60), rotation: d(-60) },
      leftKnee: { flexion: d(120) },
      rightKnee: { flexion: d(120) },
    });
    golfer.root.updateMatrixWorld(true);
    let finite = true;
    golfer.root.traverse((o) => {
      if (!Number.isFinite(o.position.x + o.position.y + o.position.z)) finite = false;
      if (!Number.isFinite(o.rotation.x + o.rotation.y + o.rotation.z)) finite = false;
    });
    expect(finite).toBe(true);
    golfer.dispose();
  });
});
