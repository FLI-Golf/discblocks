// Focused tests for the completed Default Male Golfer: hand architecture,
// held-disc system, and baseline parameter persistence.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Golfer, DEFAULT_GOLFER_APPEARANCE, BODY_PROFILES } from '@/rendering/Golfer';
import { GolferPoseTarget, type GolferPose } from '@/rendering/avatar';
import {
  DefaultAvatarFactory,
  InMemoryBaselineRepository,
  type MaleBaselineDraft,
} from '@/rendering/avatar/authoring';

function makeGolfer() {
  return new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
}

describe('hands', () => {
  it('has left + right hand groups with palm/fingers/thumb', () => {
    const g = makeGolfer();
    for (const side of ['left', 'right']) {
      expect(g.root.getObjectByName(`hand-${side}`)).toBeDefined();
      expect(g.root.getObjectByName(`palm-${side}`)).toBeDefined();
      expect(g.root.getObjectByName(`fingers-${side}`)).toBeDefined();
      expect(g.root.getObjectByName(`thumb-${side}`)).toBeDefined();
    }
    g.dispose();
  });

  it('thumb/fingers follow the hand hierarchy', () => {
    const g = makeGolfer();
    const hand = g.root.getObjectByName('hand-right')!;
    const thumb = g.root.getObjectByName('thumb-right')!;
    const fingers = g.root.getObjectByName('fingers-right')!;
    expect(thumb.parent).toBe(hand);
    expect(fingers.parent).toBe(hand);
    g.dispose();
  });

  it('thumb mirrors left vs right (opposite X offset)', () => {
    const g = makeGolfer();
    const tl = g.root.getObjectByName('thumb-left')!;
    const tr = g.root.getObjectByName('thumb-right')!;
    expect(Math.sign(tl.position.x)).not.toBe(Math.sign(tr.position.x));
    g.dispose();
  });
});

describe('disc grip + held disc', () => {
  it('exposes leftDiscGrip and rightDiscGrip nodes', () => {
    const g = makeGolfer();
    expect(g.getDiscGrip('right')).toBeDefined();
    expect(g.getDiscGrip('left')).toBeDefined();
    g.dispose();
  });

  it('has exactly one held disc', () => {
    const g = makeGolfer();
    let count = 0;
    g.root.traverse((o) => {
      if (o.name === 'held-disc') count++;
    });
    expect(count).toBe(1);
    g.dispose();
  });

  it('held disc defaults to the left grip and transfers to the right', () => {
    const g = makeGolfer();
    const disc = g.root.getObjectByName('held-disc')!;
    expect(disc.parent?.name).toBe('leftDiscGrip');
    g.setDiscHand('right');
    expect(disc.parent?.name).toBe('rightDiscGrip');
    g.dispose();
  });

  it('held disc follows the hand when the shoulder abducts', () => {
    const g = makeGolfer();
    g.setDiscVisible(true);
    g.applyPoseBaseline();
    g.root.updateMatrixWorld(true);
    const disc = g.root.getObjectByName('held-disc')!;
    const before = disc.getWorldPosition(new THREE.Vector3()).clone();
    const target = new GolferPoseTarget(g);
    const pose: GolferPose = { id: 't', name: 't', leftShoulder: { abduction: 1.0 } };
    target.applyPose(pose);
    g.root.updateMatrixWorld(true);
    const after = disc.getWorldPosition(new THREE.Vector3());
    expect(after.distanceTo(before)).toBeGreaterThan(0.05);
    g.dispose();
  });

  it('disc visibility toggles without touching gameplay', () => {
    const g = makeGolfer();
    const disc = g.root.getObjectByName('held-disc')!;
    expect(disc.visible).toBe(false);
    g.setDiscVisible(true);
    expect(disc.visible).toBe(true);
    g.dispose();
  });
});

describe('baseline parameter persistence', () => {
  const draft = (): MaleBaselineDraft => ({
    appearance: {
      profile: {
        ...BODY_PROFILES.athleticMale,
        neckWidth: 1.4,
        shortsLength: 1.3,
        footLength: 1.2,
      },
    } as never,
    pose: {},
  });

  it('neck/shorts/foot baseline values save + reload', () => {
    const repo = new InMemoryBaselineRepository();
    const factory = new DefaultAvatarFactory(repo);
    const s1 = factory.createSession(draft());
    s1.updateDraft(draft());
    s1.save();
    const s2 = factory.createSession(draft());
    const p = s2.getDraft().appearance.profile as unknown as Record<string, number>;
    expect(p.neckWidth).toBe(1.4);
    expect(p.shortsLength).toBe(1.3);
    expect(p.footLength).toBe(1.2);
  });

  it('disc color persists through the appearance draft', () => {
    const repo = new InMemoryBaselineRepository();
    const factory = new DefaultAvatarFactory(repo);
    const d = draft();
    (d.appearance as unknown as Record<string, unknown>).discColor = 0x00ff00;
    const s1 = factory.createSession(d);
    s1.save();
    const s2 = factory.createSession(d);
    expect((s2.getDraft().appearance as unknown as Record<string, unknown>).discColor).toBe(
      0x00ff00
    );
  });
});
