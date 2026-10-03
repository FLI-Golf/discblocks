import type { GolferPose, PoseId } from './types';

export class PoseLibrary {
  private readonly poses = new Map<PoseId, GolferPose>();

  register(pose: GolferPose): void {
    this.poses.set(pose.id, pose);
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
