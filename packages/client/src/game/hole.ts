import { GROUP, type Player } from './players';

export interface Lie {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  player: Player;
  strokes: number;
  lie: Lie | null;
  holed: boolean;
  /** Strokes taken when the disc dropped in, for the scorecard. */
  holedOn: number | null;
}

export type HolePhase = 'tee' | 'fairway' | 'complete';

/**
 * Turn order for one hole: everyone drives in card order, then the player
 * furthest from the basket always throws next until the group has holed out.
 */
export class Hole {
  readonly par: number;
  readonly states: PlayerState[];

  private pin: Lie;
  private teed = 0;
  private currentIndex = 0;

  constructor(pin: Lie, par: number = 3) {
    this.pin = pin;
    this.par = par;
    this.states = GROUP.map((player) => ({
      player,
      strokes: 0,
      lie: null,
      holed: false,
      holedOn: null,
    }));
  }

  get phase(): HolePhase {
    if (this.states.every((state) => state.holed)) {
      return 'complete';
    }
    return this.teed < this.states.length ? 'tee' : 'fairway';
  }

  get current(): PlayerState | null {
    return this.phase === 'complete' ? null : this.states[this.currentIndex];
  }

  get currentPlayerIndex() {
    return this.currentIndex;
  }

  distanceToPin(state: PlayerState): number {
    const from = state.lie;
    if (!from) {
      return Infinity;
    }
    return Math.hypot(from.x - this.pin.x, from.z - this.pin.z);
  }

  /** True once the whole group has driven, so the shot is a fairway shot or a putt. */
  isPutting(state: PlayerState): boolean {
    return !state.holed && state.lie !== null && this.distanceToPin(state) < 18;
  }

  recordThrow() {
    const state = this.current;
    if (state) {
      state.strokes += 1;
    }
  }

  /** Called once the thrown disc comes to rest. */
  recordResult(lie: Lie, holed: boolean) {
    const state = this.current;
    if (!state) {
      return;
    }

    state.lie = lie;

    if (holed) {
      state.holed = true;
      state.holedOn = state.strokes;
    }

    if (this.phase === 'tee') {
      this.teed += 1;
    }

    this.advance();
  }

  private advance() {
    if (this.phase === 'complete') {
      return;
    }

    if (this.phase === 'tee') {
      this.currentIndex = this.teed;
      return;
    }

    // Away player throws: furthest from the pin, among those still out.
    let furthest = -1;
    let bestDistance = -Infinity;

    this.states.forEach((state, i) => {
      if (state.holed) {
        return;
      }
      const distance = this.distanceToPin(state);
      if (distance > bestDistance) {
        bestDistance = distance;
        furthest = i;
      }
    });

    if (furthest >= 0) {
      this.currentIndex = furthest;
    }
  }
}
