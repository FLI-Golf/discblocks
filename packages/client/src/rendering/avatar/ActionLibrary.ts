import type { ActionId, GolferAction } from './types';

export class ActionLibrary {
  private readonly actions = new Map<ActionId, GolferAction>();

  register(action: GolferAction): void {
    this.actions.set(action.id, action);
  }

  get(id: ActionId): GolferAction | undefined {
    return this.actions.get(id);
  }

  has(id: ActionId): boolean {
    return this.actions.has(id);
  }

  list(): GolferAction[] {
    return [...this.actions.values()];
  }
}
