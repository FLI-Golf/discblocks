// Focused tests for the four semantic arm pose controls (both arms).
// Flow: semantic value -> GolferPose -> GolferPoseTarget -> anatomical joint.
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
const palmY = (g: Golfer, side: 'left' | 'right') => {
  const v = new THREE.Vector3();
  g.root.getObjectByName(`palm-${side}`)!.getWorldPosition(v);
  return v.y;
};

describe('arm pose controls', () => {
  it('left/right shoulder abduction are independent', () => {
    const { golfer, target } = setup();
    target.applyPose({
      id: 't',
      name: 't',
      leftShoulder: { abduction: d(90) },
      rightShoulder: { abduction: 0 },
    });
    golfer.root.updateMatrixWorld(true);
    expect(palmY(golfer, 'left')).toBeGreaterThan(2.2);
    expect(palmY(golfer, 'right')).toBeLessThan(2.0); // right stayed near side
    golfer.dispose();
  });

  it('abduction supports the extended high range (180°)', () => {
    const { golfer, target } = setup();
    target.applyPose({ id: 't', name: 't', leftShoulder: { abduction: d(180) } });
    golfer.root.updateMatrixWorld(true);
    // At 180 the hand should be overhead (higher than at 90).
    const y180 = palmY(golfer, 'left');
    const g2 = setup();
    g2.target.applyPose({ id: 't', name: 't', leftShoulder: { abduction: d(90) } });
    g2.golfer.root.updateMatrixWorld(true);
    expect(y180).toBeGreaterThan(palmY(g2.golfer, 'left'));
    golfer.dispose();
    g2.golfer.dispose();
  });

  it('semantic 0 returns the exact baseline', () => {
    const { golfer, target } = setup();
    const base = palmY(golfer, 'left');
    target.applyPose({ id: 't', name: 't', leftShoulder: { abduction: d(90), flexion: d(40) } });
    golfer.applyPoseBaseline();
    target.applyPose({ id: 't', name: 't', leftShoulder: { abduction: 0, flexion: 0 } });
    golfer.root.updateMatrixWorld(true);
    expect(Math.abs(palmY(golfer, 'left') - base)).toBeLessThan(1e-3);
    golfer.dispose();
  });

  it('forward/back changes shoulder flexion DOF (hand moves +Z forward)', () => {
    const { golfer, target } = setup();
    const v0 = new THREE.Vector3();
    golfer.root.getObjectByName('palm-left')!.getWorldPosition(v0);
    target.applyPose({ id: 't', name: 't', leftShoulder: { flexion: d(90) } });
    golfer.root.updateMatrixWorld(true);
    const v1 = new THREE.Vector3();
    golfer.root.getObjectByName('palm-left')!.getWorldPosition(v1);
    expect(v1.z).toBeGreaterThan(v0.z + 0.5); // moved forward (+Z)
    golfer.dispose();
  });

  it('twist rotates about the arm axis without translating the shoulder', () => {
    const { golfer, target } = setup();
    const sh = golfer.getJointGroup('shoulderL')!;
    const p0 = sh.position.clone();
    target.applyPose({ id: 't', name: 't', leftShoulder: { rotation: d(90) } });
    expect(sh.position.distanceTo(p0)).toBeLessThan(1e-6);
    golfer.dispose();
  });

  it('elbow bend controls elbow flexion (hand rises)', () => {
    const { golfer, target } = setup();
    const base = palmY(golfer, 'left');
    target.applyPose({ id: 't', name: 't', leftElbow: { flexion: d(90) } });
    golfer.root.updateMatrixWorld(true);
    expect(palmY(golfer, 'left')).toBeGreaterThan(base + 0.5);
    golfer.dispose();
  });

  it('left/right elbow controls are independent', () => {
    const { golfer, target } = setup();
    target.applyPose({
      id: 't',
      name: 't',
      leftElbow: { flexion: d(90) },
      rightElbow: { flexion: 0 },
    });
    golfer.root.updateMatrixWorld(true);
    expect(palmY(golfer, 'left')).toBeGreaterThan(palmY(golfer, 'right') + 0.5);
    golfer.dispose();
  });

  it('one semantic DOF does not erase the others', () => {
    const { golfer, target } = setup();
    target.applyPose({ id: 't', name: 't', leftShoulder: { abduction: d(60), flexion: d(30) } });
    const sh = golfer.getJointGroup('shoulderL')!;
    const zAfterAbdFlex = sh.rotation.z;
    // now change only twist via a fresh pose
    golfer.applyPoseBaseline();
    target.applyPose({
      id: 't',
      name: 't',
      leftShoulder: { abduction: d(60), flexion: d(30), rotation: d(45) },
    });
    expect(Math.abs(sh.rotation.z - zAfterAbdFlex)).toBeLessThan(1e-6); // abduction preserved
    expect(Math.abs(sh.rotation.y)).toBeGreaterThan(0.1); // twist applied
    golfer.dispose();
  });

  it('repeated application is deterministic (no accumulation)', () => {
    const { golfer, target } = setup();
    const pose = { id: 't', name: 't', leftShoulder: { abduction: d(75) } };
    target.applyPose(pose);
    const z1 = golfer.getJointGroup('shoulderL')!.rotation.z;
    golfer.applyPoseBaseline();
    target.applyPose(pose);
    const z2 = golfer.getJointGroup('shoulderL')!.rotation.z;
    expect(Math.abs(z1 - z2)).toBeLessThan(1e-6);
    golfer.dispose();
  });

  it('sleeves follow the arm hierarchy (shoulder abduction carries the sleeve)', () => {
    const { golfer, target } = setup();
    const c0 = new THREE.Box3()
      .setFromObject(golfer.root.getObjectByName('sleeve-left')!)
      .getCenter(new THREE.Vector3());
    target.applyPose({ id: 't', name: 't', leftShoulder: { abduction: d(90) } });
    golfer.root.updateMatrixWorld(true);
    const c1 = new THREE.Box3()
      .setFromObject(golfer.root.getObjectByName('sleeve-left')!)
      .getCenter(new THREE.Vector3());
    // The sleeve is a short tube near the shoulder pivot, so its center moves
    // less than the hand; a clear positive movement proves it follows the arm.
    expect(c1.distanceTo(c0)).toBeGreaterThan(0.15); // sleeve moved with the arm
    golfer.dispose();
  });

  it('no NaN/Infinity transforms across slider extremes', () => {
    const { golfer, target } = setup();
    target.applyPose({
      id: 't',
      name: 't',
      leftShoulder: { abduction: d(180), flexion: d(180), rotation: d(90) },
      rightShoulder: { abduction: d(180), flexion: d(-90), rotation: d(-90) },
      leftElbow: { flexion: d(145) },
      rightElbow: { flexion: d(145) },
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
