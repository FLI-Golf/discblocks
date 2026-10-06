// Structural tests for the anatomical WAIST → PELVIS/HIPS body factory.
// The pelvis is BODY geometry (skin), parented to the `hips` joint, flaring
// from the finalized waist bottom out to the hip line. It must never be
// clothing and never substitute for the shorts garment.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Golfer, DEFAULT_GOLFER_APPEARANCE, BODY_PROFILES } from '@/rendering/Golfer';

function makeGolfer(profileOverrides: Record<string, number> = {}) {
  return new Golfer({
    ...DEFAULT_GOLFER_APPEARANCE,
    profile: { ...BODY_PROFILES.neutralLean, ...profileOverrides },
  });
}

const mesh = (g: Golfer, name: string) => g.root.getObjectByName(name) as THREE.Mesh;

// Effective X/Z radius of a makeWaistGeometry frustum at its top/bottom ring.
function frustumRadii(m: THREE.Mesh, height = 0.16) {
  const pos = m.geometry.attributes.position as THREE.BufferAttribute;
  const half = height / 2;
  let topX = 0;
  let bottomX = 0;
  let topZ = 0;
  let bottomZ = 0;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const ax = Math.abs(pos.getX(i));
    const az = Math.abs(pos.getZ(i));
    if (Math.abs(y - half) < 1e-3) {
      topX = Math.max(topX, ax);
      topZ = Math.max(topZ, az);
    }
    if (Math.abs(y + half) < 1e-3) {
      bottomX = Math.max(bottomX, ax);
      bottomZ = Math.max(bottomZ, az);
    }
  }
  return { topX, bottomX, topZ, bottomZ };
}

describe('anatomical pelvis body', () => {
  it('pelvis-body-part mesh exists', () => {
    const g = makeGolfer();
    expect(mesh(g, 'pelvis-body-part')).toBeDefined();
    g.dispose();
  });

  it('pelvis body uses the SKIN material/color', () => {
    const g = makeGolfer();
    const p = mesh(g, 'pelvis-body-part');
    const mat = p.material as THREE.MeshStandardMaterial;
    expect(mat.color.getHex()).toBe(g.appearance.skinTone);
    g.dispose();
  });

  it('pelvis belongs to the anatomical hierarchy (hips joint), not shorts-root', () => {
    const g = makeGolfer();
    const p = mesh(g, 'pelvis-body-part');
    const hips = g.getJointGroup('hips')!;
    const shortsRoot = g.root.getObjectByName('shorts-root')!;
    expect(p.parent).toBe(hips);
    expect(shortsRoot.children.includes(p)).toBe(false);
    g.dispose();
  });

  it('pelvis top follows Waist Width/Depth; bottom follows Hip Width/Depth', () => {
    const g = makeGolfer({
      lowerTorsoWidth: 0.5,
      lowerTorsoDepth: 1.0,
      hipWidth: 1.0,
      hipDepth: 1.0,
    });
    const r = frustumRadii(mesh(g, 'pelvis-body-part'));
    // Top == waist bottom boundary (continuous seam).
    expect(r.topX).toBeCloseTo(0.19 * 0.5, 3);
    expect(r.topZ).toBeCloseTo(0.19 * 1.0, 3);
    // Bottom == hip boundary (0.24*hipW X, 0.20*hipD Z).
    expect(r.bottomX).toBeCloseTo(0.24 * 1.0, 3);
    expect(r.bottomZ).toBeCloseTo(0.2 * 1.0, 3);
    g.dispose();
  });

  it('hipWidth still affects hipL/hipR joint spacing', () => {
    const narrow = makeGolfer({ hipWidth: 0.5 });
    const wide = makeGolfer({ hipWidth: 1.5 });
    // hipWidth scales the hip joint X (children spread via the joint scale).
    expect(wide.getJointGroup('hipL')!.scale.x).toBeGreaterThan(
      narrow.getJointGroup('hipL')!.scale.x
    );
    narrow.dispose();
    wide.dispose();
  });

  it('waist width does not overwrite hipWidth; hipWidth does not overwrite waist width', () => {
    const g = makeGolfer({ lowerTorsoWidth: 0.5, hipWidth: 1.4 });
    expect(g.appearance.profile.lowerTorsoWidth).toBe(0.5);
    expect(g.appearance.profile.hipWidth).toBe(1.4);
    g.dispose();
  });

  it('narrow waist + wide hips flares outward (bottom > top)', () => {
    const g = makeGolfer({ lowerTorsoWidth: 0.5, hipWidth: 1.5 });
    const r = frustumRadii(mesh(g, 'pelvis-body-part'));
    expect(r.bottomX).toBeGreaterThan(r.topX);
    g.dispose();
  });

  it('wide waist + narrow hips tapers inward (top > bottom) and stays finite', () => {
    const g = makeGolfer({ lowerTorsoWidth: 1.5, hipWidth: 0.4 });
    const r = frustumRadii(mesh(g, 'pelvis-body-part'));
    expect(r.topX).toBeGreaterThan(r.bottomX);
    for (const v of [r.topX, r.bottomX, r.topZ, r.bottomZ]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
    g.dispose();
  });

  it('hipDepth is independent of waist depth (no front/back step driver mixing)', () => {
    const g = makeGolfer({ lowerTorsoDepth: 1.0, hipDepth: 1.6 });
    const r = frustumRadii(mesh(g, 'pelvis-body-part'));
    expect(r.topZ).toBeCloseTo(0.19 * 1.0, 3);
    expect(r.bottomZ).toBeCloseTo(0.2 * 1.6, 3);
    g.dispose();
  });

  it('hipDepth defaults to 1.0 for old profiles that omit it', () => {
    const legacy = { ...BODY_PROFILES.neutralLean } as Record<string, unknown>;
    delete legacy.hipDepth;
    const g = new Golfer({
      ...DEFAULT_GOLFER_APPEARANCE,
      profile: legacy as never,
    });
    // normalizeAppearance spreads base defaults under legacy.profile, so a
    // missing hipDepth resolves to the base 1.0.
    expect(g.appearance.profile.hipDepth).toBe(1.0);
    const r = frustumRadii(mesh(g, 'pelvis-body-part'));
    expect(r.bottomZ).toBeCloseTo(0.2 * 1.0, 3);
    g.dispose();
  });

  it('extreme waist/hip combos keep all transforms finite (no NaN/Infinity)', () => {
    for (const combo of [
      { lowerTorsoWidth: 0.2, hipWidth: 2.5, hipDepth: 2.5 },
      { lowerTorsoWidth: 2.5, hipWidth: 0.2, hipDepth: 0.2 },
      { lowerTorsoWidth: 0.5, hipWidth: 1.0, hipDepth: 1.0 },
    ]) {
      const g = makeGolfer(combo);
      g.root.traverse((o) => {
        expect(Number.isFinite(o.position.x)).toBe(true);
        expect(Number.isFinite(o.scale.x)).toBe(true);
        expect(Number.isFinite(o.scale.z)).toBe(true);
      });
      const r = frustumRadii(mesh(g, 'pelvis-body-part'));
      for (const v of [r.topX, r.bottomX, r.topZ, r.bottomZ]) {
        expect(Number.isFinite(v)).toBe(true);
      }
      g.dispose();
    }
  });

  it('shorts + belt geometry remain present and unchanged', () => {
    const g = makeGolfer();
    for (const n of ['shorts-root', 'shorts-upper-part', 'shorts-leg-left', 'belt-root']) {
      expect(g.root.getObjectByName(n)).toBeDefined();
    }
    g.dispose();
  });
});
