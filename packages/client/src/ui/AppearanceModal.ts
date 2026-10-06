import * as THREE from 'three';
import {
  BODY_PROFILES,
  DEFAULT_GOLFER_APPEARANCE,
  FACE_ADVANCED_DEFAULTS,
  FACE_PARAMETER_LIMITS,
  FACE_PRESETS,
  Face,
  Golfer,
  clampFaceParameterValue,
  printSceneGraph,
  type AccessorySlot,
  type BodyProfileId,
  type FaceAdvancedKey,
  type FacePresetId,
  type GolferAppearance,
  type HairStyle,
} from '@/rendering/Golfer';

export type AppearanceModalMode = 'face' | 'look';
export type FacePreviewOrientation = 'front' | 'back' | 'right' | 'left';

type ExpandableFaceSectionId =
  'head' | 'cheeks' | 'jaw' | 'chin' | 'eyes' | 'nose' | 'mouth' | 'brows' | 'facialHair' | 'hair';

type MacroSliderKey =
  | 'headScale'
  | 'jawWidth'
  | 'chinShape'
  | 'brow'
  | 'nose'
  | 'eyeSpacing'
  | 'eyeSize'
  | 'mouth'
  | 'beard'
  | 'stubble'
  | 'shoulderWidth'
  | 'torsoLength'
  | 'neckWidth'
  | 'neckLength'
  | 'torsoTaper'
  | 'hipWidth'
  | 'armThickness'
  | 'armRaise'
  | 'legLength'
  | 'legTaper'
  | 'sleeveLength'
  | 'collarHeight'
  | 'shirtFit'
  | 'shortsLength'
  | 'pantsFit';

type NumericSliderKey = MacroSliderKey | FaceAdvancedKey;

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

export class AppearanceModal {
  private readonly root: HTMLDivElement;
  private readonly overlay: HTMLDivElement;
  private readonly previewHost: HTMLDivElement;
  private readonly previewStatus: HTMLDivElement;
  private readonly controlsWrap: HTMLDivElement;
  private readonly isolatedFace: Face;
  private readonly isolatedFaceRoot: THREE.Group;
  private readonly isolatedFaceBadge: HTMLDivElement;
  private preview!: Golfer;
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
  private facePreviewOrientation: FacePreviewOrientation = 'front';
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
  private faceGuidesEnabled = false;
  private faceGuides?: HTMLDivElement;
  private editingLabel?: HTMLDivElement;
  private draft: GolferAppearance;
  private accessories: Partial<Record<AccessorySlot, boolean>>;
  private expandedFaceSection: ExpandableFaceSectionId | null = null;
  private partDiagnosticsEnabled = false;
  private animationId = 0;

  constructor(container: HTMLElement, options: AppearanceModalOptions) {
    this.restoreFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.initialAppearance = { ...options.initialAppearance };
    this.initialAccessories = { ...options.initialAccessories };
    this.draft = {
      ...options.initialAppearance,
      avatarModelId: 'none',
      facePreset: options.initialAppearance.facePreset ?? 'male',
      face: {
        ...options.initialAppearance.face,
        brow: options.initialAppearance.face?.brow ?? FACE_PRESETS.male.brow,
        nose: options.initialAppearance.face?.nose ?? FACE_PRESETS.male.nose,
        eyeSpacing: options.initialAppearance.face?.eyeSpacing ?? FACE_PRESETS.male.eyeSpacing,
        mouth: options.initialAppearance.face?.mouth ?? FACE_PRESETS.male.mouth,
        beard: options.initialAppearance.face?.beard ?? FACE_PRESETS.male.beard,
        stubble: options.initialAppearance.face?.stubble ?? FACE_PRESETS.male.stubble,
      },
      profile: {
        ...options.initialAppearance.profile,
        headScale: options.initialAppearance.profile?.headScale ?? FACE_PRESETS.male.headScale,
        jawWidth: options.initialAppearance.profile?.jawWidth ?? FACE_PRESETS.male.jawWidth,
        chinShape: options.initialAppearance.profile?.chinShape ?? FACE_PRESETS.male.chinShape,
      },
    };
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

    const titleLabel = document.createElement('span');
    titleLabel.textContent = options.mode === 'face' ? 'Face Builder' : 'Change Look';

    const versionBadge = document.createElement('span');
    versionBadge.className = 'appearance-version-badge';
    versionBadge.textContent = 'Face DBG v2';

    const titleRow = document.createElement('div');
    titleRow.className = 'appearance-modal-title-row';

    const playerName = document.createElement('strong');
    playerName.textContent = options.playerName;

    this.isolatedFaceBadge = document.createElement('div');
    this.isolatedFaceBadge.className = 'appearance-isolated-face-badge';
    this.isolatedFaceBadge.textContent = 'ISOLATED FACE ACTIVE';
    this.isolatedFaceBadge.hidden = true;

    const presetGroup = this.buildHeaderPresetButtons();
    const orientationGroup = this.buildHeaderOrientationButtons();
    titleRow.append(playerName, presetGroup, orientationGroup);
    title.append(titleLabel, versionBadge, this.isolatedFaceBadge, titleRow);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'appearance-modal-close';
    close.textContent = '✕';
    close.setAttribute('aria-label', 'Close modal');
    close.addEventListener('click', () => this.close(false));
    header.append(title, close);

    this.previewHost = document.createElement('div');
    this.previewHost.className = 'appearance-preview-host';

    this.previewStatus = document.createElement('div');
    this.previewStatus.className = 'appearance-preview-status';
    this.previewStatus.textContent = 'Loading avatar…';
    this.previewStatus.hidden = false;
    this.previewHost.appendChild(this.previewStatus);

    this.controlsWrap = document.createElement('div');
    this.controlsWrap.className = 'appearance-controls';
    this.controlsWrap.appendChild(this.buildFaceDebugPanel());
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
      this.draft = {
        ...this.initialAppearance,
        avatarModelId: 'none',
        facePreset: this.initialAppearance.facePreset ?? 'male',
      };
      this.accessories = { ...this.initialAccessories };
      this.preview.setAppearance(this.draft);
      this.syncFaceModelFromDraft();
      this.syncPreviewVisibility();
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
    this.camera.position.set(0, 0.7, 3.15);
    this.camera.lookAt(0, 0.38, 0);

    const renderCanvas = document.createElement('canvas');
    renderCanvas.className = 'appearance-preview-canvas';
    this.previewHost.appendChild(renderCanvas);

    this.editingLabel = document.createElement('div');
    this.editingLabel.className = 'appearance-editing-label';
    this.editingLabel.hidden = true;
    this.previewHost.appendChild(this.editingLabel);

    this.faceGuides = document.createElement('div');
    this.faceGuides.className = 'appearance-face-guides';
    this.faceGuides.hidden = true;
    const vLine = document.createElement('div');
    vLine.className = 'face-guide face-guide-v';
    const hLine = document.createElement('div');
    hLine.className = 'face-guide face-guide-h';
    this.faceGuides.append(vLine, hLine);
    this.previewHost.appendChild(this.faceGuides);

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

    this.isolatedFace = new Face({
      ...FACE_PRESETS.male,
      skinTone: DEFAULT_GOLFER_APPEARANCE.skinTone,
      hairColor: DEFAULT_GOLFER_APPEARANCE.hairColor,
      hairStyle: DEFAULT_GOLFER_APPEARANCE.hairStyle,
      headScale: DEFAULT_GOLFER_APPEARANCE.profile.headScale,
      jawWidth: DEFAULT_GOLFER_APPEARANCE.profile.jawWidth,
      chinShape: DEFAULT_GOLFER_APPEARANCE.profile.chinShape,
      ...DEFAULT_GOLFER_APPEARANCE.face,
    });
    this.isolatedFaceRoot = this.isolatedFace.root;
    this.isolatedFaceRoot.visible = false;
    this.isolatedFaceRoot.position.set(0, 0.1, 0);
    this.isolatedFaceRoot.scale.set(1, 1, 1);
    this.scene.add(this.isolatedFaceRoot);
    this.syncFaceModelFromDraft();

    this.preview = new Golfer(this.draft);
    this.preview.setAvatarStateListener((status, message) => {
      const isLoadingRealAvatar = status === 'loading';
      this.previewStatus.textContent = isLoadingRealAvatar ? message : '';
      this.previewStatus.hidden = !isLoadingRealAvatar;
    });
    this.preview.root.rotation.set(0, 0, 0);
    this.preview.root.rotation.y =
      this.view === 'face' ? this.getFaceYaw(this.facePreviewOrientation) : 0;
    this.preview.root.position.y = -0.62;
    this.preview.root.scale.setScalar(1.55);
    this.previewStatus.hidden = true;
    this.scene.add(this.preview.root);

    if (import.meta.env.DEV) {
      printSceneGraph(this.isolatedFaceRoot, '[FACE PREVIEW GRAPH]');
      printSceneGraph(this.preview.root, '[FULL GOLFER GRAPH]');
    }

    this.clearLegacyDiagnosticsState();
    this.syncPreviewVisibility();
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

  private buildFaceDebugPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'face-debug-panel is-collapsed';

    const header = document.createElement('div');
    header.className = 'face-debug-header';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'face-debug-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'face-debug-content');

    const chevron = document.createElement('span');
    chevron.className = 'face-debug-chevron';
    chevron.textContent = '▸';

    const title = document.createElement('span');
    title.className = 'face-debug-title';
    title.textContent = 'Face diagnostics';
    toggle.append(chevron, title);

    const content = document.createElement('div');
    content.className = 'face-debug-content';
    content.hidden = true;

    const toggles = ['Head', 'Jaw', 'Eyes', 'Nose', 'Mouth', 'Brows', 'Stubble', 'Hair'];
    toggles.forEach((label, index) => {
      const row = document.createElement('label');
      row.className = 'face-debug-control';
      if (index === 0) {
        row.classList.add('face-debug-control--primary');
      }
      const text = document.createElement('span');
      text.textContent = label;
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = true;
      input.setAttribute('aria-label', label);
      row.append(text, input);
      content.appendChild(row);
    });

    if (import.meta.env.DEV) {
      const diagRow = document.createElement('label');
      diagRow.className = 'face-debug-control';
      const diagText = document.createElement('span');
      diagText.textContent = 'Part transforms';
      const diagInput = document.createElement('input');
      diagInput.type = 'checkbox';
      diagInput.checked = false;
      diagInput.setAttribute('aria-label', 'Part transforms');
      diagInput.addEventListener('change', () => {
        this.partDiagnosticsEnabled = diagInput.checked;
        if (diagInput.checked) {
          this.logExpandedPartTransforms();
        }
      });
      diagRow.append(diagText, diagInput);
      content.appendChild(diagRow);

      const guidesRow = document.createElement('label');
      guidesRow.className = 'face-debug-control';
      const guidesText = document.createElement('span');
      guidesText.textContent = 'Face Guides';
      const guidesInput = document.createElement('input');
      guidesInput.type = 'checkbox';
      guidesInput.checked = false;
      guidesInput.setAttribute('aria-label', 'Face Guides');
      guidesInput.addEventListener('change', () => {
        this.faceGuidesEnabled = guidesInput.checked;
        this.updateFaceGuidesVisibility();
      });
      guidesRow.append(guidesText, guidesInput);
      content.appendChild(guidesRow);
    }

    toggle.addEventListener('click', () => {
      const collapsed = panel.classList.toggle('is-collapsed');
      content.hidden = collapsed;
      toggle.setAttribute('aria-expanded', String(!collapsed));
      chevron.textContent = collapsed ? '▸' : '▾';
    });

    header.appendChild(toggle);
    panel.append(header, content);
    return panel;
  }

  private faceGroupHeading(label: string): HTMLDivElement {
    const heading = document.createElement('div');
    heading.className = 'appearance-face-group-heading';
    heading.textContent = label;
    return heading;
  }

  private faceSection(
    id: ExpandableFaceSectionId,
    title: string,
    options: {
      summary?: string;
      buildContent?: (container: HTMLElement) => void;
    } = {}
  ): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'face-section';
    section.dataset.section = id;

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'face-section-header';
    header.setAttribute('aria-expanded', String(this.expandedFaceSection === id));

    const titleEl = document.createElement('span');
    titleEl.className = 'face-section-title';
    titleEl.textContent = title;

    const summary = document.createElement('span');
    summary.className = 'face-section-summary';
    if (options.summary !== undefined) {
      summary.textContent = options.summary;
    }

    const chevron = document.createElement('span');
    chevron.className = 'face-section-chevron';
    chevron.textContent = this.expandedFaceSection === id ? '▾' : '▸';

    header.append(titleEl, summary, chevron);
    section.appendChild(header);

    if (options.buildContent) {
      const content = document.createElement('div');
      content.className = 'face-section-content';
      content.hidden = this.expandedFaceSection !== id;
      options.buildContent(content);
      section.appendChild(content);
    }

    header.addEventListener('click', () => {
      this.expandedFaceSection = this.expandedFaceSection === id ? null : id;
      this.refreshFaceSections();
      this.logExpandedPartTransforms();
      this.updateEditingLabel();
    });

    return section;
  }

  private logExpandedPartTransforms() {
    if (!this.partDiagnosticsEnabled || !this.expandedFaceSection) {
      return;
    }
    const partNames: Record<ExpandableFaceSectionId, string[]> = {
      head: ['head-part'],
      cheeks: ['cheek-left', 'cheek-right'],
      jaw: ['jaw-part'],
      chin: ['jaw-part'],
      eyes: ['eye-white-left', 'eye-white-right', 'iris-left', 'iris-right'],
      nose: ['nose-part'],
      mouth: ['mouth-part'],
      brows: ['brow-left', 'brow-right'],
      facialHair: ['beard-part', 'stubble-part'],
      hair: ['hair-root'],
    };
    const names = partNames[this.expandedFaceSection] ?? [];
    const report: Record<string, unknown> = {};
    names.forEach((name) => {
      const obj = this.isolatedFace.root.getObjectByName(name);
      if (obj) {
        report[name] = {
          position: obj.position.toArray().map((v) => Number(v.toFixed(4))),
          scale: obj.scale.toArray().map((v) => Number(v.toFixed(4))),
          rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z].map((v) =>
            Number(v.toFixed(4))
          ),
        };
      }
    });
    console.info(`[PART TRANSFORMS] ${this.expandedFaceSection}`, report);
  }

  private updateEditingLabel() {
    if (!this.editingLabel) {
      return;
    }
    if (this.view === 'face' && this.expandedFaceSection) {
      const name =
        this.expandedFaceSection.charAt(0).toUpperCase() + this.expandedFaceSection.slice(1);
      this.editingLabel.textContent = `Editing: ${name}`;
      this.editingLabel.hidden = false;
    } else {
      this.editingLabel.hidden = true;
    }
  }

  private updateFaceGuidesVisibility() {
    if (this.faceGuides) {
      this.faceGuides.hidden = !(this.faceGuidesEnabled && this.view === 'face');
    }
  }

  private resetFaceSection(keys: Array<NumericSliderKey | 'hairStyle' | 'hairColor'>) {
    const nextFace = { ...(this.draft.face ?? FACE_PRESETS[this.draft.facePreset ?? 'male']) };
    const nextProfile = {
      ...(this.draft.profile ?? BODY_PROFILES[this.draft.bodyProfile ?? 'athleticMale']),
    };

    keys.forEach((key) => {
      if (key === 'hairStyle') {
        this.draft.hairStyle = FACE_PRESETS.male.hairStyle;
        return;
      }
      if (key === 'hairColor') {
        this.draft.hairColor = FACE_PRESETS.male.hairColor;
        return;
      }
      if (key in FACE_ADVANCED_DEFAULTS) {
        (nextFace as Record<string, number>)[key] = FACE_ADVANCED_DEFAULTS[key as FaceAdvancedKey];
        return;
      }
      if (key === 'headScale') {
        nextProfile.headScale = FACE_PARAMETER_LIMITS.headScale.default;
      } else if (key === 'jawWidth') {
        nextProfile.jawWidth = FACE_PARAMETER_LIMITS.jawWidth.default;
      } else if (key === 'chinShape') {
        nextProfile.chinShape = FACE_PARAMETER_LIMITS.chinShape.default;
      } else if (
        key === 'brow' ||
        key === 'nose' ||
        key === 'eyeSpacing' ||
        key === 'eyeSize' ||
        key === 'mouth' ||
        key === 'beard' ||
        key === 'stubble'
      ) {
        (nextFace as Record<string, number>)[key] =
          FACE_PARAMETER_LIMITS[key as keyof typeof FACE_PARAMETER_LIMITS].default;
      }
    });

    this.draft.face = nextFace;
    this.draft.profile = nextProfile;
    this.preview.setAppearance(this.draft);
    this.syncFaceModelFromDraft();
    this.syncDraftControls();
    this.resetView();
  }

  private refreshFaceSections() {
    this.controlsWrap.querySelectorAll<HTMLElement>('.face-section').forEach((section) => {
      const id = section.dataset.section as ExpandableFaceSectionId | undefined;
      const isOpen = id !== undefined && id === this.expandedFaceSection;
      const content = section.querySelector<HTMLElement>('.face-section-content');
      if (content) {
        content.hidden = !isOpen;
      }
      const chevron = section.querySelector<HTMLElement>('.face-section-chevron');
      if (chevron) {
        chevron.textContent = isOpen ? '▾' : '▸';
      }
      const header = section.querySelector<HTMLElement>('.face-section-header');
      header?.setAttribute('aria-expanded', String(isOpen));
    });
  }

  private buildControls(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'appearance-control-groups';

    if (this.view === 'face') {
      const formatValue = (value: number) => value.toFixed(2);
      const profile = this.draft.profile ?? BODY_PROFILES[this.draft.bodyProfile ?? 'athleticMale'];
      const face = this.draft.face ?? FACE_PRESETS[this.draft.facePreset ?? 'male'];
      const adv = (key: FaceAdvancedKey) =>
        (face as Record<string, number | undefined>)[key] ?? FACE_ADVANCED_DEFAULTS[key];

      const advScale = (label: string, key: FaceAdvancedKey) =>
        this.sliderRow(label, key, 0.25, 2.0, 0.01);
      const advPos = (label: string, key: FaceAdvancedKey) =>
        this.sliderRow(label, key, -0.3, 0.3, 0.005);
      const resetButton = (
        label: string,
        keys: Array<NumericSliderKey | 'hairStyle' | 'hairColor'>
      ) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'appearance-section-reset';
        button.textContent = label;
        button.addEventListener('click', () => this.resetFaceSection(keys));
        return button;
      };

      panel.append(
        this.faceGroupHeading('Face Shape'),
        this.faceSection('head', 'Head', {
          summary: formatValue(profile.headScale ?? FACE_PARAMETER_LIMITS.headScale.default),
          buildContent: (container) => {
            container.append(
              this.sliderRow(
                'Scale',
                'headScale',
                FACE_PARAMETER_LIMITS.headScale.min,
                FACE_PARAMETER_LIMITS.headScale.max,
                FACE_PARAMETER_LIMITS.headScale.step
              ),
              advScale('Width', 'headWidth'),
              advScale('Height', 'headHeight'),
              advScale('Depth', 'headDepth'),
              advPos('Vertical', 'headPositionY'),
              advPos('Forward / Back', 'headPositionZ'),
              resetButton('Reset Head', [
                'headScale',
                'headWidth',
                'headHeight',
                'headDepth',
                'headPositionY',
                'headPositionZ',
              ])
            );
          },
        }),
        this.faceSection('cheeks', 'Cheeks', {
          summary: formatValue(adv('cheekSize')),
          buildContent: (container) => {
            container.append(
              advScale('Size', 'cheekSize'),
              advScale('Width', 'cheekWidth'),
              advScale('Height', 'cheekHeight'),
              advScale('Depth', 'cheekDepth'),
              advScale('Spacing', 'cheekSpacing'),
              advPos('Vertical', 'cheekPositionY'),
              advPos('Forward / Back', 'cheekPositionZ'),
              resetButton('Reset Cheeks', [
                'cheekSize',
                'cheekWidth',
                'cheekHeight',
                'cheekDepth',
                'cheekSpacing',
                'cheekPositionY',
                'cheekPositionZ',
              ])
            );
          },
        }),
        this.faceSection('jaw', 'Jaw', {
          summary: formatValue(profile.jawWidth ?? FACE_PARAMETER_LIMITS.jawWidth.default),
          buildContent: (container) => {
            container.append(
              this.sliderRow(
                'Main',
                'jawWidth',
                FACE_PARAMETER_LIMITS.jawWidth.min,
                FACE_PARAMETER_LIMITS.jawWidth.max,
                FACE_PARAMETER_LIMITS.jawWidth.step
              ),
              advScale('Height', 'jawHeight'),
              advScale('Depth', 'jawDepth'),
              advPos('Vertical', 'jawPositionY'),
              advPos('Forward / Back', 'jawPositionZ'),
              resetButton('Reset Jaw', [
                'jawWidth',
                'jawHeight',
                'jawDepth',
                'jawPositionY',
                'jawPositionZ',
              ])
            );
          },
        }),
        this.faceSection('chin', 'Chin', {
          summary: formatValue(profile.chinShape ?? FACE_PARAMETER_LIMITS.chinShape.default),
          buildContent: (container) => {
            container.append(
              this.sliderRow(
                'Prominence',
                'chinShape',
                FACE_PARAMETER_LIMITS.chinShape.min,
                FACE_PARAMETER_LIMITS.chinShape.max,
                FACE_PARAMETER_LIMITS.chinShape.step
              ),
              advScale('Size', 'chinSize'),
              advScale('Width', 'chinWidth'),
              advScale('Height', 'chinHeight'),
              advScale('Depth', 'chinDepth'),
              advPos('Vertical', 'chinPositionY'),
              advPos('Forward / Back', 'chinPositionZ'),
              resetButton('Reset Chin', [
                'chinShape',
                'chinSize',
                'chinWidth',
                'chinHeight',
                'chinDepth',
                'chinPositionY',
                'chinPositionZ',
              ])
            );
          },
        }),
        this.faceGroupHeading('Features'),
        this.faceSection('eyes', 'Eyes', {
          summary: formatValue(face.eyeSize ?? FACE_PARAMETER_LIMITS.eyeSize.default),
          buildContent: (container) => {
            container.append(
              this.sliderRow(
                'Size',
                'eyeSize',
                FACE_PARAMETER_LIMITS.eyeSize.min,
                FACE_PARAMETER_LIMITS.eyeSize.max,
                FACE_PARAMETER_LIMITS.eyeSize.step
              ),
              advScale('Width', 'eyeWidth'),
              advScale('Height', 'eyeHeight'),
              advScale('Depth', 'eyeDepth'),
              this.sliderRow(
                'Spacing',
                'eyeSpacing',
                FACE_PARAMETER_LIMITS.eyeSpacing.min,
                FACE_PARAMETER_LIMITS.eyeSpacing.max,
                FACE_PARAMETER_LIMITS.eyeSpacing.step
              ),
              advPos('Vertical', 'eyePositionY'),
              advPos('Forward / Back', 'eyePositionZ'),
              resetButton('Reset Eyes', [
                'eyeSize',
                'eyeWidth',
                'eyeHeight',
                'eyeDepth',
                'eyeSpacing',
                'eyePositionY',
                'eyePositionZ',
              ])
            );
          },
        }),
        this.faceSection('nose', 'Nose', {
          summary: formatValue(face.nose ?? FACE_PARAMETER_LIMITS.nose.default),
          buildContent: (container) => {
            container.append(
              this.sliderRow(
                'Size',
                'nose',
                FACE_PARAMETER_LIMITS.nose.min,
                FACE_PARAMETER_LIMITS.nose.max,
                FACE_PARAMETER_LIMITS.nose.step
              ),
              advScale('Width', 'noseWidth'),
              advScale('Height', 'noseHeight'),
              advScale('Depth', 'noseDepth'),
              advPos('Vertical', 'nosePositionY'),
              advPos('Forward / Back', 'nosePositionZ'),
              resetButton('Reset Nose', [
                'nose',
                'noseWidth',
                'noseHeight',
                'noseDepth',
                'nosePositionY',
                'nosePositionZ',
              ])
            );
          },
        }),
        this.faceSection('mouth', 'Mouth', {
          summary: formatValue(face.mouth ?? FACE_PARAMETER_LIMITS.mouth.default),
          buildContent: (container) => {
            container.append(
              this.sliderRow(
                'Size',
                'mouth',
                FACE_PARAMETER_LIMITS.mouth.min,
                FACE_PARAMETER_LIMITS.mouth.max,
                FACE_PARAMETER_LIMITS.mouth.step
              ),
              advScale('Width', 'mouthWidth'),
              advScale('Height', 'mouthHeight'),
              advScale('Depth', 'mouthDepth'),
              advScale('Lip Fullness', 'mouthFullness'),
              advPos('Vertical', 'mouthPositionY'),
              advPos('Forward / Back', 'mouthPositionZ'),
              this.sliderRow('Corner Angle', 'mouthCornerAngle', -30, 30, 1),
              this.sliderRow('Opening', 'mouthOpening', 0, 1, 0.01),
              resetButton('Reset Mouth', [
                'mouth',
                'mouthWidth',
                'mouthHeight',
                'mouthDepth',
                'mouthFullness',
                'mouthPositionY',
                'mouthPositionZ',
                'mouthCornerAngle',
                'mouthOpening',
              ])
            );
          },
        }),
        this.faceSection('brows', 'Brows', {
          summary: formatValue(face.brow ?? FACE_PARAMETER_LIMITS.brow.default),
          buildContent: (container) => {
            container.append(
              this.sliderRow(
                'Size',
                'brow',
                FACE_PARAMETER_LIMITS.brow.min,
                FACE_PARAMETER_LIMITS.brow.max,
                FACE_PARAMETER_LIMITS.brow.step
              ),
              advScale('Width', 'browWidth'),
              advScale('Thickness', 'browThickness'),
              advScale('Spacing', 'browSpacing'),
              advPos('Vertical', 'browPositionY'),
              this.sliderRow('Angle', 'browAngle', -45, 45, 1),
              this.sliderRow('Arch', 'browArch', -1, 1, 0.01),
              advPos('Inner Height', 'browInnerHeight'),
              advPos('Outer Height', 'browOuterHeight'),
              advPos('Inner Fwd / Back', 'browInnerForward'),
              advPos('Outer Fwd / Back', 'browOuterForward'),
              resetButton('Reset Brows', [
                'brow',
                'browWidth',
                'browThickness',
                'browSpacing',
                'browPositionY',
                'browAngle',
              ])
            );
          },
        }),
        this.faceGroupHeading('Facial Hair'),
        this.faceSection('facialHair', 'Facial Hair', {
          summary: formatValue(face.beard ?? FACE_PARAMETER_LIMITS.beard.default),
          buildContent: (container) => {
            container.append(
              this.sliderRow(
                'Beard',
                'beard',
                FACE_PARAMETER_LIMITS.beard.min,
                FACE_PARAMETER_LIMITS.beard.max,
                FACE_PARAMETER_LIMITS.beard.step
              ),
              this.sliderRow(
                'Stubble',
                'stubble',
                FACE_PARAMETER_LIMITS.stubble.min,
                FACE_PARAMETER_LIMITS.stubble.max,
                FACE_PARAMETER_LIMITS.stubble.step
              )
            );
          },
        }),
        this.faceGroupHeading('Hair'),
        this.faceSection('hair', 'Hair', {
          buildContent: (container) => {
            container.append(
              this.selectRow('Style', 'hairStyle', [
                'shortCrop',
                'sidePart',
                'undercut',
                'buzzCut',
                'ponytail',
                'bun',
                'bald',
              ]),
              advScale('Scale', 'hairScale'),
              advScale('Width', 'hairWidth'),
              advScale('Height', 'hairHeight'),
              advScale('Depth', 'hairDepth'),
              advPos('Vertical', 'hairPositionY'),
              advPos('Forward / Back', 'hairPositionZ'),
              this.colorRow('Color', 'hairColor'),
              advScale('Crown Width', 'hairCrownWidth'),
              advScale('Crown Height', 'hairCrownHeight'),
              advScale('Crown Depth', 'hairCrownDepth'),
              this.sliderRow('Top Grow In', 'hairCrownGrowIn', 0.5, 2.0, 0.01),
              advScale('Back Width', 'hairBackWidth'),
              advScale('Back Height', 'hairBackHeight'),
              advScale('Back Depth', 'hairBackDepth'),
              this.sliderRow('Back Grow In', 'hairBackGrowIn', 0.5, 2.0, 0.01),
              advScale('Side Width', 'hairSideWidth'),
              advScale('Side Height', 'hairSideHeight'),
              advScale('Side Depth', 'hairSideDepth'),
              resetButton('Reset Hair', [
                'hairStyle',
                'hairColor',
                'hairScale',
                'hairWidth',
                'hairHeight',
                'hairDepth',
                'hairPositionY',
                'hairPositionZ',
                'hairCrownWidth',
                'hairCrownHeight',
                'hairCrownDepth',
                'hairCrownGrowIn',
                'hairBackWidth',
                'hairBackHeight',
                'hairBackDepth',
                'hairBackGrowIn',
                'hairSideWidth',
                'hairSideHeight',
                'hairSideDepth',
              ])
            );
          },
        }),
        this.faceGroupHeading('Skin'),
        this.colorRow('Skin tone', 'skinTone')
      );
    } else {
      const bodySection = (
        id: string,
        title: string,
        buildContent: (container: HTMLElement) => void
      ) => {
        const section = document.createElement('div');
        section.className = 'face-section';
        section.dataset.section = `body-${id}`;

        const header = document.createElement('button');
        header.type = 'button';
        header.className = 'face-section-header';
        header.setAttribute('aria-expanded', 'false');
        const titleEl = document.createElement('span');
        titleEl.className = 'face-section-title';
        titleEl.textContent = title;
        const chevron = document.createElement('span');
        chevron.className = 'face-section-chevron';
        chevron.textContent = '▸';
        header.append(titleEl, chevron);
        section.appendChild(header);

        const content = document.createElement('div');
        content.className = 'face-section-content';
        content.hidden = true;
        buildContent(content);
        section.appendChild(content);

        header.addEventListener('click', () => {
          const open = content.hidden;
          // accordion: collapse all other body sections
          this.controlsWrap
            .querySelectorAll<HTMLElement>('.face-section[data-section^="body-"]')
            .forEach((s) => {
              const c = s.querySelector<HTMLElement>('.face-section-content');
              const ch = s.querySelector<HTMLElement>('.face-section-chevron');
              if (c) c.hidden = true;
              if (ch) ch.textContent = '▸';
              s.querySelector('.face-section-header')?.setAttribute('aria-expanded', 'false');
            });
          content.hidden = !open;
          chevron.textContent = open ? '▾' : '▸';
          header.setAttribute('aria-expanded', String(open));
        });
        return section;
      };

      panel.append(
        bodySection('torso', 'Torso', (c) => {
          c.append(
            this.sliderRow('Length', 'torsoLength', 0.5, 1.5, 0.01),
            this.sliderRow('Width / Taper', 'torsoTaper', 0.4, 1.4, 0.01),
            this.colorRow('Shirt color', 'shirtColor'),
            this.colorRow('Accent color', 'accentColor')
          );
        }),
        bodySection('shoulders', 'Shoulders', (c) => {
          c.append(this.sliderRow('Width', 'shoulderWidth', 0.5, 1.5, 0.01));
        }),
        bodySection('arms', 'Arms', (c) => {
          c.append(
            this.sliderRow('Thickness', 'armThickness', 0.5, 1.6, 0.01),
            this.sliderRow('Raise / Separation', 'armRaise', 0, 100, 1),
            this.sliderRow('Sleeve length', 'sleeveLength', 0.4, 1.6, 0.01)
          );
        }),
        bodySection('hips', 'Hips / Legs', (c) => {
          c.append(
            this.sliderRow('Hip width', 'hipWidth', 0.5, 1.5, 0.01),
            this.sliderRow('Leg length', 'legLength', 0.6, 1.5, 0.01),
            this.sliderRow('Leg taper', 'legTaper', 0.5, 1.5, 0.01),
            this.colorRow('Shorts color', 'shortsColor')
          );
        }),
        bodySection('feet', 'Feet', (c) => {
          c.append(this.colorRow('Shoe color', 'shoeColor'));
        }),
        bodySection('outfit', 'Outfit', (c) => {
          c.append(
            this.sliderRow('Collar height', 'collarHeight', 0.4, 1.6, 0.01),
            this.sliderRow('Shirt fit', 'shirtFit', 0.4, 1.6, 0.01),
            this.sliderRow('Shorts length', 'shortsLength', 0.4, 1.6, 0.01),
            this.sliderRow('Pants fit', 'pantsFit', 0.4, 1.6, 0.01)
          );
        })
      );
    }

    panel.append(
      this.selectRow('Avatar model', 'avatarModelId', ['male', 'female']),
      this.selectRow('Body preset', 'bodyProfile', [
        'athleticMale',
        'athleticFemale',
        'neutralLean',
      ])
    );

    return panel;
  }

  private clearLegacyDiagnosticsState() {
    this.isolatedFaceBadge.hidden = true;
    this.syncPreviewVisibility();
  }

  private syncPreviewVisibility() {
    if (!this.preview) {
      return;
    }

    const showFaceOnly = this.view === 'face';
    this.preview.root.visible = !showFaceOnly;
    this.isolatedFaceRoot.visible = showFaceOnly;
    this.preview.setHeadOnlyPreview(showFaceOnly);
    if (showFaceOnly) {
      this.preview.root.rotation.x = 0;
      this.preview.root.rotation.y = this.getFaceYaw(this.facePreviewOrientation);
      this.preview.root.rotation.z = 0;
      this.isolatedFaceRoot.position.set(0, 0.1, 0);
      this.isolatedFaceRoot.rotation.set(0, 0, 0);
      this.isolatedFaceRoot.scale.set(1.45, 1.45, 1.45);
    } else {
      this.preview.root.rotation.set(0, 0, 0);
    }
    this.updateEditingLabel();
    this.updateFaceGuidesVisibility();
  }

  private syncFaceModelFromDraft() {
    const profile = this.draft.profile ?? BODY_PROFILES[this.draft.bodyProfile ?? 'athleticMale'];
    const baseFace = this.draft.face ?? FACE_PRESETS[this.draft.facePreset ?? 'male'];
    this.isolatedFace.setConfig({
      preset: this.draft.facePreset ?? 'male',
      skinTone: this.draft.skinTone ?? DEFAULT_GOLFER_APPEARANCE.skinTone,
      hairColor: this.draft.hairColor ?? DEFAULT_GOLFER_APPEARANCE.hairColor,
      hairStyle: this.draft.hairStyle ?? DEFAULT_GOLFER_APPEARANCE.hairStyle,
      headScale: profile.headScale,
      jawWidth: profile.jawWidth,
      chinShape: profile.chinShape,
      ...baseFace,
    });
  }

  private buildHeaderPresetButtons(): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'appearance-header-preset-group';

    (['male', 'female'] as FacePresetId[]).forEach((preset) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'appearance-header-preset';
      button.dataset.preset = preset;
      button.textContent = preset.charAt(0).toUpperCase() + preset.slice(1);
      button.setAttribute('aria-pressed', String(this.draft.facePreset === preset));
      button.classList.toggle('is-selected', this.draft.facePreset === preset);
      button.addEventListener('click', () => {
        this.applyFacePreset(preset);
      });
      group.appendChild(button);
    });

    return group;
  }

  private buildHeaderOrientationButtons(): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'appearance-header-orientation-group';

    (['front', 'left', 'right', 'back'] as FacePreviewOrientation[]).forEach((orientation) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'appearance-header-orientation';
      button.dataset.orientation = orientation;
      button.textContent = orientation.charAt(0).toUpperCase() + orientation.slice(1);
      button.setAttribute('aria-pressed', String(this.facePreviewOrientation === orientation));
      button.classList.toggle('is-selected', this.facePreviewOrientation === orientation);
      button.addEventListener('click', () => {
        this.facePreviewOrientation = orientation;
        if (this.view !== 'face') {
          this.view = 'face';
          this.applyModeToggle();
        }
        this.resetView();
      });
      group.appendChild(button);
    });

    return group;
  }

  private updateHeaderPresetButtons() {
    const group = this.root.querySelector('.appearance-header-preset-group');
    if (!group) {
      return;
    }

    group.querySelectorAll<HTMLButtonElement>('.appearance-header-preset').forEach((button) => {
      const preset = button.dataset.preset as FacePresetId | undefined;
      const isSelected = preset === this.draft.facePreset;
      button.setAttribute('aria-pressed', String(isSelected));
      button.classList.toggle('is-selected', isSelected);
    });
  }

  private updateHeaderOrientationButtons() {
    const group = this.root.querySelector('.appearance-header-orientation-group');
    if (!group) {
      return;
    }

    group
      .querySelectorAll<HTMLButtonElement>('.appearance-header-orientation')
      .forEach((button) => {
        const orientation = button.dataset.orientation as FacePreviewOrientation | undefined;
        const isSelected = orientation === this.facePreviewOrientation;
        button.setAttribute('aria-pressed', String(isSelected));
        button.classList.toggle('is-selected', isSelected);
      });
  }

  private applyFacePreset(preset: FacePresetId) {
    const next = { ...FACE_PRESETS[preset] };
    this.draft.facePreset = preset;
    this.draft.avatarModelId = 'none';
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
      ...this.draft.face,
      brow: next.brow,
      nose: next.nose,
      eyeSpacing: next.eyeSpacing,
      mouth: next.mouth,
      beard: next.beard,
      stubble: next.stubble,
    };
    this.preview.setAppearance(this.draft);
    this.syncFaceModelFromDraft();
    this.syncDraftControls();
    this.updateHeaderPresetButtons();
    this.updateHeaderOrientationButtons();
    this.resetView();
  }

  private selectRow(
    label: string,
    key: 'bodyProfile' | 'hairStyle' | 'facePreset' | 'avatarModelId',
    options: string[],
    disabled = false
  ): HTMLLabelElement {
    const row = document.createElement('label');
    row.className = 'appearance-control';
    const meta = document.createElement('span');
    meta.textContent = label;
    const select = document.createElement('select');
    select.className = 'appearance-select';
    select.dataset.key = key;
    select.disabled = disabled;
    select.title = disabled
      ? 'Unsupported in the FaceCap prototype model. Separate male/female bases are not included in this asset.'
      : '';

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
      } else if (key === 'avatarModelId') {
        const model = select.value as 'male' | 'female';
        this.draft.facePreset = model === 'female' ? 'female' : 'male';
        this.draft.avatarModelId = 'none';
        this.applyFacePreset(this.draft.facePreset);
      }
      this.preview.setAppearance(this.draft);
      this.syncFaceModelFromDraft();
      this.clearLegacyDiagnosticsState();
      this.resetView();
    });

    row.append(meta, select);
    return row;
  }

  private colorRow(
    label: string,
    key: 'skinTone' | 'hairColor' | 'shirtColor' | 'shortsColor' | 'accentColor' | 'shoeColor'
  ): HTMLLabelElement {
    const row = document.createElement('label');
    row.className = 'appearance-control';
    const meta = document.createElement('span');
    meta.textContent = label;
    const input = document.createElement('input');
    input.type = 'color';
    input.dataset.key = key;
    input.value = '#' + this.getColorValue(key).toString(16).padStart(6, '0');
    input.addEventListener('input', () => {
      this.setColorValue(key, Number.parseInt(input.value.slice(1), 16));
      this.preview.setAppearance(this.draft);
      this.syncFaceModelFromDraft();
      this.clearLegacyDiagnosticsState();
      this.resetView();
    });
    row.append(meta, input);
    return row;
  }

  private sliderRow(
    label: string,
    key: NumericSliderKey,
    min: number,
    max: number,
    step: number
  ): HTMLLabelElement {
    const row = document.createElement('label');
    row.className = 'appearance-control';
    const meta = document.createElement('span');
    meta.textContent = label;
    const value = document.createElement('output');
    const input = document.createElement('input');
    input.type = 'range';
    input.dataset.key = key;
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(this.getNumericValue(key));
    const updateValue = () => {
      value.textContent = Number.parseFloat(input.value).toFixed(step < 1 ? 2 : 0);
    };
    updateValue();
    input.addEventListener('input', () => {
      updateValue();
      this.setNumericValue(key, Number.parseFloat(input.value));
      if (key === 'jawWidth') {
        console.warn('[JAW VALUE]', {
          uiValue: Number.parseFloat(input.value),
          appearanceValue: this.draft.profile?.jawWidth,
          appliedValue: this.isolatedFace?.config.jawWidth,
        });
      }
      this.preview.setAppearance(this.draft);
      this.syncFaceModelFromDraft();
      this.clearLegacyDiagnosticsState();
      this.resetView();
      this.logExpandedPartTransforms();
    });
    row.append(meta, value, input);
    return row;
  }

  private getNumericValue(key: NumericSliderKey): number {
    const profile = this.draft.profile ?? BODY_PROFILES[this.draft.bodyProfile ?? 'athleticMale'];
    const face = this.draft.face ?? FACE_PRESETS[this.draft.facePreset ?? 'male'];
    const outfit = this.draft.outfit ?? {
      sleeveLength: 1,
      collarHeight: 1,
      shirtFit: 1,
      shortsLength: 1,
      pantsFit: 0.9,
    };

    if (key in FACE_ADVANCED_DEFAULTS) {
      return (
        (face as Record<string, number | undefined>)[key] ??
        FACE_ADVANCED_DEFAULTS[key as FaceAdvancedKey]
      );
    }

    switch (key) {
      case 'headScale':
        return clampFaceParameterValue(
          'headScale',
          profile.headScale ?? FACE_PARAMETER_LIMITS.headScale.default
        );
      case 'jawWidth':
        return clampFaceParameterValue(
          'jawWidth',
          profile.jawWidth ?? FACE_PARAMETER_LIMITS.jawWidth.default
        );
      case 'chinShape':
        return clampFaceParameterValue(
          'chinShape',
          profile.chinShape ?? FACE_PARAMETER_LIMITS.chinShape.default
        );
      case 'brow':
        return clampFaceParameterValue('brow', face.brow ?? FACE_PARAMETER_LIMITS.brow.default);
      case 'nose':
        return clampFaceParameterValue('nose', face.nose ?? FACE_PARAMETER_LIMITS.nose.default);
      case 'eyeSpacing':
        return clampFaceParameterValue(
          'eyeSpacing',
          face.eyeSpacing ?? FACE_PARAMETER_LIMITS.eyeSpacing.default
        );
      case 'eyeSize':
        return clampFaceParameterValue(
          'eyeSize',
          face.eyeSize ?? FACE_PARAMETER_LIMITS.eyeSize.default
        );
      case 'mouth':
        return clampFaceParameterValue('mouth', face.mouth ?? FACE_PARAMETER_LIMITS.mouth.default);
      case 'beard':
        return clampFaceParameterValue('beard', face.beard ?? FACE_PARAMETER_LIMITS.beard.default);
      case 'stubble':
        return clampFaceParameterValue(
          'stubble',
          face.stubble ?? FACE_PARAMETER_LIMITS.stubble.default
        );
      case 'shoulderWidth':
        return profile.shoulderWidth;
      case 'torsoLength':
        return profile.torsoLength;
      case 'neckWidth':
        return profile.neckWidth;
      case 'neckLength':
        return profile.neckLength;
      case 'torsoTaper':
        return profile.torsoTaper;
      case 'hipWidth':
        return profile.hipWidth;
      case 'armThickness':
        return profile.armThickness;
      case 'armRaise':
        return profile.armRaise ?? 0;
      case 'legLength':
        return profile.legLength;
      case 'legTaper':
        return profile.legTaper;
      case 'sleeveLength':
        return outfit.sleeveLength;
      case 'collarHeight':
        return outfit.collarHeight;
      case 'shirtFit':
        return outfit.shirtFit;
      case 'shortsLength':
        return outfit.shortsLength;
      case 'pantsFit':
        return outfit.pantsFit;
      default:
        return 1;
    }
  }

  private setNumericValue(key: NumericSliderKey, value: number) {
    const nextProfile = {
      ...(this.draft.profile ?? BODY_PROFILES[this.draft.bodyProfile ?? 'athleticMale']),
    };
    const nextFace = { ...(this.draft.face ?? FACE_PRESETS[this.draft.facePreset ?? 'male']) };
    const nextOutfit = {
      ...(this.draft.outfit ?? {
        sleeveLength: 1,
        collarHeight: 1,
        shirtFit: 1,
        shortsLength: 1,
        pantsFit: 0.9,
      }),
    };

    if (key in FACE_ADVANCED_DEFAULTS) {
      (nextFace as Record<string, number>)[key] = value;
      this.draft.profile = nextProfile;
      this.draft.face = nextFace;
      this.draft.outfit = nextOutfit;
      return;
    }

    switch (key) {
      case 'headScale':
        nextProfile.headScale = clampFaceParameterValue('headScale', value);
        break;
      case 'jawWidth':
        nextProfile.jawWidth = clampFaceParameterValue('jawWidth', value);
        break;
      case 'chinShape':
        nextProfile.chinShape = clampFaceParameterValue('chinShape', value);
        break;
      case 'brow':
        nextFace.brow = clampFaceParameterValue('brow', value);
        break;
      case 'nose':
        nextFace.nose = clampFaceParameterValue('nose', value);
        break;
      case 'eyeSpacing':
        nextFace.eyeSpacing = clampFaceParameterValue('eyeSpacing', value);
        break;
      case 'eyeSize':
        nextFace.eyeSize = clampFaceParameterValue('eyeSize', value);
        break;
      case 'mouth':
        nextFace.mouth = clampFaceParameterValue('mouth', value);
        break;
      case 'beard':
        nextFace.beard = clampFaceParameterValue('beard', value);
        break;
      case 'stubble':
        nextFace.stubble = clampFaceParameterValue('stubble', value);
        break;
      case 'shoulderWidth':
        nextProfile.shoulderWidth = value;
        break;
      case 'torsoLength':
        nextProfile.torsoLength = value;
        break;
      case 'neckWidth':
        nextProfile.neckWidth = value;
        break;
      case 'neckLength':
        nextProfile.neckLength = value;
        break;
      case 'torsoTaper':
        nextProfile.torsoTaper = value;
        break;
      case 'hipWidth':
        nextProfile.hipWidth = value;
        break;
      case 'armThickness':
        nextProfile.armThickness = value;
        break;
      case 'armRaise':
        nextProfile.armRaise = value;
        break;
      case 'legLength':
        nextProfile.legLength = value;
        break;
      case 'legTaper':
        nextProfile.legTaper = value;
        break;
      case 'sleeveLength':
        nextOutfit.sleeveLength = value;
        break;
      case 'collarHeight':
        nextOutfit.collarHeight = value;
        break;
      case 'shirtFit':
        nextOutfit.shirtFit = value;
        break;
      case 'shortsLength':
        nextOutfit.shortsLength = value;
        break;
      case 'pantsFit':
        nextOutfit.pantsFit = value;
        break;
      default:
        break;
    }

    this.draft.profile = nextProfile;
    this.draft.face = nextFace;
    this.draft.outfit = nextOutfit;
  }

  private getColorValue(
    key: 'skinTone' | 'hairColor' | 'shirtColor' | 'shortsColor' | 'accentColor' | 'shoeColor'
  ): number {
    switch (key) {
      case 'skinTone':
        return this.draft.skinTone ?? DEFAULT_GOLFER_APPEARANCE.skinTone;
      case 'hairColor':
        return this.draft.hairColor ?? DEFAULT_GOLFER_APPEARANCE.hairColor;
      case 'shirtColor':
        return this.draft.shirtColor ?? DEFAULT_GOLFER_APPEARANCE.shirtColor;
      case 'shortsColor':
        return this.draft.shortsColor ?? DEFAULT_GOLFER_APPEARANCE.shortsColor;
      case 'accentColor':
        return this.draft.accentColor ?? DEFAULT_GOLFER_APPEARANCE.accentColor ?? 0xd72638;
      case 'shoeColor':
        return this.draft.shoeColor ?? DEFAULT_GOLFER_APPEARANCE.shoeColor;
      default:
        return DEFAULT_GOLFER_APPEARANCE.shirtColor;
    }
  }

  private setColorValue(
    key: 'skinTone' | 'hairColor' | 'shirtColor' | 'shortsColor' | 'accentColor' | 'shoeColor',
    value: number
  ) {
    switch (key) {
      case 'skinTone':
        this.draft.skinTone = value;
        break;
      case 'hairColor':
        this.draft.hairColor = value;
        break;
      case 'shirtColor':
        this.draft.shirtColor = value;
        break;
      case 'shortsColor':
        this.draft.shortsColor = value;
        break;
      case 'accentColor':
        this.draft.accentColor = value;
        break;
      case 'shoeColor':
        this.draft.shoeColor = value;
        break;
      default:
        break;
    }
  }

  private getSelectValue(
    key: 'bodyProfile' | 'hairStyle' | 'facePreset' | 'avatarModelId'
  ): string {
    if (key === 'bodyProfile') {
      return this.draft.bodyProfile ?? 'neutralLean';
    }
    if (key === 'hairStyle') {
      return this.draft.hairStyle ?? 'shortCrop';
    }
    if (key === 'avatarModelId') {
      return this.draft.avatarModelId === 'none'
        ? this.draft.facePreset === 'female'
          ? 'female'
          : 'male'
        : (this.draft.avatarModelId ?? 'male');
    }
    return this.draft.facePreset ?? 'neutral';
  }

  private syncDraftControls() {
    const controls = this.controlsWrap.querySelectorAll('select');
    controls.forEach((control) => {
      const key = control.dataset.key as 'bodyProfile' | 'hairStyle' | 'avatarModelId' | undefined;
      if (key) {
        control.value = this.getSelectValue(key);
      }
    });

    const sliders = this.controlsWrap.querySelectorAll<HTMLInputElement>('input[type="range"]');
    sliders.forEach((slider) => {
      const key = slider.dataset.key as Parameters<AppearanceModal['getNumericValue']>[0];
      if (key) {
        slider.value = String(this.getNumericValue(key));
        const output = slider.closest('.appearance-control')?.querySelector('output');
        if (output) {
          const step = Number(slider.step);
          output.textContent = Number.parseFloat(slider.value).toFixed(step < 1 ? 2 : 0);
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

  private frameBodyPreview(golferRoot: THREE.Object3D) {
    const bounds = new THREE.Box3().setFromObject(golferRoot);
    if (bounds.isEmpty()) {
      return;
    }

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bounds.getSize(size);
    bounds.getCenter(center);

    const target = center.clone();
    target.y += Math.max(0.03, size.y * 0.02);
    this.camera.aspect = this.previewHost.clientWidth / Math.max(this.previewHost.clientHeight, 1);
    this.camera.updateProjectionMatrix();

    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const paddingY = Math.max(0.18, size.y * 0.08);
    const paddingX = Math.max(0.24, size.x * 0.08);
    const paddedHeight = size.y + paddingY * 2;
    const paddedWidth = size.x + paddingX * 2;
    const distanceForHeight = paddedHeight / 2 / Math.tan(verticalFov / 2);
    const distanceForWidth = paddedWidth / 2 / (Math.tan(verticalFov / 2) * this.camera.aspect);
    const requiredDistance = Math.max(distanceForHeight, distanceForWidth) * 1.08;
    const distance = clamp(requiredDistance, 2.5, 8.5);
    const direction = new THREE.Vector3(0.06, 0.07, 1).normalize();

    this.camera.position.copy(target.clone().add(direction.multiplyScalar(distance)));
    this.camera.lookAt(target);
    this.cameraTarget.copy(target);

    if (import.meta.env.DEV) {
      console.log('[BODY PREVIEW BOUNDS]', {
        min: bounds.min.toArray(),
        max: bounds.max.toArray(),
        size: size.toArray(),
        center: center.toArray(),
        cameraFov: this.camera.fov,
        cameraAspect: this.camera.aspect,
        fitDistance: distance,
        cameraPosition: this.camera.position.toArray(),
        target: target.toArray(),
      });
    }
  }

  private getFaceYaw(orientation: FacePreviewOrientation): number {
    switch (orientation) {
      case 'front':
        return 0;
      case 'left':
        return Math.PI / 2;
      case 'right':
        return -Math.PI / 2;
      case 'back':
        return Math.PI;
      default:
        return 0;
    }
  }

  private resetView() {
    this.camera.fov = this.view === 'face' ? 30 : 35;
    this.camera.updateProjectionMatrix();

    if (this.view === 'look') {
      this.frameBodyPreview(this.preview.root);
      this.preview.root.rotation.x = 0;
      // Orientation buttons rotate the BODY too, so Front/Back/Left/Right are
      // consistent between Face and Body modes.
      this.preview.root.rotation.y = this.getFaceYaw(this.facePreviewOrientation);
      this.preview.root.rotation.z = 0;
      this.isolatedFaceRoot.rotation.set(0, 0, 0);
      this.updateHeaderOrientationButtons();
      this.updateEditingLabel();
      this.updateFaceGuidesVisibility();
      return;
    }

    this.frameFacePortrait();
    this.preview.root.rotation.set(0, 0, 0);
    this.isolatedFaceRoot.rotation.x = 0;
    this.isolatedFaceRoot.rotation.y = this.getFaceYaw(this.facePreviewOrientation);
    this.isolatedFaceRoot.rotation.z = 0;
    this.updateHeaderOrientationButtons();
    this.updateEditingLabel();
    this.updateFaceGuidesVisibility();
  }

  private frameFacePortrait() {
    const headPart = this.isolatedFaceRoot.getObjectByName('head-part');
    const faceBox = new THREE.Box3().setFromObject(this.isolatedFaceRoot);
    if (faceBox.isEmpty()) {
      return;
    }

    const size = faceBox.getSize(new THREE.Vector3());
    const target =
      headPart?.getWorldPosition(new THREE.Vector3()) ?? faceBox.getCenter(new THREE.Vector3());

    const aspect = this.previewHost.clientWidth / Math.max(this.previewHost.clientHeight, 1);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const fitHeight = size.y * 0.62;
    const fitWidth = size.x * 0.62;
    const distanceFromHeight = fitHeight / 2 / Math.tan(fov / 2);
    const distanceFromWidth = fitWidth / 2 / (Math.tan(fov / 2) * aspect);
    const distance = clamp(Math.max(distanceFromHeight, distanceFromWidth) * 1.05, 0.5, 3.5);

    this.camera.position.copy(target.clone().add(new THREE.Vector3(0, 0, distance)));
    this.camera.lookAt(target);
    this.cameraTarget.copy(target);
  }

  private animate = () => {
    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(this.animate);
  };

  private applyModeToggle() {
    this.clearLegacyDiagnosticsState();
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
    this.syncFaceModelFromDraft();
    this.syncPreviewVisibility();
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
