import * as THREE from 'three';
import {
  BODY_PROFILES,
  DEFAULT_GOLFER_APPEARANCE,
  FACE_PRESETS,
  Golfer,
  type AccessorySlot,
  type BodyProfileId,
  type FacePresetId,
  type GolferAppearance,
  type HairStyle,
} from '@/rendering/Golfer';

export type AppearanceModalMode = 'face' | 'look';

export interface AppearanceModalOptions {
  playerName: string;
  mode: AppearanceModalMode;
  initialAppearance: GolferAppearance;
  initialAccessories: Partial<Record<AccessorySlot, boolean>>;
  onApply: (
    appearance: Partial<GolferAppearance>,
    accessories: Partial<Record<AccessorySlot, boolean>>
  ) => void;
  onReset?: (appearance: GolferAppearance) => void;
  onCancel?: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexFromNumber(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}

export class AppearanceModal {
  private readonly root: HTMLDivElement;
  private readonly overlay: HTMLDivElement;
  private readonly previewHost: HTMLDivElement;
  private readonly controlsWrap: HTMLDivElement;
  private readonly preview: Golfer;
  private readonly renderer:
    | THREE.WebGLRenderer
    | {
        render: () => void;
        dispose: () => void;
        setPixelRatio: () => void;
        setSize: () => void;
        setClearColor: () => void;
      };
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly pointer = { down: false, x: 0, y: 0 };
  private view: AppearanceModalMode;
  private readonly cameraTarget = new THREE.Vector3();
  private readonly previewObserver: ResizeObserver;
  private readonly onApply: (
    appearance: Partial<GolferAppearance>,
    accessories: Partial<Record<AccessorySlot, boolean>>
  ) => void;
  private readonly onCancel?: () => void;
  private readonly onReset?: (appearance: GolferAppearance) => void;
  private readonly initialAppearance: GolferAppearance;
  private readonly initialAccessories: Partial<Record<AccessorySlot, boolean>>;
  private readonly restoreFocus: HTMLElement | null;
  private draft: GolferAppearance;
  private accessories: Partial<Record<AccessorySlot, boolean>>;
  private animationId = 0;

  constructor(container: HTMLElement, options: AppearanceModalOptions) {
    this.restoreFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.initialAppearance = { ...options.initialAppearance };
    this.initialAccessories = { ...options.initialAccessories };
    this.draft = { ...options.initialAppearance };
    this.accessories = { ...options.initialAccessories };
    this.view = 'face';
    this.onApply = options.onApply;
    this.onCancel = options.onCancel;
    this.onReset = options.onReset;

    this.root = document.createElement('div');
    this.root.className = 'appearance-modal-root';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute(
      'aria-label',
      `${options.mode === 'face' ? 'Face Builder' : 'Change Look'} for ${options.playerName}`
    );

    this.overlay = document.createElement('div');
    this.overlay.className = 'appearance-modal-overlay';
    this.overlay.addEventListener('click', (event) => {
      if (event.target === this.overlay) {
        this.close(false);
      }
    });

    const modal = document.createElement('div');
    modal.className = 'appearance-modal';

    const header = document.createElement('div');
    header.className = 'appearance-modal-header';

    const title = document.createElement('div');
    title.className = 'appearance-modal-title';
    title.innerHTML = `<span>${options.mode === 'face' ? 'Face Builder' : 'Change Look'}</span><strong>${options.playerName}</strong>`;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'appearance-modal-close';
    close.textContent = '✕';
    close.setAttribute('aria-label', 'Close modal');
    close.addEventListener('click', () => this.close(false));
    header.append(title, close);

    this.previewHost = document.createElement('div');
    this.previewHost.className = 'appearance-preview-host';

    this.controlsWrap = document.createElement('div');
    this.controlsWrap.className = 'appearance-controls';
    this.controlsWrap.appendChild(this.buildControls());

    const modeToggle = document.createElement('div');
    modeToggle.className = 'appearance-mode-toggle';

    const faceToggle = document.createElement('button');
    faceToggle.type = 'button';
    faceToggle.className = 'appearance-mode-button';
    faceToggle.dataset.mode = 'face';
    faceToggle.textContent = 'Face';
    const currentView = this.view as AppearanceModalMode;

    faceToggle.setAttribute('aria-pressed', currentView === 'face' ? 'true' : 'false');
    faceToggle.classList.toggle('is-active', currentView === 'face');
    faceToggle.addEventListener('click', () => {
      this.view = 'face';
      this.applyModeToggle();
    });

    const bodyToggle = document.createElement('button');
    bodyToggle.type = 'button';
    bodyToggle.className = 'appearance-mode-button';
    bodyToggle.dataset.mode = 'look';
    bodyToggle.textContent = 'Body';
    bodyToggle.setAttribute('aria-pressed', currentView === 'look' ? 'true' : 'false');
    bodyToggle.classList.toggle('is-active', currentView === 'look');
    bodyToggle.addEventListener('click', () => {
      this.view = 'look';
      this.applyModeToggle();
    });

    modeToggle.append(faceToggle, bodyToggle);
    this.controlsWrap.prepend(modeToggle);

    const footer = document.createElement('div');
    footer.className = 'appearance-modal-footer';

    const storageNote = document.createElement('p');
    storageNote.className = 'appearance-storage-note';
    storageNote.textContent = 'Saved appearances are stored in this browser only.';

    const actions = document.createElement('div');
    actions.className = 'appearance-actions';

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'appearance-button secondary';
    reset.textContent = 'Reset';
    reset.addEventListener('click', () => {
      this.draft = { ...this.initialAppearance };
      this.accessories = { ...this.initialAccessories };
      this.preview.setAppearance(this.draft);
      this.syncDraftControls();
      this.resetView();
      this.onReset?.(this.draft);
    });

    const resetView = document.createElement('button');
    resetView.type = 'button';
    resetView.className = 'appearance-button secondary';
    resetView.textContent = 'Reset View';
    resetView.addEventListener('click', () => this.resetView());

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'appearance-button secondary';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => this.close(false));

    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'appearance-button primary';
    apply.textContent = 'Apply';
    apply.addEventListener('click', () => {
      this.onApply({ ...this.draft }, { ...this.accessories });
      this.close(true);
    });

    actions.append(reset, resetView, cancel, apply);
    footer.append(storageNote, actions);

    modal.append(header, this.previewHost, this.controlsWrap, footer);
    this.root.appendChild(this.overlay);
    this.root.appendChild(modal);
    container.appendChild(this.root);

    this.scene = new THREE.Scene();
    this.scene.background = null;

    const hemi = new THREE.HemisphereLight(0xf4f7ff, 0x1a2432, 1.3);
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(1.8, 2.2, 2.6);
    const fill = new THREE.DirectionalLight(0xcfe6ff, 0.7);
    fill.position.set(-2.2, 1.4, -1.6);
    this.scene.add(hemi, key, fill);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(1.7, 50),
      new THREE.MeshStandardMaterial({
        color: 0x1a2434,
        roughness: 1,
        metalness: 0.05,
        transparent: true,
        opacity: 0.55,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.8;
    this.scene.add(ground);

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 0.35, 2.8);
    this.camera.lookAt(0, 0.2, 0);

    const renderCanvas = document.createElement('canvas');
    renderCanvas.className = 'appearance-preview-canvas';
    this.previewHost.appendChild(renderCanvas);

    let probeCanvas: HTMLCanvasElement | null = null;
    try {
      probeCanvas = document.createElement('canvas');
      const webglContext =
        probeCanvas.getContext('webgl2') ??
        probeCanvas.getContext('webgl') ??
        probeCanvas.getContext('experimental-webgl');
      const hasWebGL =
        !!webglContext &&
        typeof (webglContext as WebGLRenderingContext).getParameter === 'function' &&
        typeof (webglContext as WebGLRenderingContext).getShaderPrecisionFormat === 'function';
      if (!hasWebGL) {
        probeCanvas = null;
      }
    } catch {
      probeCanvas = null;
    }

    this.renderer = probeCanvas
      ? new THREE.WebGLRenderer({ canvas: renderCanvas, antialias: true, alpha: true })
      : {
          render: () => undefined,
          dispose: () => undefined,
          setPixelRatio: () => undefined,
          setSize: () => undefined,
          setClearColor: () => undefined,
        };

    if (this.renderer instanceof THREE.WebGLRenderer) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(320, 200, false);
      this.renderer.setClearColor(0x000000, 0);
    }

    this.preview = new Golfer(this.draft);
    this.preview.root.rotation.set(0, 0, 0);
    this.preview.root.position.y = -0.72;
    this.preview.root.scale.setScalar(1.9);
    this.scene.add(this.preview.root);

    this.bindPreviewInteractivity(renderCanvas);
    this.bindKeyboard();
    this.syncDraftControls();
    this.previewObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => this.resetView());
    });
    this.previewObserver.observe(this.previewHost);
    this.animationId = requestAnimationFrame(this.animate);
    requestAnimationFrame(() => this.resetView());
    close.focus();
  }

  private buildControls(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'appearance-control-groups';

    if (this.view === 'face') {
      panel.append(
        this.buildFacePresetToggle(),
        this.colorRow('Skin tone', 'skinTone'),
        this.rangeRow('Head shape', 'headScale', 0.75, 1.4, 0.9, 0.05),
        this.rangeRow('Jaw width', 'jawWidth', 0.7, 1.6, 0.95, 0.05),
        this.rangeRow('Chin shape', 'chinShape', 0.5, 1.5, 0.9, 0.05),
        this.rangeRow('Eye spacing', 'eyeSpacing', 0.2, 1.1, 0.6, 0.05),
        this.rangeRow('Brow shape', 'brow', 0.1, 1.1, 0.5, 0.05),
        this.rangeRow('Nose shape', 'nose', 0.2, 1.2, 0.55, 0.05),
        this.rangeRow('Mouth width', 'mouth', 0.2, 1.2, 0.55, 0.05),
        this.selectRow('Hair style', 'hairStyle', [
          'shortCrop',
          'sidePart',
          'undercut',
          'buzzCut',
          'ponytail',
          'bun',
          'bald',
        ]),
        this.colorRow('Hair color', 'hairColor'),
        this.rangeRow('Beard', 'beard', 0, 1, 0, 0.05),
        this.rangeRow('Stubble', 'stubble', 0, 1, 0, 0.05)
      );
      return panel;
    }

    panel.append(
      this.selectRow('Body preset', 'bodyProfile', [
        'athleticMale',
        'athleticFemale',
        'neutralLean',
      ]),
      this.rangeRow('Shoulder width', 'shoulderWidth', 0.7, 1.5, 1, 0.05),
      this.rangeRow('Torso length', 'torsoLength', 0.7, 1.35, 1, 0.05),
      this.rangeRow('Torso taper', 'torsoTaper', 0.5, 1.3, 0.9, 0.05),
      this.rangeRow('Hip width', 'hipWidth', 0.6, 1.45, 1, 0.05),
      this.rangeRow('Arm thickness', 'armThickness', 0.7, 1.5, 1, 0.05),
      this.rangeRow('Leg length', 'legLength', 0.7, 1.35, 1, 0.05),
      this.rangeRow('Head scale', 'headScale', 0.8, 1.4, 1, 0.05),
      this.colorRow('Shirt color', 'shirtColor'),
      this.colorRow('Shorts color', 'shortsColor'),
      this.colorRow('Shoe color', 'shoeColor'),
      this.colorRow('Accent color', 'accentColor'),
      this.selectRow('Hair style', 'hairStyle', [
        'shortCrop',
        'sidePart',
        'undercut',
        'buzzCut',
        'ponytail',
        'bun',
        'bald',
      ])
    );
    return panel;
  }

  private buildFacePresetToggle(): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'appearance-preset-toggle';

    const label = document.createElement('span');
    label.textContent = 'Starting face';

    const toggle = document.createElement('div');
    toggle.className = 'appearance-preset-options';

    (['male', 'female', 'neutral'] as FacePresetId[]).forEach((preset) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'appearance-preset-button';
      button.dataset.preset = preset;
      button.textContent = preset.charAt(0).toUpperCase() + preset.slice(1);
      button.setAttribute('aria-pressed', String(this.draft.facePreset === preset));
      button.classList.toggle('is-selected', this.draft.facePreset === preset);
      button.addEventListener('click', () => {
        this.applyFacePreset(preset);
      });
      toggle.appendChild(button);
    });

    row.append(label, toggle);
    return row;
  }

  private applyFacePreset(preset: FacePresetId) {
    const next = { ...FACE_PRESETS[preset] };
    this.draft.facePreset = preset;
    this.draft.skinTone = next.skinTone;
    this.draft.hairStyle = next.hairStyle as HairStyle;
    this.draft.hairColor = next.hairColor;
    this.draft.profile = {
      ...this.draft.profile,
      headScale: next.headScale,
      jawWidth: next.jawWidth,
      chinShape: next.chinShape,
    };
    this.draft.face = {
      brow: next.brow,
      nose: next.nose,
      eyeSpacing: next.eyeSpacing,
      mouth: next.mouth,
      beard: next.beard,
      stubble: next.stubble,
    };
    this.preview.setAppearance(this.draft);
    this.syncDraftControls();
    this.resetView();
    this.controlsWrap.querySelectorAll('.appearance-preset-button').forEach((button) => {
      const target = button as HTMLButtonElement;
      const isSelected = target.dataset.preset === preset;
      target.setAttribute('aria-pressed', String(isSelected));
      target.classList.toggle('is-selected', isSelected);
    });
  }

  private rangeRow(
    label: string,
    key:
      | 'headScale'
      | 'jawWidth'
      | 'chinShape'
      | 'eyeSpacing'
      | 'brow'
      | 'nose'
      | 'mouth'
      | 'beard'
      | 'stubble'
      | 'shoulderWidth'
      | 'torsoLength'
      | 'torsoTaper'
      | 'hipWidth'
      | 'armThickness'
      | 'legLength',
    min: number,
    max: number,
    defaultValue: number,
    step: number
  ): HTMLLabelElement {
    const row = document.createElement('label');
    row.className = 'appearance-control';
    const meta = document.createElement('span');
    meta.textContent = label;

    const value = document.createElement('output');
    value.textContent = String(this.getValueForKey(key, defaultValue));

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(this.getValueForKey(key, defaultValue));
    input.dataset.key = key;

    input.addEventListener('input', () => {
      const next = Number(input.value);
      const profile = this.draft.profile;
      const face = this.draft.face;

      if (key === 'headScale') {
        this.draft.profile = { ...profile, headScale: next };
      } else if (key === 'jawWidth') {
        this.draft.profile = { ...profile, jawWidth: next };
      } else if (key === 'chinShape') {
        this.draft.profile = { ...profile, chinShape: next };
      } else if (key === 'eyeSpacing') {
        this.draft.face = { ...face, eyeSpacing: next };
      } else if (key === 'brow') {
        this.draft.face = { ...face, brow: next };
      } else if (key === 'nose') {
        this.draft.face = { ...face, nose: next };
      } else if (key === 'mouth') {
        this.draft.face = { ...face, mouth: next };
      } else if (key === 'beard') {
        this.draft.face = { ...face, beard: next };
      } else if (key === 'stubble') {
        this.draft.face = { ...face, stubble: next };
      } else if (key === 'shoulderWidth') {
        this.draft.profile = { ...profile, shoulderWidth: next };
      } else if (key === 'torsoLength') {
        this.draft.profile = { ...profile, torsoLength: next };
      } else if (key === 'torsoTaper') {
        this.draft.profile = { ...profile, torsoTaper: next };
      } else if (key === 'hipWidth') {
        this.draft.profile = { ...profile, hipWidth: next };
      } else if (key === 'armThickness') {
        this.draft.profile = { ...profile, armThickness: next };
      } else if (key === 'legLength') {
        this.draft.profile = { ...profile, legLength: next };
      }

      value.textContent = String(next);
      this.preview.setAppearance(this.draft);
      this.resetView();
    });

    row.append(meta, value, input);
    return row;
  }

  private selectRow(
    label: string,
    key: 'bodyProfile' | 'hairStyle' | 'facePreset',
    options: string[]
  ): HTMLLabelElement {
    const row = document.createElement('label');
    row.className = 'appearance-control';
    const meta = document.createElement('span');
    meta.textContent = label;
    const select = document.createElement('select');
    select.className = 'appearance-select';
    select.dataset.key = key;

    for (const option of options) {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (char) => char.toUpperCase());
      opt.selected = this.getSelectValue(key) === option;
      select.appendChild(opt);
    }

    select.addEventListener('change', () => {
      if (key === 'bodyProfile') {
        const bodyProfile = select.value as BodyProfileId;
        const profile = BODY_PROFILES[bodyProfile];
        this.draft.bodyProfile = bodyProfile;
        this.draft.profile = { ...profile };
      } else if (key === 'hairStyle') {
        this.draft.hairStyle = select.value as HairStyle;
      } else if (key === 'facePreset') {
        const preset = select.value as FacePresetId;
        this.draft.facePreset = preset;
        this.draft.face = {
          ...this.draft.face,
          ...FACE_PRESETS[preset],
        };
      }
      this.preview.setAppearance(this.draft);
      this.resetView();
    });

    row.append(meta, select);
    return row;
  }

  private colorRow(
    label: string,
    key: 'skinTone' | 'hairColor' | 'shirtColor' | 'shortsColor' | 'shoeColor' | 'accentColor'
  ): HTMLLabelElement {
    const row = document.createElement('label');
    row.className = 'appearance-control';
    const meta = document.createElement('span');
    meta.textContent = label;

    const input = document.createElement('input');
    input.type = 'color';
    input.value = hexFromNumber(this.getColorValue(key));
    input.dataset.key = key;

    input.addEventListener('input', () => {
      const value = Number(`0x${input.value.slice(1)}`);
      if (key === 'skinTone') {
        this.draft.skinTone = value;
      } else if (key === 'hairColor') {
        this.draft.hairColor = value;
      } else if (key === 'shirtColor') {
        this.draft.shirtColor = value;
      } else if (key === 'shortsColor') {
        this.draft.shortsColor = value;
      } else if (key === 'shoeColor') {
        this.draft.shoeColor = value;
      } else if (key === 'accentColor') {
        this.draft.accentColor = value;
      }
      this.preview.setAppearance(this.draft);
      this.resetView();
    });

    row.append(meta, input);
    return row;
  }

  private getValueForKey(
    key:
      | 'headScale'
      | 'jawWidth'
      | 'chinShape'
      | 'eyeSpacing'
      | 'brow'
      | 'nose'
      | 'mouth'
      | 'beard'
      | 'stubble'
      | 'shoulderWidth'
      | 'torsoLength'
      | 'torsoTaper'
      | 'hipWidth'
      | 'armThickness'
      | 'legLength',
    fallback: number
  ): number {
    const { profile, face } = this.draft;
    switch (key) {
      case 'headScale':
        return profile.headScale ?? fallback;
      case 'jawWidth':
        return profile.jawWidth ?? fallback;
      case 'chinShape':
        return profile.chinShape ?? fallback;
      case 'eyeSpacing':
        return face.eyeSpacing ?? fallback;
      case 'brow':
        return face.brow ?? fallback;
      case 'nose':
        return face.nose ?? fallback;
      case 'mouth':
        return face.mouth ?? fallback;
      case 'beard':
        return face.beard ?? fallback;
      case 'stubble':
        return face.stubble ?? fallback;
      case 'shoulderWidth':
        return profile.shoulderWidth ?? fallback;
      case 'torsoLength':
        return profile.torsoLength ?? fallback;
      case 'torsoTaper':
        return profile.torsoTaper ?? fallback;
      case 'hipWidth':
        return profile.hipWidth ?? fallback;
      case 'armThickness':
        return profile.armThickness ?? fallback;
      case 'legLength':
        return profile.legLength ?? fallback;
      default:
        return fallback;
    }
  }

  private getSelectValue(key: 'bodyProfile' | 'hairStyle' | 'facePreset'): string {
    if (key === 'bodyProfile') {
      return this.draft.bodyProfile ?? 'neutralLean';
    }
    if (key === 'hairStyle') {
      return this.draft.hairStyle ?? 'shortCrop';
    }
    return this.draft.facePreset ?? 'neutral';
  }

  private getColorValue(
    key: 'skinTone' | 'hairColor' | 'shirtColor' | 'shortsColor' | 'shoeColor' | 'accentColor'
  ): number {
    if (key === 'skinTone') {
      return this.draft.skinTone ?? DEFAULT_GOLFER_APPEARANCE.skinTone;
    }
    if (key === 'hairColor') {
      return this.draft.hairColor ?? DEFAULT_GOLFER_APPEARANCE.hairColor;
    }
    if (key === 'shirtColor') {
      return this.draft.shirtColor ?? DEFAULT_GOLFER_APPEARANCE.shirtColor;
    }
    if (key === 'shortsColor') {
      return this.draft.shortsColor ?? DEFAULT_GOLFER_APPEARANCE.shortsColor;
    }
    if (key === 'shoeColor') {
      return this.draft.shoeColor ?? DEFAULT_GOLFER_APPEARANCE.shoeColor;
    }
    return this.draft.accentColor ?? DEFAULT_GOLFER_APPEARANCE.accentColor ?? 0x8e2f20;
  }

  private syncDraftControls() {
    const controls = this.controlsWrap.querySelectorAll('input, select');
    controls.forEach((control) => {
      if (control instanceof HTMLInputElement) {
        const key = control.dataset.key as string | undefined;
        if (control.type === 'range' && key) {
          const typedKey = key as Parameters<AppearanceModal['getValueForKey']>[0];
          control.value = String(this.getValueForKey(typedKey, Number(control.min)));
        }
        if (control.type === 'color' && key) {
          const typedKey = key as Parameters<AppearanceModal['getColorValue']>[0];
          control.value = hexFromNumber(this.getColorValue(typedKey));
        }
      }
      if (control instanceof HTMLSelectElement) {
        const key = control.dataset.key as 'bodyProfile' | 'hairStyle' | undefined;
        if (key) {
          control.value = this.getSelectValue(key);
        }
      }
    });
  }

  private bindPreviewInteractivity(canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', (event) => {
      this.pointer.down = true;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener('pointermove', (event) => {
      if (!this.pointer.down) {
        return;
      }
      const dx = event.clientX - this.pointer.x;
      const dy = event.clientY - this.pointer.y;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.preview.root.rotation.y += dx * 0.01;
      this.preview.root.rotation.x = clamp(this.preview.root.rotation.x + dy * 0.008, -0.8, 0.9);
    });

    canvas.addEventListener('pointerup', () => {
      this.pointer.down = false;
    });
    canvas.addEventListener('pointerleave', () => {
      this.pointer.down = false;
    });
    canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const direction = new THREE.Vector3()
          .subVectors(this.camera.position, this.cameraTarget)
          .normalize();
        const distance = this.camera.position.distanceTo(this.cameraTarget);
        const nextDistance = clamp(distance + event.deltaY * -0.012, 1.8, 6.5);
        this.camera.position.copy(
          this.cameraTarget.clone().add(direction.multiplyScalar(nextDistance))
        );
        this.camera.lookAt(this.cameraTarget);
      },
      { passive: false }
    );
  }

  private bindKeyboard() {
    document.addEventListener('keydown', this.handleKeydown);
  }

  private handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.close(false);
    }
  };

  private getPreviewPreset() {
    if (this.view === 'face') {
      return {
        paddingX: 0.58,
        paddingY: 0.96,
        minDistance: 0.72,
        maxDistance: 3.2,
        targetOffsetY: -0.08,
        direction: new THREE.Vector3(0, -0.18, 1).normalize(),
      };
    }

    return {
      paddingX: 1.2,
      paddingY: 1.9,
      minDistance: 2.2,
      maxDistance: 7.2,
      targetOffsetY: -0.34,
      direction: new THREE.Vector3(0.08, -0.2, 1).normalize(),
    };
  }

  private resetView() {
    const preset = this.getPreviewPreset();

    let target = new THREE.Vector3();
    if (this.view === 'face') {
      const headPart = this.preview.root.getObjectByName('head-part');
      if (headPart) {
        const headWorld = headPart.getWorldPosition(new THREE.Vector3());
        target.copy(headWorld);
      } else {
        const objectBox = new THREE.Box3().setFromObject(this.preview.root);
        if (objectBox.isEmpty()) {
          return;
        }
        target.copy(objectBox.getCenter(new THREE.Vector3()));
      }
    } else {
      const objectBox = new THREE.Box3().setFromObject(this.preview.root);
      if (objectBox.isEmpty()) {
        return;
      }
      target.copy(objectBox.getCenter(new THREE.Vector3()));
    }

    target.y += preset.targetOffsetY;
    const size =
      this.view === 'face'
        ? new THREE.Vector3(0.38, 0.52, 0.28)
        : new THREE.Box3().setFromObject(this.preview.root).getSize(new THREE.Vector3());
    const aspect = this.previewHost.clientWidth / Math.max(this.previewHost.clientHeight, 1);

    const fitHeight = (size.y + preset.paddingY) * 0.5;
    const fitWidth = (size.x + preset.paddingX) * 0.5;
    const fov = (this.camera.fov * Math.PI) / 180;
    const distanceFromHeight = fitHeight / Math.tan(fov / 2);
    const distanceFromWidth = fitWidth / Math.tan(fov / 2) / aspect;
    const distance = clamp(
      Math.max(distanceFromHeight, distanceFromWidth) * 1.08,
      preset.minDistance,
      preset.maxDistance
    );

    const direction = preset.direction.clone();
    this.camera.position.copy(target.clone().add(direction.multiplyScalar(distance)));
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
    this.preview.root.rotation.x = 0;
    this.preview.root.rotation.y = 0;
    this.preview.root.rotation.z = 0;
    this.cameraTarget.copy(target);
  }

  private animate = () => {
    this.renderer.render(this.scene, this.camera);
    if (this.view === 'look') {
      this.preview.root.rotation.y += 0.003;
    }
    this.animationId = requestAnimationFrame(this.animate);
  };

  private applyModeToggle() {
    this.controlsWrap.innerHTML = '';
    this.controlsWrap.appendChild(this.buildControls());
    const modeToggle = document.createElement('div');
    modeToggle.className = 'appearance-mode-toggle';

    const faceToggle = document.createElement('button');
    faceToggle.type = 'button';
    faceToggle.className = 'appearance-mode-button';
    faceToggle.dataset.mode = 'face';
    faceToggle.textContent = 'Face';
    faceToggle.classList.toggle('is-active', this.view === 'face');
    faceToggle.setAttribute('aria-pressed', this.view === 'face' ? 'true' : 'false');
    faceToggle.addEventListener('click', () => {
      this.view = 'face';
      this.applyModeToggle();
    });

    const bodyToggle = document.createElement('button');
    bodyToggle.type = 'button';
    bodyToggle.className = 'appearance-mode-button';
    bodyToggle.dataset.mode = 'look';
    bodyToggle.textContent = 'Body';
    bodyToggle.classList.toggle('is-active', this.view === 'look');
    bodyToggle.setAttribute('aria-pressed', this.view === 'look' ? 'true' : 'false');
    bodyToggle.addEventListener('click', () => {
      this.view = 'look';
      this.applyModeToggle();
    });

    modeToggle.append(faceToggle, bodyToggle);
    this.controlsWrap.prepend(modeToggle);
    this.preview.setAppearance(this.draft);
    this.resetView();
  }

  close(didApply: boolean) {
    cancelAnimationFrame(this.animationId);
    this.previewObserver.disconnect();
    this.renderer.dispose();
    this.root.remove();
    document.removeEventListener('keydown', this.handleKeydown);
    if (!didApply) {
      this.onCancel?.();
    }
    if (this.restoreFocus) {
      this.restoreFocus.focus();
    }
  }
}
