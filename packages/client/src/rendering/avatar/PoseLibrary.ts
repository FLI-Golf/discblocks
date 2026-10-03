import type { GolferPose, PoseId } from './types';

// PoseLibrary with optional localStorage persistence. Pass a storageKey to
// persist poses across page reloads; omit for a pure in-memory library (tests).
export class PoseLibrary {
  private readonly poses = new Map<PoseId, GolferPose>();
  private readonly storageKey?: string;

  constructor(storageKey?: string) {
    this.storageKey = storageKey;
    if (storageKey) {
      this.load();
    }
  }

  private storage(): Storage | null {
    return typeof window !== 'undefined' ? window.localStorage : null;
  }

  private load(): void {
    const store = this.storage();
    if (!store || !this.storageKey) {
      return;
    }
    try {
      const raw = store.getItem(this.storageKey);
      if (!raw) {
        return;
      }
      const arr = JSON.parse(raw) as GolferPose[];
      arr.forEach((p) => this.poses.set(p.id, p));
    } catch {
      // corrupted storage -> start fresh
    }
  }

  private persist(): void {
    const store = this.storage();
    if (!store || !this.storageKey) {
      return;
    }
    store.setItem(this.storageKey, JSON.stringify(this.list()));
  }

  register(pose: GolferPose): void {
    this.poses.set(pose.id, pose);
    this.persist();
  }

  remove(id: PoseId): void {
    this.poses.delete(id);
    this.persist();
  }

  get(id: PoseId): GolferPose | undefined {
    return this.poses.get(id);
  }

  has(id: PoseId): boolean {
    return this.poses.has(id);
  }

  list(): GolferPose[] {
    return [...this.poses.values()];
  }
}
