import { formatScore } from '@/game/players';
import type { Hole, PlayerState } from '@/game/hole';

function statusLabel(state: PlayerState, hole: Hole): string {
  if (state.holed) {
    return state.holedOn === 1 ? 'ACE' : 'IN';
  }
  if (!state.lie) {
    return 'Tee';
  }
  return `${Math.round(hole.distanceToPin(state) * 1.4)} ft`;
}

export class GroupPanel {
  private root: HTMLElement;
  private hole: Hole;

  constructor(container: HTMLElement, hole: Hole) {
    this.hole = hole;
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

      const avatar = document.createElement('img');
      avatar.className = 'group-avatar';
      avatar.src = player.avatar;
      avatar.alt = '';
      avatar.loading = 'lazy';
      // The avatars are hosted remotely; hide broken images rather than show the icon.
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

      right.append(score, status);
      item.append(order, avatar, details, right);
      list.appendChild(item);
    });

    this.root.appendChild(list);
  }
}
