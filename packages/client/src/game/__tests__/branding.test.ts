// Branding domain tests: resolver behavior, uniform slot mapping, and
// independence from pose/rig.
import { describe, it, expect } from 'vitest';
import { DEFAULT_BRANDING, resolveBranding, type Team } from '@/game/branding';
import { Golfer, DEFAULT_GOLFER_APPEARANCE } from '@/rendering/Golfer';
import { GolferPoseTarget } from '@/rendering/avatar';

describe('resolveBranding', () => {
  it('returns default/fallback branding when no team', () => {
    const b = resolveBranding(null);
    expect(b).toEqual(DEFAULT_BRANDING);
  });

  it('team overrides only the slots it supplies', () => {
    const team: Team = { name: 'A', primaryColor: 0xff0000, primaryLogo: '/a.png' };
    const b = resolveBranding(team);
    expect(b.primaryColor).toBe(0xff0000);
    expect(b.secondaryColor).toBe(DEFAULT_BRANDING.secondaryColor); // fallback
    expect(b.accentColor).toBe(DEFAULT_BRANDING.accentColor); // fallback
    expect(b.primaryLogo).toBe('/a.png');
    expect(b.secondaryLogo).toBeUndefined();
  });

  it('default branding has no logos (no broken texture)', () => {
    expect(DEFAULT_BRANDING.primaryLogo).toBeUndefined();
    expect(DEFAULT_BRANDING.secondaryLogo).toBeUndefined();
  });
});

describe('uniform branding on the Golfer', () => {
  it('applyBranding maps primary/secondary/accent to uniform color fields', () => {
    const g = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    g.applyBranding({ primaryColor: 0x111111, secondaryColor: 0x222222, accentColor: 0x333333 });
    expect(g.appearance.shirtColor).toBe(0x111111);
    expect(g.appearance.shortsColor).toBe(0x222222);
    expect(g.appearance.accentColor).toBe(0x333333);
    g.dispose();
  });

  it('branding does NOT touch skin/hair (golfer-specific appearance)', () => {
    const g = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    const skin = g.appearance.skinTone;
    const hair = g.appearance.hairColor;
    g.applyBranding({ primaryColor: 0x000000, secondaryColor: 0x000000, accentColor: 0x000000 });
    expect(g.appearance.skinTone).toBe(skin);
    expect(g.appearance.hairColor).toBe(hair);
    g.dispose();
  });

  it('exposes chestPrimaryLogo / chestSecondaryLogo attachment slots', () => {
    const g = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    expect(g.getAttachPoint('chestPrimaryLogo')).toBeDefined();
    expect(g.getAttachPoint('chestSecondaryLogo')).toBeDefined();
    g.dispose();
  });

  it('changing branding does not alter body proportions or golfer-specific appearance', () => {
    const g = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    const armLength = g.appearance.profile.armLength;
    const skin = g.appearance.skinTone;
    g.applyBranding({ primaryColor: 0xabcdef, secondaryColor: 0x111111, accentColor: 0x222222 });
    // Branding rebuilds the rig, but proportions + golfer identity survive.
    expect(g.appearance.profile.armLength).toBe(armLength);
    expect(g.appearance.skinTone).toBe(skin);
    // Branding colors actually changed.
    expect(g.appearance.shirtColor).toBe(0xabcdef);
    g.dispose();
  });

  it('applying a pose does not alter branding colors', () => {
    const g = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
    g.applyBranding({ primaryColor: 0x111111, secondaryColor: 0x222222, accentColor: 0x333333 });
    const target = new GolferPoseTarget(g);
    target.applyPose({ id: 't', name: 't', rightShoulder: { abduction: 0.7 } });
    expect(g.appearance.shirtColor).toBe(0x111111);
    expect(g.appearance.shortsColor).toBe(0x222222);
    expect(g.appearance.accentColor).toBe(0x333333);
    g.dispose();
  });
});
