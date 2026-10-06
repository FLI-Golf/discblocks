// Domain tests for the authoring state machine. No WebGL/Three.js needed —
// sessions, factories, and repositories operate on pure data.
import { describe, it, expect } from 'vitest';
import {
  DefaultAvatarFactory,
  InMemoryBaselineRepository,
  MAX_POSE_REVISIONS,
  PoseFactory,
  type MaleBaselineDraft,
} from '@/rendering/avatar/authoring';
import type { GolferPose } from '@/rendering/avatar';

function baselineDraft(poseValue = 0): MaleBaselineDraft {
  return {
    appearance: { profile: { armLength: 1 }, shirtColor: 0xffffff } as never,
    pose: { lAbduction: poseValue, headYaw: 0 },
  };
}

describe('DefaultCreationSession', () => {
  it('starts in default mode with a clean draft', () => {
    const repo = new InMemoryBaselineRepository();
    const session = new DefaultAvatarFactory(repo).createSession(baselineDraft());
    expect(session.mode).toBe('default');
    expect(session.isDirty()).toBe(false);
    expect(session.status).toBe('saved');
  });

  it('dirty state changes after draft modification and clears on save', () => {
    const repo = new InMemoryBaselineRepository();
    const session = new DefaultAvatarFactory(repo).createSession(baselineDraft());
    session.updateDraft(baselineDraft(45));
    expect(session.isDirty()).toBe(true);
    expect(session.status).toBe('unsaved');
    session.save();
    expect(session.isDirty()).toBe(false);
    expect(session.status).toBe('saved');
  });

  it('saved baseline reloads in a new session (explicit SAVE survives reload)', () => {
    const repo = new InMemoryBaselineRepository();
    const factory = new DefaultAvatarFactory(repo);
    const first = factory.createSession(baselineDraft());
    first.updateDraft(baselineDraft(30));
    first.save();

    const reloaded = factory.createSession(baselineDraft());
    expect(reloaded.getDraft().pose['lAbduction']).toBe(30);
    expect(reloaded.isDirty()).toBe(false);
  });

  it('unsaved edits do NOT survive reload', () => {
    const repo = new InMemoryBaselineRepository();
    const factory = new DefaultAvatarFactory(repo);
    const first = factory.createSession(baselineDraft());
    first.updateDraft(baselineDraft(30));
    // no save
    const reloaded = factory.createSession(baselineDraft());
    expect(reloaded.getDraft().pose['lAbduction']).toBe(0);
  });

  it('reloadSaved discards unsaved changes; reset returns to defaults', () => {
    const repo = new InMemoryBaselineRepository();
    const session = new DefaultAvatarFactory(repo).createSession(baselineDraft());
    session.updateDraft(baselineDraft(10));
    session.save();
    session.updateDraft(baselineDraft(99));
    expect(session.reloadSaved()).toBe(true);
    expect(session.getDraft().pose['lAbduction']).toBe(10);
    session.reset();
    expect(session.getDraft().pose['lAbduction']).toBe(0);
  });

  it('reloadSaved returns false when nothing was ever saved', () => {
    const repo = new InMemoryBaselineRepository();
    const session = new DefaultAvatarFactory(repo).createSession(baselineDraft());
    expect(session.reloadSaved()).toBe(false);
  });

  it('FINAL is distinct from SAVE and marks the baseline final', () => {
    const repo = new InMemoryBaselineRepository();
    const session = new DefaultAvatarFactory(repo).createSession(baselineDraft());
    expect(session.status).not.toBe('final');
    session.updateDraft(baselineDraft(15));
    const finalized = session.finalize();
    expect(finalized.draft.pose['lAbduction']).toBe(15);
    expect(session.status).toBe('final');
    expect(repo.loadFinal()?.finalizedAt).toBe(finalized.finalizedAt);
    // Save data is NOT destroyed by finalizing.
    session.updateDraft(baselineDraft(20));
    session.save();
    expect(repo.loadDraft()?.draft.pose['lAbduction']).toBe(20);
    expect(repo.loadFinal()?.draft.pose['lAbduction']).toBe(15);
  });
});

describe('PoseCreationSession (architecture)', () => {
  const initialPose: GolferPose = { id: 'p/test', name: 'Test Pose' };

  function finalizedBaseline() {
    const repo = new InMemoryBaselineRepository();
    const session = new DefaultAvatarFactory(repo).createSession(baselineDraft());
    return session.finalize();
  }

  it('starts in pose mode from a finalized baseline', () => {
    const session = new PoseFactory().createSession(finalizedBaseline(), initialPose);
    expect(session.mode).toBe('pose');
    expect(session.status).toBe('draft');
    expect(session.revisionNumber).toBe(0);
  });

  it('revision numbering is independent from pose identity', () => {
    const session = new PoseFactory().createSession(finalizedBaseline(), initialPose);
    const r1 = session.save();
    session.updateDraft({ ...initialPose, head: { yaw: 0.3 } });
    const r2 = session.save();
    expect(r1.revision).toBe(1);
    expect(r2.revision).toBe(2);
    expect(r1.pose.id).toBe('p/test');
    expect(r2.pose.id).toBe('p/test');
    expect(session.revisionHistory).toHaveLength(2);
  });

  it('enforces the maximum revision count deterministically', () => {
    const session = new PoseFactory().createSession(finalizedBaseline(), initialPose);
    for (let n = 0; n < MAX_POSE_REVISIONS; n++) {
      expect(session.save().revision).toBe(n + 1);
    }
    expect(() => session.save()).toThrow(/revision limit/);
    expect(session.revisionNumber).toBe(MAX_POSE_REVISIONS);
  });

  it('pose save path cannot overwrite the baseline', () => {
    const baseline = finalizedBaseline();
    const session = new PoseFactory().createSession(baseline, initialPose);
    session.updateDraft({ ...initialPose, torso: { rotation: 1 } });
    session.save();
    session.finalize();
    // Baseline data is untouched by pose authoring.
    expect(baseline.draft.pose['lAbduction']).toBe(0);
    expect(session.baselineSnapshot).toEqual(baseline);
  });

  it('reset returns to the last saved revision', () => {
    const session = new PoseFactory().createSession(finalizedBaseline(), initialPose);
    session.save();
    session.updateDraft({ ...initialPose, head: { yaw: 0.9 } });
    expect(session.isDirty()).toBe(true);
    session.reset();
    expect(session.isDirty()).toBe(false);
    expect(session.getDraft().head).toBeUndefined();
  });
});
