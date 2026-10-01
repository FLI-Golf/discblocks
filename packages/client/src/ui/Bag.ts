import {
  DISCS,
  RELEASE_ANGLES,
  THROW_STYLES,
  type Disc,
  type ReleaseAngle,
  type ThrowSelection,
  type ThrowStyle,
} from '@/game/discs';
import {
  DEFAULT_GOLFER_APPEARANCE,
  type AccessorySlot,
  type GolferAppearance,
} from '@/rendering/Golfer';

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export class Bag {
  private disc: Disc = DISCS[2];
  private style: ThrowStyle = THROW_STYLES[0];
  private angle: ReleaseAngle = RELEASE_ANGLES[1];
  private power = 1;
  private appearance: GolferAppearance = { ...DEFAULT_GOLFER_APPEARANCE };
  private lookOpen = false;
  private accessoryVisibility: Partial<Record<AccessorySlot, boolean>> = {
    cap: true,
    glasses: false,
    bag: true,
    disc: true,
  };

  private root: HTMLElement;
  private onChange?: (selection: ThrowSelection) => void;
  private onAppearanceChange?: (
    appearance: Partial<GolferAppearance>,
    accessories: Partial<Record<AccessorySlot, boolean>>
  ) => void;

  constructor(
    container: HTMLElement,
    onChange?: (selection: ThrowSelection) => void,
    onAppearanceChange?: (
      appearance: Partial<GolferAppearance>,
      accessories: Partial<Record<AccessorySlot, boolean>>
    ) => void
  ) {
    this.onChange = onChange;
    this.onAppearanceChange = onAppearanceChange;
    this.root = document.createElement('div');
    this.root.id = 'bag';
    container.appendChild(this.root);
    this.render();
    this.onChange?.(this.selection);
    this.onAppearanceChange?.(this.appearance, this.accessoryVisibility);
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
    this.root.appendChild(this.appearanceSection());

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

  private applyAppearanceChange() {
    this.onAppearanceChange?.({ ...this.appearance }, { ...this.accessoryVisibility });
  }

  private appearanceSection(): HTMLElement {
    const section = document.createElement('section');

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'bag-look-toggle';
    toggle.textContent = this.lookOpen ? 'Close Look' : 'Change Look';
    toggle.setAttribute('aria-expanded', String(this.lookOpen));
    toggle.addEventListener('click', () => {
      this.lookOpen = !this.lookOpen;
      this.render();
    });
    section.appendChild(toggle);

    if (!this.lookOpen) {
      return section;
    }

    const presets = document.createElement('div');
    presets.className = 'bag-presets';

    const presetButtonFactory = (label: string, values: Partial<GolferAppearance>) => {
      const matches =
        this.appearance.shirtColor === values.shirtColor &&
        this.appearance.shortsColor === values.shortsColor &&
        (values.hairStyle === undefined || this.appearance.hairStyle === values.hairStyle) &&
        (values.hairColor === undefined || this.appearance.hairColor === values.hairColor);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'bag-chip';
      button.classList.toggle('is-active', matches);
      button.textContent = label;
      button.addEventListener('click', () => {
        this.appearance = { ...this.appearance, ...values };
        this.applyAppearanceChange();
        this.render();
      });
      return button;
    };

    presets.append(
      presetButtonFactory('Classic', {
        shirtColor: 0xc2452d,
        shortsColor: 0x1a1a1e,
        hairColor: 0x2b1d16,
        hairStyle: 'ponytail',
      }),
      presetButtonFactory('Pro', {
        shirtColor: 0x2b75d4,
        shortsColor: 0x1f3054,
        hairColor: 0x1d1d1d,
        hairStyle: 'short',
      }),
      presetButtonFactory('Street', {
        shirtColor: 0x7d4ad8,
        shortsColor: 0x2b2d38,
        hairColor: 0x9a651e,
        hairStyle: 'cap',
      })
    );
    section.appendChild(presets);

    const accessories = document.createElement('div');
    accessories.className = 'bag-chips';

    for (const slot of ['cap', 'glasses', 'bag'] as const) {
      const toggleButton = document.createElement('button');
      toggleButton.type = 'button';
      toggleButton.className = 'bag-chip';
      toggleButton.classList.toggle('is-active', this.accessoryVisibility[slot] ?? false);
      toggleButton.textContent = slot.charAt(0).toUpperCase() + slot.slice(1);
      toggleButton.addEventListener('click', () => {
        const next = !(this.accessoryVisibility[slot] ?? false);
        this.accessoryVisibility[slot] = next;
        this.applyAppearanceChange();
        toggleButton.classList.toggle('is-active', next);
      });
      accessories.appendChild(toggleButton);
    }
    section.appendChild(accessories);

    return section;
  }
}
