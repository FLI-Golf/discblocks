import { LEAGUE_RESULTS, type TeamResult } from '@/game/teams';

function formatScore(score: number): string {
  if (score === 0) {
    return 'E';
  }
  return score > 0 ? `+${score}` : String(score);
}

export class Ticker {
  private root: HTMLElement;
  private app: HTMLElement;

  constructor(app: HTMLElement) {
    this.app = app;

    this.root = document.createElement('div');
    this.root.id = 'ticker';

    const label = document.createElement('div');
    label.className = 'ticker-label';
    label.innerHTML = '<strong>FLI</strong> LIVE';
    this.root.appendChild(label);

    const window_ = document.createElement('div');
    window_.className = 'ticker-window';

    const track = document.createElement('div');
    track.className = 'ticker-track';
    // Two passes back to back, so the -50% scroll loops without a seam.
    track.append(this.buildRun(), this.buildRun());
    window_.appendChild(track);
    this.root.appendChild(window_);

    const close = document.createElement('button');
    close.className = 'ticker-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Hide results ticker');
    close.textContent = '\u00d7';
    close.addEventListener('click', () => this.hide());
    this.root.appendChild(close);

    app.appendChild(this.root);
    app.classList.add('has-ticker');
  }

  private buildRun(): HTMLElement {
    const run = document.createElement('div');
    run.className = 'ticker-run';

    for (const team of LEAGUE_RESULTS) {
      run.appendChild(this.buildEntry(team));
    }

    return run;
  }

  private buildEntry(team: TeamResult): HTMLElement {
    const entry = document.createElement('span');
    entry.className = 'ticker-entry';

    const logo = document.createElement('img');
    logo.src = team.logo;
    logo.alt = '';
    logo.loading = 'lazy';

    const name = document.createElement('span');
    name.className = 'ticker-name';
    name.textContent = team.name;

    const score = document.createElement('strong');
    score.dataset.tone = team.score < 0 ? 'under' : team.score > 0 ? 'over' : 'even';
    score.textContent = formatScore(team.score);

    entry.append(logo, name, score);
    return entry;
  }

  hide() {
    this.root.classList.add('is-hidden');
    this.app.classList.remove('has-ticker');
  }

  show() {
    this.root.classList.remove('is-hidden');
    this.app.classList.add('has-ticker');
  }
}
