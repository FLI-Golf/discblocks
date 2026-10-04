// MASTER AUTHORING — reusable adaptive-range slider.
//
// SEPARATION OF CONCERNS:
//   * AVATAR VALUE  (e.g. chestWidth = 1.15) lives in BodyProfile / draft.
//     This module NEVER stores it — it reads/writes via get()/onChange().
//   * EDITOR RANGE  (min/max/step) is authoring-UI convenience state ONLY.
//     It is kept here, keyed by slider id, and never touches BodyProfile,
//     MaleBaselineDraft, GolferPose, Team, or Branding.
//
// FLOW:  AuthoringSlider -> onChange -> BodyProfile -> existing avatar update.
// The range controls only ever mutate THIS slider's own range config.

export type Precision = 'fine' | 'normal' | 'coarse';

export interface AuthoringSliderConfig {
  /** Stable id used as the editor-range state key. */
  id: string;
  label: string;
  defaultMin: number;
  defaultMax: number;
  defaultStep: number;
  /** Engineering safety limits — the range can expand only inside these. */
  hardMin?: number;
  hardMax?: number;
  /**
   * How much one + / − press extends the range. If omitted, derived as
   * (defaultMax - defaultMin) * 0.25.
   */
  rangeIncrement?: number;
  /** Read the CURRENT avatar value (BodyProfile). */
  get: () => number;
  /** Write the avatar value through the existing update path. */
  onChange: (v: number) => void;
}

interface RangeState {
  currentMin: number;
  currentMax: number;
  precision: Precision;
}

// Session-only editor state (v1). Keyed by slider id. Deliberately separate
// from any persisted baseline/profile data.
const rangeStates = new Map<string, RangeState>();

const isFiniteNum = (n: number) => Number.isFinite(n);

function roundToStep(v: number, step: number): number {
  // Snap to the step grid and strip floating-point noise for display.
  const snapped = Math.round(v / step) * step;
  return Number(snapped.toFixed(6));
}

export class AuthoringSlider {
  private readonly cfg: AuthoringSliderConfig;
  private readonly state: RangeState;
  private readonly slider: HTMLInputElement;
  private readonly out: HTMLOutputElement;
  private readonly minBtn: HTMLButtonElement;
  private readonly maxBtn: HTMLButtonElement;
  private readonly resetBtn: HTMLButtonElement;
  readonly el: HTMLElement;

  constructor(cfg: AuthoringSliderConfig) {
    this.cfg = cfg;
    const hardMin = cfg.hardMin ?? Number.NEGATIVE_INFINITY;
    const hardMax = cfg.hardMax ?? Number.POSITIVE_INFINITY;
    this.state =
      rangeStates.get(cfg.id) ??
      (() => {
        const s: RangeState = {
          currentMin: cfg.defaultMin,
          currentMax: cfg.defaultMax,
          precision: 'normal',
        };
        rangeStates.set(cfg.id, s);
        return s;
      })();
    // Clamp any restored state inside hard limits (guards against stale maps).
    this.state.currentMin = Math.max(this.state.currentMin, hardMin);
    this.state.currentMax = Math.min(this.state.currentMax, hardMax);

    const row = document.createElement('label');
    row.className = 'row authoring-slider';

    const span = document.createElement('span');
    span.textContent = cfg.label;

    this.out = document.createElement('output');
    this.out.textContent = this.value().toFixed(2);

    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.applyRangeToSlider();
    this.slider.value = String(this.value());
    this.slider.addEventListener('input', () => {
      const v = Number(this.slider.value);
      this.out.textContent = v.toFixed(2);
      cfg.onChange(v); // SAME BodyProfile update path as before.
    });

    // − extends the available MINIMUM; + extends the available MAXIMUM.
    // They never move the current avatar value.
    this.minBtn = this.mkBtn('−', 'Extend minimum', () => this.extend('min'));
    this.maxBtn = this.mkBtn('+', 'Extend maximum', () => this.extend('max'));
    this.resetBtn = this.mkBtn('⟲', 'Reset range (value unchanged)', () => this.resetRange());

    const precision = this.buildPrecisionSelector();

    row.append(span, this.out, this.minBtn, this.slider, this.maxBtn, this.resetBtn, precision);
    this.el = row;
  }

  private value(): number {
    return this.cfg.get();
  }

  private step(): number {
    const d = this.cfg.defaultStep;
    switch (this.state.precision) {
      case 'fine':
        return roundToStep(d / 5, d / 5) || d / 5;
      case 'coarse':
        return d * 2;
      default:
        return d;
    }
  }

  private increment(): number {
    if (this.cfg.rangeIncrement && isFiniteNum(this.cfg.rangeIncrement)) {
      return this.cfg.rangeIncrement;
    }
    return (this.cfg.defaultMax - this.cfg.defaultMin) * 0.25;
  }

  private applyRangeToSlider() {
    this.slider.min = String(this.state.currentMin);
    this.slider.max = String(this.state.currentMax);
    this.slider.step = String(this.step());
  }

  private extend(which: 'min' | 'max') {
    const inc = this.increment();
    const hardMin = this.cfg.hardMin ?? Number.NEGATIVE_INFINITY;
    const hardMax = this.cfg.hardMax ?? Number.POSITIVE_INFINITY;
    if (which === 'min') {
      this.state.currentMin = Math.max(
        hardMin,
        roundToStep(this.state.currentMin - inc, this.step())
      );
    } else {
      this.state.currentMax = Math.min(
        hardMax,
        roundToStep(this.state.currentMax + inc, this.step())
      );
    }
    // Range change ONLY — re-clamp the displayed thumb WITHOUT firing onChange,
    // so the avatar value stays put even if it's now outside the range.
    this.applyRangeToSlider();
    this.syncThumb();
  }

  private resetRange() {
    this.state.currentMin = this.cfg.defaultMin;
    this.state.currentMax = this.cfg.defaultMax;
    this.state.precision = 'normal';
    this.applyRangeToSlider();
    this.syncThumb();
    this.syncPrecisionUI();
  }

  /** Re-sync the thumb to the avatar value WITHOUT calling onChange. */
  private syncThumb() {
    this.slider.value = String(this.value());
    this.out.textContent = this.value().toFixed(2);
  }

  /** External re-sync hook (e.g. Reset Draft) — mirrors appearanceSliders. */
  sync() {
    this.syncThumb();
  }

  private mkBtn(text: string, title: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.title = title;
    b.className = 'range-btn';
    b.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
    });
    return b;
  }

  private precisionBtns: HTMLButtonElement[] = [];

  private buildPrecisionSelector(): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'precision';
    const defs: Array<[Precision, string]> = [
      ['fine', 'F'],
      ['normal', 'N'],
      ['coarse', 'C'],
    ];
    this.precisionBtns = defs.map(([p, text]) => {
      const b = this.mkBtn(text, `Precision: ${p}`, () => {
        this.state.precision = p;
        this.applyRangeToSlider();
        this.syncThumb();
        this.syncPrecisionUI();
      });
      b.dataset.precision = p;
      wrap.appendChild(b);
      return b;
    });
    this.syncPrecisionUI();
    return wrap;
  }

  private syncPrecisionUI() {
    this.precisionBtns.forEach((b) => {
      b.classList.toggle('active', b.dataset.precision === this.state.precision);
    });
  }
}
