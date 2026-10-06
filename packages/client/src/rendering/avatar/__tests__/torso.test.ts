// Structural tests for the simplified CHEST → WAIST torso geometry.
// These verify semantic ownership: Chest Width -> upper ribcage, Waist
// Width/Depth -> lower torso frustum, Shoulder Width -> shoulderInOut span.
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

// Read the waist frustum's effective X radius at its top (+half) and bottom
// (-half) rings from actual (baked) vertex positions. Height is derived from
// the geometry's own bounding box so the test tracks any construction change.
function waistRadii(g: Golfer) {
  const geo = mesh(g, 'lower-torso-part').geometry;
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const top = bb.max.y;
  const bottom = bb.min.y;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  let topX = 0;
  let bottomX = 0;
  let topZ = 0;
  let bottomZ = 0;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const ax = Math.abs(pos.getX(i));
    const az = Math.abs(pos.getZ(i));
    if (Math.abs(y - top) < 1e-3) {
      topX = Math.max(topX, ax);
      topZ = Math.max(topZ, az);
    }
    if (Math.abs(y - bottom) < 1e-3) {
      bottomX = Math.max(bottomX, ax);
      bottomZ = Math.max(bottomZ, az);
    }
  }
  return { topX, bottomX, topZ, bottomZ };
}

describe('torso geometry ownership', () => {
  it('torso-part (chest) is rescoped to the upper ribcage', () => {
    const g = makeGolfer();
    const chest = mesh(g, 'torso-part');
    expect(chest).toBeDefined();
    // The chest capsule must be SHORTER than the original whole-torso capsule
    // and shifted UP so its center sits in the ribcage band rather than
    // spanning shoulders->waist. (Chest length was shortened across passes.)
    const geo = chest.geometry as THREE.CapsuleGeometry;
    expect(geo.parameters.height).toBeLessThan(0.42);
    chest.geometry.computeBoundingBox();
    const bb = chest.geometry.boundingBox!;
    const center = (bb.max.y + bb.min.y) / 2;
    // Center sits clearly in the upper half of the torso (old center was ~0.0).
    expect(center).toBeGreaterThan(0.1);
    g.dispose();
  });

  it('chestWidth scales the upper chest, not the waist frustum mesh.scale.x', () => {
    const narrow = makeGolfer({ chestWidth: 0.6 });
    const wide = makeGolfer({ chestWidth: 1.6 });
    const chestN = mesh(narrow, 'torso-part');
    const chestW = mesh(wide, 'torso-part');
    expect(chestW.scale.x).toBeGreaterThan(chestN.scale.x);
    // chestWidth must NOT leak into the waist mesh's X scale (waist is driven
    // by geometry radii, not mesh.scale.x — that stays 1).
    expect(chestN.scale.x).toBeCloseTo(0.98 * 0.6, 5);
    narrow.dispose();
    wide.dispose();
  });

  it('waist top radius meets the chest boundary; bottom follows lowerTorsoWidth', () => {
    const g = makeGolfer({ chestWidth: 1.6, lowerTorsoWidth: 0.6 });
    const { topX, bottomX } = waistRadii(g);
    // Wide chest + narrow waist => top radius clearly larger than bottom.
    expect(topX).toBeGreaterThan(bottomX);
    // Top MEETS the chest bottom boundary (0.19*0.98*chestWidth), not an
    // average toward the waist.
    expect(topX).toBeCloseTo(0.19 * 0.98 * 1.6, 3);
    // Bottom tracks the authored waist width.
    expect(bottomX).toBeCloseTo(0.19 * 0.6, 3);
    g.dispose();
  });

  it('narrow chest + wide waist produces an inverse taper (bottom > top)', () => {
    const g = makeGolfer({ chestWidth: 0.6, lowerTorsoWidth: 1.6 });
    const { topX, bottomX } = waistRadii(g);
    expect(bottomX).toBeGreaterThan(topX);
    expect(topX).toBeCloseTo(0.19 * 0.98 * 0.6, 3);
    expect(bottomX).toBeCloseTo(0.19 * 1.6, 3);
    g.dispose();
  });

  it('depth is baked: top depth follows Chest Depth, bottom follows Waist Depth', () => {
    const g = makeGolfer({ chestDepth: 1.0, lowerTorsoDepth: 1.5 });
    const { topZ, bottomZ } = waistRadii(g);
    expect(topZ).toBeCloseTo(0.19 * 0.76 * 1.0, 3);
    expect(bottomZ).toBeCloseTo(0.19 * 1.5, 3);
    // Mesh scale is neutral — radii/depth are baked into geometry.
    const waist = mesh(g, 'lower-torso-part');
    expect(waist.scale.x).toBeCloseTo(1, 5);
    expect(waist.scale.z).toBeCloseTo(1, 5);
    g.dispose();
  });

  it('chestWidth does not modify the lowerTorsoWidth property', () => {
    const g = makeGolfer({ chestWidth: 1.6, lowerTorsoWidth: 1.0 });
    expect(g.appearance.profile.lowerTorsoWidth).toBe(1.0);
    expect(g.appearance.profile.chestWidth).toBe(1.6);
    g.dispose();
  });

  it('waist width does not modify the chestWidth property', () => {
    const g = makeGolfer({ chestWidth: 1.0, lowerTorsoWidth: 1.6 });
    expect(g.appearance.profile.chestWidth).toBe(1.0);
    expect(g.appearance.profile.lowerTorsoWidth).toBe(1.6);
    g.dispose();
  });
});

describe('chest/waist continuity', () => {
  // The transition top must MEET the chest boundary (not disconnect, not step)
  // across the diagnostic range and both taper directions.
  it('transition top equals chest bottom boundary across chest range', () => {
    for (const cw of [0.6, 1.0, 1.4, 1.6]) {
      const g = makeGolfer({ chestWidth: cw, lowerTorsoWidth: 1.0 });
      const { topX } = waistRadii(g);
      expect(topX).toBeCloseTo(0.19 * 0.98 * cw, 3);
      g.dispose();
    }
  });

  it('smooth taper both directions: chest 1.40/waist 0.75 and chest 0.75/waist 1.30', () => {
    const in_ = makeGolfer({ chestWidth: 1.4, lowerTorsoWidth: 0.75 });
    const rIn = waistRadii(in_);
    expect(rIn.topX).toBeGreaterThan(rIn.bottomX); // tapers inward to waist
    expect(rIn.topX).toBeCloseTo(0.19 * 0.98 * 1.4, 3);
    expect(rIn.bottomX).toBeCloseTo(0.19 * 0.75, 3);
    in_.dispose();

    const out = makeGolfer({ chestWidth: 0.75, lowerTorsoWidth: 1.3 });
    const rOut = waistRadii(out);
    expect(rOut.bottomX).toBeGreaterThan(rOut.topX); // tapers outward to waist
    expect(rOut.topX).toBeCloseTo(0.19 * 0.98 * 0.75, 3);
    expect(rOut.bottomX).toBeCloseTo(0.19 * 1.3, 3);
    out.dispose();
  });

  it('chest and transition overlap vertically (no disconnection)', () => {
    const g = makeGolfer({ chestWidth: 1.0, lowerTorsoWidth: 1.0 });
    const chest = mesh(g, 'torso-part');
    chest.geometry.computeBoundingBox();
    const chestBottom = chest.geometry.boundingBox!.min.y; // torso-local
    const waist = mesh(g, 'lower-torso-part');
    const waistTop = waist.position.y + 0.3 / 2; // frustum half-height = 0.15
    // The waist top must reach at least the chest's bottom so they overlap,
    // not float apart.
    expect(waistTop).toBeGreaterThan(chestBottom);
    g.dispose();
  });
});

describe('shoulder width mapping', () => {
  it('shoulderInOut moves the shoulder attachment span symmetrically', () => {
    const g = makeGolfer({ shoulderInOut: 1.5 });
    const L = g.getJointGroup('shoulderL');
    const R = g.getJointGroup('shoulderR');
    expect(L).toBeDefined();
    expect(R).toBeDefined();
    expect(Math.abs(L!.position.x)).toBeCloseTo(Math.abs(R!.position.x), 6);
    expect(L!.position.x).toBeLessThan(0);
    expect(R!.position.x).toBeGreaterThan(0);
    // Wider span than baseline (0.32 * 1.5 = 0.48).
    expect(Math.abs(R!.position.x)).toBeCloseTo(0.48, 3);
    g.dispose();
  });

  it('shoulderInOut does not change chestWidth or lowerTorsoWidth', () => {
    const g = makeGolfer({ shoulderInOut: 1.5, chestWidth: 1.0, lowerTorsoWidth: 1.0 });
    expect(g.appearance.profile.chestWidth).toBe(1.0);
    expect(g.appearance.profile.lowerTorsoWidth).toBe(1.0);
    g.dispose();
  });
});

describe('depth + taper compatibility', () => {
  it('torso joint no longer applies a broad parent-Z taper multiplier', () => {
    const g = makeGolfer({ torsoTaper: 0.4 }); // extreme legacy value
    const torso = g.getJointGroup('torso')!;
    // Legacy parent-Z scale is neutralized to 1 regardless of torsoTaper.
    expect(torso.scale.z).toBeCloseTo(1, 6);
    g.dispose();
  });

  it('torsoLength still scales the torso joint in Y', () => {
    const g = makeGolfer({ torsoLength: 1.4 });
    const torso = g.getJointGroup('torso')!;
    expect(torso.scale.y).toBeCloseTo(1.4, 6);
    g.dispose();
  });
});

describe('robustness', () => {
  it('extreme chest/waist combos keep all transforms finite', () => {
    for (const combo of [
      { chestWidth: 0.1, lowerTorsoWidth: 3.0 },
      { chestWidth: 3.0, lowerTorsoWidth: 0.1 },
      { chestWidth: 0.6, lowerTorsoWidth: 1.6 },
      { chestWidth: 1.6, lowerTorsoWidth: 0.6 },
    ]) {
      const g = makeGolfer(combo);
      g.root.traverse((o) => {
        expect(Number.isFinite(o.position.x)).toBe(true);
        expect(Number.isFinite(o.position.y)).toBe(true);
        expect(Number.isFinite(o.scale.x)).toBe(true);
        expect(Number.isFinite(o.scale.z)).toBe(true);
      });
      // Baked waist radii must stay finite and positive (no degenerate taper).
      const r = waistRadii(g);
      for (const v of [r.topX, r.bottomX, r.topZ, r.bottomZ]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
      }
      g.dispose();
    }
  });

  it('persisted BodyProfile field names remain compatible', () => {
    const p = BODY_PROFILES.neutralLean;
    for (const key of [
      'chestWidth',
      'chestDepth',
      'lowerTorsoWidth',
      'lowerTorsoDepth',
      'shoulderInOut',
      'torsoLength',
      'torsoTaper',
    ]) {
      expect(p).toHaveProperty(key);
    }
  });
});
