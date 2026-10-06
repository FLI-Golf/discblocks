// Focused tests for the shorts garment fix: the visible clothing is separate
// from the anatomical pelvis, recolors as one garment, and no semantic joint
// maps onto it.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Golfer, DEFAULT_GOLFER_APPEARANCE } from '@/rendering/Golfer';
import { GolferPoseTarget } from '@/rendering/avatar';

describe('shorts garment', () => {
  it('exposes the garment regions: waist assembly + two leg assemblies', () => {
    const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    expect(golfer.root.getObjectByName('shorts-root')).toBeDefined();
    expect(golfer.root.getObjectByName('shorts-waist-root')).toBeDefined();
    expect(golfer.root.getObjectByName('shorts-upper-part')).toBeDefined();
    expect(golfer.root.getObjectByName('shorts-leg-left')).toBeDefined();
    expect(golfer.root.getObjectByName('shorts-leg-right')).toBeDefined();
    expect(golfer.root.getObjectByName('pelvis-part')).toBeUndefined();
    golfer.dispose();
  });

  it('upper shorts + waistband + buckle belong to shorts-waist-root', () => {
    const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    const waistRoot = golfer.root.getObjectByName('shorts-waist-root')!;
    const under = (o: THREE.Object3D): boolean => {
      let p: THREE.Object3D | null = o;
      while (p) {
        if (p === waistRoot) return true;
        p = p.parent;
      }
      return false;
    };
    expect(under(golfer.root.getObjectByName('shorts-upper-part')!)).toBe(true);
    expect(under(golfer.root.getObjectByName('belt-root')!)).toBe(true);
    expect(under(golfer.root.getObjectByName('jersey-hem')!)).toBe(true);
    expect(under(golfer.root.getObjectByName('belt-buckle')!)).toBe(true);
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
    // Shorts bottom must sit above the knee joint (the canonical avatar's
    // proportions place it near the knee; the invariant is "not past it").
    expect(shorts.min.y).toBeGreaterThan(knee.y);
    golfer.dispose();
  });

  it('recolors the whole garment with shortsColor', () => {
    const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    golfer.setAppearance({ ...golfer.appearance, shortsColor: 0x123456 });
    for (const name of ['shorts-upper-part', 'shorts-leg-left', 'shorts-leg-right']) {
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
