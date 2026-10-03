// Focused tests for the shorts garment fix: the visible clothing is separate
// from the anatomical pelvis, recolors as one garment, and no semantic joint
// maps onto it.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Golfer, DEFAULT_GOLFER_APPEARANCE } from '@/rendering/Golfer';
import { GolferPoseTarget } from '@/rendering/avatar';

describe('shorts garment', () => {
  it('exposes shorts-root + pieces and no pelvis-part mesh', () => {
    const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    expect(golfer.root.getObjectByName('shorts-root')).toBeDefined();
    expect(golfer.root.getObjectByName('shorts-waist')).toBeDefined();
    expect(golfer.root.getObjectByName('shorts-left')).toBeDefined();
    expect(golfer.root.getObjectByName('shorts-right')).toBeDefined();
    expect(golfer.root.getObjectByName('pelvis-part')).toBeUndefined();
    golfer.dispose();
  });

  it('shorts are parented under the anatomical hips joint (follow the pelvis)', () => {
    const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    const hips = golfer.getJointGroup('hips')!;
    const shortsRoot = golfer.root.getObjectByName('shorts-root')!;
    expect(shortsRoot.parent).toBe(hips);
    golfer.dispose();
  });

  it('shorts do not extend to the knees (thighs stay visible)', () => {
    const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    golfer.applyPoseBaseline();
    golfer.root.updateMatrixWorld(true);
    const shorts = new THREE.Box3().setFromObject(golfer.root.getObjectByName('shorts-root')!);
    const knee = golfer.getJointGroup('kneeL')!.getWorldPosition(new THREE.Vector3());
    // Shorts bottom must sit well above the knees.
    expect(shorts.min.y).toBeGreaterThan(knee.y + 0.3);
    golfer.dispose();
  });

  it('recolors the whole garment with shortsColor', () => {
    const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    golfer.setAppearance({ ...golfer.appearance, shortsColor: 0x123456 });
    for (const name of ['shorts-waist', 'shorts-left', 'shorts-right']) {
      const mesh = golfer.root.getObjectByName(name) as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      expect(mat.color.getHex()).toBe(0x123456);
    }
    golfer.dispose();
  });

  it('anatomical hips joint is independent from the clothing mesh', () => {
    const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    const hips = golfer.getJointGroup('hips')!;
    const shortsRoot = golfer.root.getObjectByName('shorts-root')!;
    expect(hips).not.toBe(shortsRoot);
    expect(hips.type).toBe('Group');
    golfer.dispose();
  });

  it('no semantic pose joint resolves to the shorts mesh', () => {
    const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    const target = new GolferPoseTarget(golfer);
    const pelvisJoint = target.getJoint('pelvis');
    expect(pelvisJoint).toBeDefined();
    // The semantic pelvis maps to the hips Group, not the shorts clothing.
    const hips = golfer.getJointGroup('hips')!;
    expect(pelvisJoint?.position?.[1]).toBeCloseTo(hips.position.y, 5);
    golfer.dispose();
  });
});
