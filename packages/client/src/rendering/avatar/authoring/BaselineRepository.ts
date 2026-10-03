// Persistence for avatar-authoring domain data, isolated behind an
// interface. UI components never call localStorage directly.
//
// No backend is introduced for this milestone — localStorage is the
// development persistence mechanism, hidden behind BaselineRepository.
import type { FinalizedBaseline, SavedBaseline } from './types';

export interface BaselineRepository {
  loadDraft(): SavedBaseline | null;
  saveDraft(saved: SavedBaseline): void;
  loadFinal(): FinalizedBaseline | null;
  saveFinal(finalized: FinalizedBaseline): void;
}

export class LocalStorageBaselineRepository implements BaselineRepository {
  private readonly storage: Storage;
  private readonly keyPrefix: string;

  constructor(storage: Storage, keyPrefix = 'master-baseline') {
    this.storage = storage;
    this.keyPrefix = keyPrefix;
  }

  loadDraft(): SavedBaseline | null {
    return this.read(`${this.keyPrefix}:draft`);
  }

  saveDraft(saved: SavedBaseline): void {
    this.storage.setItem(`${this.keyPrefix}:draft`, JSON.stringify(saved));
  }

  loadFinal(): FinalizedBaseline | null {
    return this.read(`${this.keyPrefix}:final`);
  }

  saveFinal(finalized: FinalizedBaseline): void {
    this.storage.setItem(`${this.keyPrefix}:final`, JSON.stringify(finalized));
  }

  private read<T>(key: string): T | null {
    const raw = this.storage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}

// Test / non-browser repository.
export class InMemoryBaselineRepository implements BaselineRepository {
  private draft: SavedBaseline | null = null;
  private finalized: FinalizedBaseline | null = null;

  loadDraft(): SavedBaseline | null {
    return this.draft;
  }

  saveDraft(saved: SavedBaseline): void {
    this.draft = saved;
  }

  loadFinal(): FinalizedBaseline | null {
    return this.finalized;
  }

  saveFinal(f: FinalizedBaseline): void {
    this.finalized = f;
  }
}
