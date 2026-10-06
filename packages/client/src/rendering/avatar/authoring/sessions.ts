// Authoring sessions. Small classes, single responsibilities:
//   DefaultCreationSession — drafts/saves/finalizes the Male Baseline.
//   PoseCreationSession    — drafts/revises/finalizes ONE pose, starting
//                            from a FINALIZED baseline it can never mutate.
// Neither session knows anything about Three.js, the Golfer rig, or the DOM.
import type { GolferPose } from '../types';
import type { BaselineRepository } from './BaselineRepository';
import {
  MAX_POSE_REVISIONS,
  cloneData,
  dataEquals,
  sanitizeDraftNumbers,
  type AuthoringSession,
  type FinalizedBaseline,
  type MaleBaselineDraft,
  type PoseRevision,
  type PoseWorkflowStatus,
  type SavedBaseline,
} from './types';

type Clock = () => string;

const isoNow: Clock = () => new Date().toISOString();

export type BaselineWorkflowStatus = 'unsaved' | 'saved' | 'final';

// DEFAULT CREATION: builds the canonical neutral Male Baseline.
// Understands draft/saved/final baseline state. Knows nothing about
// backhand/forehand/reach-back/release — those belong to pose/action
// systems later.
export class DefaultCreationSession implements AuthoringSession<MaleBaselineDraft, SavedBaseline> {
  readonly mode = 'default' as const;

  private readonly repo: BaselineRepository;
  private readonly now: Clock;
  private readonly defaults: MaleBaselineDraft;
  private draft: MaleBaselineDraft;
  private saved: SavedBaseline | null;
  private finalized: FinalizedBaseline | null;

  constructor(repo: BaselineRepository, defaults: MaleBaselineDraft, now: Clock = isoNow) {
    this.repo = repo;
    this.now = now;
    this.defaults = cloneData(defaults);
    this.saved = this.repo.loadDraft();
    this.finalized = this.repo.loadFinal();
    // Reload behavior: only an explicit SAVE survives reload. Unsaved edits
    // are discarded on reload (draft re-hydrates from last save/defaults).
    // Sanitize: a malformed persisted draft must never inject non-finite
    // numbers into the rig.
    const raw = this.saved?.draft ?? this.defaults;
    this.draft = cloneData(sanitizeDraftNumbers(raw, this.defaults) as MaleBaselineDraft);
  }

  getDraft(): MaleBaselineDraft {
    return cloneData(this.draft);
  }

  updateDraft(draft: MaleBaselineDraft): void {
    this.draft = cloneData(draft);
  }

  isDirty(): boolean {
    return !dataEquals(this.draft, this.saved?.draft ?? this.defaults);
  }

  get status(): BaselineWorkflowStatus {
    if (this.finalized && dataEquals(this.draft, this.finalized.draft)) return 'final';
    if (this.isDirty()) return 'unsaved';
    return 'saved';
  }

  get savedState(): SavedBaseline | null {
    return this.saved;
  }

  get finalizedState(): FinalizedBaseline | null {
    return this.finalized;
  }

  // SAVE = working checkpoint. Never implies final.
  save(): SavedBaseline {
    const saved: SavedBaseline = { draft: cloneData(this.draft), savedAt: this.now() };
    this.repo.saveDraft(saved);
    this.saved = saved;
    return saved;
  }

  // RESET DRAFT = return the editing session to neutral starting values.
  reset(): void {
    this.draft = cloneData(this.defaults);
  }

  // RELOAD SAVED = discard unsaved changes and reload the last SAVE.
  // Returns false when nothing has ever been saved.
  reloadSaved(): boolean {
    if (!this.saved) return false;
    this.draft = cloneData(this.saved.draft);
    return true;
  }

  // FINAL = approve the current draft as the canonical baseline. Distinct
  // from SAVE; does not destroy draft/saved data, so the baseline can be
  // revised later.
  finalize(): FinalizedBaseline {
    const finalized: FinalizedBaseline = {
      draft: cloneData(this.draft),
      finalizedAt: this.now(),
    };
    this.repo.saveFinal(finalized);
    this.finalized = finalized;
    return finalized;
  }
}

// POSE CREATION (architecture only — no disc-golf poses are authored yet).
// Starts from a FINALIZED baseline and produces semantic pose offsets.
// The baseline is passed as data and cloned on entry; the session has no
// BaselineRepository, so the pose save path can never overwrite baseline
// data.
export class PoseCreationSession implements AuthoringSession<GolferPose, PoseRevision> {
  readonly mode = 'pose' as const;

  private readonly now: Clock;
  private readonly baseline: FinalizedBaseline;
  private readonly initialPose: GolferPose;
  private draft: GolferPose;
  private revisions: PoseRevision[] = [];
  private finalized: PoseRevision | null = null;

  constructor(baseline: FinalizedBaseline, initialPose: GolferPose, now: Clock = isoNow) {
    this.now = now;
    this.baseline = cloneData(baseline);
    this.initialPose = cloneData(initialPose);
    this.draft = cloneData(initialPose);
  }

  getDraft(): GolferPose {
    return cloneData(this.draft);
  }

  updateDraft(pose: GolferPose): void {
    this.draft = cloneData(pose);
  }

  private get lastCheckpoint(): GolferPose {
    return this.revisions.at(-1)?.pose ?? this.initialPose;
  }

  isDirty(): boolean {
    return !dataEquals(this.draft, this.lastCheckpoint);
  }

  get status(): PoseWorkflowStatus {
    if (this.finalized && dataEquals(this.draft, this.finalized.pose)) return 'final';
    if (this.revisions.length > 0 && !this.isDirty()) return 'revision';
    return 'draft';
  }

  get revisionNumber(): number {
    return this.revisions.length;
  }

  get revisionHistory(): readonly PoseRevision[] {
    return this.revisions;
  }

  // The finalized baseline this pose is authored against (read-only copy).
  get baselineSnapshot(): FinalizedBaseline {
    return cloneData(this.baseline);
  }

  // SAVE POSE = checkpoint revision of THIS pose (1..MAX_POSE_REVISIONS).
  save(): PoseRevision {
    if (this.revisions.length >= MAX_POSE_REVISIONS) {
      throw new Error(`Pose revision limit reached (${MAX_POSE_REVISIONS})`);
    }
    const revision: PoseRevision = {
      revision: this.revisions.length + 1,
      createdAt: this.now(),
      pose: cloneData(this.draft),
    };
    this.revisions.push(revision);
    return revision;
  }

  // Reset the pose draft to the last saved revision (or the initial pose).
  reset(): void {
    this.draft = cloneData(this.lastCheckpoint);
  }

  // FINAL marks the current draft as the approved version of this pose.
  finalize(): PoseRevision {
    const final: PoseRevision = {
      revision: this.revisions.length + 1,
      createdAt: this.now(),
      pose: cloneData(this.draft),
    };
    this.finalized = final;
    return final;
  }
}
