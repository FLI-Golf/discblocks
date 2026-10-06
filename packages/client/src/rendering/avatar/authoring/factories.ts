// Authoring factories. FACTORIES CREATE AUTHORING SESSIONS — THEY DO NOT
// DIRECTLY CONTROL THREE.JS. Composition over inheritance: each factory is a
// small class that wires a repository (and later pose storage) into a
// session.
import type { GolferPose } from '../types';
import type { BaselineRepository } from './BaselineRepository';
import { DefaultCreationSession, PoseCreationSession } from './sessions';
import type { FinalizedBaseline, MaleBaselineDraft } from './types';

// Creates Default Creation sessions bound to baseline persistence.
export class DefaultAvatarFactory {
  private readonly repo: BaselineRepository;

  constructor(repo: BaselineRepository) {
    this.repo = repo;
  }

  createSession(defaults: MaleBaselineDraft): DefaultCreationSession {
    return new DefaultCreationSession(this.repo, defaults);
  }
}

// Creates Pose Creation sessions. A pose session always starts from a
// FINALIZED baseline and produces semantic offsets; it never duplicates or
// mutates the canonical baseline.
export class PoseFactory {
  createSession(
    finalizedBaseline: FinalizedBaseline,
    initialPose: GolferPose
  ): PoseCreationSession {
    return new PoseCreationSession(finalizedBaseline, initialPose);
  }
}
