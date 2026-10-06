// Authoring domain types for the Master avatar workspace.
//
// DOMAIN SEPARATION RULE: baseline data, pose data, and action data are
// separate domain objects and are never merged into one structure.
//   BASELINE — what the neutral golfer IS (Default Creation saves this)
//   POSE     — semantic anatomical offsets from a FINALIZED baseline
//   ACTION   — ordered sequence/timing of poses (later)
import type { CharacterAppearance } from '@/rendering/Golfer';
import type { GolferPose } from '../types';

// Explicit application state — never inferred from which accordion is open.
export type AuthoringMode = 'default' | 'pose';

// Semantic pose-control values in DEGREES (UI units), keyed by draft field.
export type PoseDraftValues = Record<string, number>;

// The editable canonical-neutral male golfer. Pure data — never Three.js
// scene objects.
export interface MaleBaselineDraft {
  readonly appearance: CharacterAppearance;
  readonly pose: PoseDraftValues;
}

// A working checkpoint of the baseline (SAVE). Not approval.
export interface SavedBaseline {
  readonly draft: MaleBaselineDraft;
  readonly savedAt: string;
}

// An approved canonical baseline (FINAL). Future poses are authored from a
// finalized baseline. Finalizing never deletes drafts or saved state, so
// baseline versioning remains possible later.
export interface FinalizedBaseline {
  readonly draft: MaleBaselineDraft;
  readonly finalizedAt: string;
}

// Generic authoring-session contract. Factories create sessions; sessions
// own draft/save/finalize state transitions; neither touches Three.js.
export interface AuthoringSession<TDraft, TSaved> {
  readonly mode: AuthoringMode;
  getDraft(): TDraft;
  isDirty(): boolean;
  save(): TSaved;
  reset(): void;
}

// One checkpoint of ONE pose. Revisions of a pose are history entries, not
// separate poses — never hard-code pose1..pose10 fields.
export interface PoseRevision {
  readonly revision: number;
  readonly createdAt: string;
  readonly pose: GolferPose;
}

export const MAX_POSE_REVISIONS = 10;

export type PoseWorkflowStatus = 'draft' | 'revision' | 'final';

export function cloneData<T>(value: T): T {
  return structuredClone(value);
}

// Strip non-finite numbers (NaN/Infinity) from a draft, replacing them with
// the matching default. A malformed persisted draft must never produce
// non-finite transforms that blank the viewport.
export function sanitizeDraftNumbers(value: unknown, fallback: unknown): unknown {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : typeof fallback === 'number' ? fallback : 0;
  }
  if (Array.isArray(value)) {
    const fb = Array.isArray(fallback) ? fallback : [];
    return value.map((v, i) => sanitizeDraftNumbers(v, fb[i]));
  }
  if (value && typeof value === 'object') {
    const fbObj = (fallback && typeof fallback === 'object' ? fallback : {}) as Record<
      string,
      unknown
    >;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>)) {
      out[k] = sanitizeDraftNumbers((value as Record<string, unknown>)[k], fbObj[k]);
    }
    return out;
  }
  return value ?? fallback;
}

// Deterministic dirty comparison: both sides are produced by the same
// capture/clone path, so key order is stable.
export function dataEquals(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
