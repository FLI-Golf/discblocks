import { type AccessorySlot, type GolferAppearance } from '@/rendering/Golfer';

export type PlayerAppearanceSettings = {
  version: number;
  appearance: Partial<GolferAppearance>;
  accessories: Partial<Record<AccessorySlot, boolean>>;
  savedAt: number;
};

export interface PlayerAppearanceRepository {
  load(playerId: string): PlayerAppearanceSettings | null;
  save(playerId: string, settings: PlayerAppearanceSettings): void;
}

const STORAGE_KEY = 'discblocks.player-appearance.v1';

function parseLocalStore(storage: Pick<Storage, 'getItem' | 'setItem'> | null) {
  const raw = storage?.getItem(STORAGE_KEY);
  if (!raw) {
    return { version: 1, players: {} as Record<string, PlayerAppearanceSettings> };
  }

  try {
    const parsed = JSON.parse(raw) as {
      version?: number;
      players?: Record<string, PlayerAppearanceSettings>;
    };
    return {
      version: parsed.version ?? 1,
      players: parsed.players ?? {},
    };
  } catch {
    return { version: 1, players: {} as Record<string, PlayerAppearanceSettings> };
  }
}

export class LocalStorageAppearanceRepository implements PlayerAppearanceRepository {
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null;

  constructor(storage?: Pick<Storage, 'getItem' | 'setItem'> | null) {
    this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  }

  load(playerId: string): PlayerAppearanceSettings | null {
    const store = parseLocalStore(this.storage);
    return store.players[playerId] ?? null;
  }

  save(playerId: string, settings: PlayerAppearanceSettings): void {
    if (!this.storage) {
      return;
    }

    const store = parseLocalStore(this.storage);
    store.players[playerId] = {
      ...settings,
      version: 1,
      savedAt: Date.now(),
    };

    this.storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, players: store.players }));
  }
}
