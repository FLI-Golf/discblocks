import { formatScore, type Player } from '@/game/players';
import { FEET_PER_UNIT } from '@/game/course';
import type { Hole, PlayerState } from '@/game/hole';
import { AppearanceModal } from '@/ui/AppearanceModal';
import {
  DEFAULT_GOLFER_APPEARANCE,
  type AccessorySlot,
  type GolferAppearance,
} from '@/rendering/Golfer';

function statusLabel(state: PlayerState, hole: Hole): string {
  if (state.holed) {
    return state.holedOn === 1 ? 'ACE' : 'IN';
  }
  if (!state.lie) {
    return 'Tee';
  }
  return `${Math.round(hole.distanceToPin(state) * FEET_PER_UNIT)} ft`;
}

export class GroupPanel {
  private root: HTMLElement;
  private hole: Hole;
  private readonly onPlayerAppearanceChange?: (
    playerId: string,
    appearance: Partial<GolferAppearance>,
    accessories: Partial<Record<AccessorySlot, boolean>>
  ) => void;

  constructor(
    container: HTMLElement,
    hole: Hole,
    onPlayerAppearanceChange?: (
      playerId: string,
      appearance: Partial<GolferAppearance>,
      accessories: Partial<Record<AccessorySlot, boolean>>
    ) => void
  ) {
    this.hole = hole;
    this.onPlayerAppearanceChange = onPlayerAppearanceChange;
    this.root = document.createElement('div');
    this.root.id = 'group';
    container.appendChild(this.root);
    this.render();
  }

  setHole(hole: Hole) {
    this.hole = hole;
    this.render();
  }

  render() {
    const hole = this.hole;
    this.root.innerHTML = '';

    const heading = document.createElement('h2');
    heading.textContent =
      hole.phase === 'complete'
        ? 'Hole 1 — Complete'
        : `Hole 1 · Par ${hole.par} · ${hole.phase === 'tee' ? 'Tee shots' : 'Away throws first'}`;
    this.root.appendChild(heading);

    const list = document.createElement('ol');
    list.className = 'group-list';

    hole.states.forEach((state: PlayerState, i: number) => {
      const player = state.player;
      const item = document.createElement('li');
      item.className = 'group-player';
      item.classList.toggle(
        'is-active',
        i === hole.currentPlayerIndex && hole.phase !== 'complete'
      );
      item.classList.toggle('is-holed', state.holed);

      const order = document.createElement('span');
      order.className = 'group-order';
      order.textContent = String(i + 1);

      const main = document.createElement('button');
      main.type = 'button';
      main.className = 'group-player-main';
      main.setAttribute('aria-label', `Open look editor for ${player.name}`);
      main.addEventListener('click', () => this.openEditor(player, 'look'));

      const avatar = document.createElement('img');
      avatar.className = 'group-avatar';
      avatar.src = player.avatar;
      avatar.alt = '';
      avatar.loading = 'lazy';
      avatar.addEventListener('error', () => {
        avatar.style.visibility = 'hidden';
      });

      const details = document.createElement('span');
      details.className = 'group-details';

      const name = document.createElement('strong');
      name.textContent = player.name;

      const meta = document.createElement('span');
      meta.className = 'group-team';
      const teamLogo = document.createElement('img');
      teamLogo.src = player.teamLogo;
      teamLogo.alt = '';
      meta.append(
        teamLogo,
        document.createTextNode(`${state.strokes} throw${state.strokes === 1 ? '' : 's'}`)
      );

      details.append(name, meta);
      main.append(avatar, details);

      const right = document.createElement('span');
      right.className = 'group-right';

      const score = document.createElement('span');
      score.className = 'group-score';
      score.dataset.tone = player.score < 0 ? 'under' : player.score > 0 ? 'over' : 'even';
      score.textContent = formatScore(player.score);

      const status = document.createElement('span');
      status.className = 'group-status';
      status.dataset.state = state.holed ? 'in' : 'out';
      status.textContent = statusLabel(state, hole);

      const actions = document.createElement('div');
      actions.className = 'group-actions';

      const lookButton = document.createElement('button');
      lookButton.type = 'button';
      lookButton.className = 'group-look-button';
      lookButton.textContent = 'Change Look';
      lookButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.openEditor(player, 'look');
      });

      actions.append(lookButton);
      right.append(score, status, actions);
      item.append(order, main, right);
      list.appendChild(item);
    });

    this.root.appendChild(list);
  }

  private openEditor(player: Player, mode: 'face' | 'look') {
    const appearance = { ...DEFAULT_GOLFER_APPEARANCE, ...(player.look.appearance ?? {}) };
    const modal = new AppearanceModal(document.body, {
      playerName: player.name,
      mode,
      initialAppearance: appearance,
      initialAccessories: { cap: true, bag: true, glasses: false, disc: true },
      onApply: (nextAppearance, accessories) => {
        this.onPlayerAppearanceChange?.(player.id, nextAppearance, accessories);
      },
      onCancel: () => undefined,
      onReset: (nextAppearance) => {
        this.onPlayerAppearanceChange?.(player.id, nextAppearance, {
          cap: true,
          bag: true,
          glasses: false,
          disc: true,
        });
      },
    });
    void modal;
  }
}
