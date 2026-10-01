import {
  DISCS,
  RELEASE_ANGLES,
  THROW_STYLES,
  type Disc,
  type ReleaseAngle,
  type ThrowSelection,
  type ThrowStyle,
} from '@/game/discs';

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export class Bag {
  private disc: Disc = DISCS[2];
  private style: ThrowStyle = THROW_STYLES[0];
  private angle: ReleaseAngle = RELEASE_ANGLES[1];
  private power = 1;

  private root: HTMLElement;
  private onChange?: (selection: ThrowSelection) => void;

  constructor(container: HTMLElement, onChange?: (selection: ThrowSelection) => void) {
    this.onChange = onChange;
    this.root = document.createElement('div');
    this.root.id = 'bag';
    container.appendChild(this.root);
    this.render();
    this.onChange?.(this.selection);
  }

  get selection(): ThrowSelection {
    return { disc: this.disc, style: this.style, angle: this.angle, power: this.power };
  }

  private render() {
    this.root.innerHTML = '';

    this.root.appendChild(this.discSection());
    this.root.appendChild(
      this.chipSection('Throw', THROW_STYLES, this.style.id, (next) => {
        this.style = next;
      })
    );
    this.root.appendChild(
      this.chipSection('Release', RELEASE_ANGLES, this.angle.id, (next) => {
        this.angle = next;
      })
    );
    this.root.appendChild(this.powerSection());

    const hint = document.createElement('p');
    hint.className = 'bag-hint';
    hint.textContent =
      'Hyzer: flies straight, then curves left late. Anhyzer: flies straight, then curves right late.';
    this.root.appendChild(hint);
  }

  private section(title: string): HTMLElement {
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    heading.textContent = title;
    section.appendChild(heading);
    return section;
  }

  private discSection(): HTMLElement {
    const section = this.section('Bag');
    const list = document.createElement('div');
    list.className = 'bag-discs';

    for (const disc of DISCS) {
      const button = document.createElement('button');
      button.className = 'bag-disc';
      button.classList.toggle('is-active', disc.id === this.disc.id);
      button.title = `${disc.category} — speed ${disc.speed}, glide ${disc.glide}, turn ${disc.turn}, fade ${disc.fade}`;

      const swatch = document.createElement('span');
      swatch.className = 'bag-disc-swatch';
      swatch.style.background = hex(disc.color);

      const label = document.createElement('span');
      label.className = 'bag-disc-label';
      label.innerHTML = `<strong>${disc.name}</strong><em>${disc.speed} / ${disc.glide} / ${disc.turn} / ${disc.fade}</em>`;

      button.append(swatch, label);
      button.addEventListener('click', () => {
        this.disc = disc;
        this.render();
        this.onChange?.(this.selection);
      });

      list.appendChild(button);
    }

    section.appendChild(list);
    return section;
  }

  private chipSection<T extends { id: string; name: string; hint: string }>(
    title: string,
    options: T[],
    activeId: string,
    onPick: (option: T) => void
  ): HTMLElement {
    const section = this.section(title);
    const list = document.createElement('div');
    list.className = 'bag-chips';

    for (const option of options) {
      const button = document.createElement('button');
      button.className = 'bag-chip';
      button.classList.toggle('is-active', option.id === activeId);
      button.textContent = option.name;
      button.title = option.hint;
      button.addEventListener('click', () => {
        onPick(option);
        this.render();
        this.onChange?.(this.selection);
      });
      list.appendChild(button);
    }

    section.appendChild(list);
    return section;
  }

  private powerSection(): HTMLElement {
    const section = this.section(`Power ${Math.round(this.power * 100)}%`);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '50';
    slider.max = '100';
    slider.value = String(Math.round(this.power * 100));
    slider.className = 'bag-power';
    slider.addEventListener('input', () => {
      this.power = Number(slider.value) / 100;
      const heading = section.querySelector('h2');
      if (heading) {
        heading.textContent = `Power ${slider.value}%`;
      }
    });

    section.appendChild(slider);
    return section;
  }
}
