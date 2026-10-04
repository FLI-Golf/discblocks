// Lightweight inline appearance editor (collapsible Face/Body sections) that
// edits an existing Golfer's appearance directly — NO separate 3D preview.
// Used by the dev rig-test page for tandem appearance+pose editing.
import * as THREE from 'three';
import {
  BODY_PROFILES,
  FACE_ADVANCED_DEFAULTS,
  FACE_PARAMETER_LIMITS,
  FACE_PRESETS,
  clampFaceParameterValue,
  type FaceAdvancedKey,
  type Golfer,
  type GolferAppearance,
} from '@/rendering/Golfer';
import { GolferPoseTarget, type GolferPose } from '@/rendering/avatar';

type Key = string;

// Pose control values in DEGREES; converted to radians when applying.
interface PoseState {
  lAbduction: number;
  lFlexion: number;
  lElbow: number;
  rAbduction: number;
  rFlexion: number;
  rElbow: number;
  headYaw: number;
  headPitch: number;
  lHipFlex: number;
  lHipAbd: number;
  lKnee: number;
  rHipFlex: number;
  rHipAbd: number;
  rKnee: number;
}

export class AppearancePanel {
  private readonly root: HTMLDivElement;
  private appearance: GolferAppearance;
  private expanded: string | null = null;
  private readonly golfer: Golfer;
  private readonly onChange?: () => void;
  private readonly poseTarget: GolferPoseTarget;
  // When true the panel drives the pose itself (shoulder-test). When false
  // (master), the host owns the authoritative pose draft and the panel just
  // notifies so the host can re-apply it after the rig rebuild.
  private readonly ownsPose: boolean;
  private readonly pose: PoseState = {
    lAbduction: 0,
    lFlexion: 0,
    lElbow: 0,
    rAbduction: 0,
    rFlexion: 0,
    rElbow: 0,
    headYaw: 0,
    headPitch: 0,
    lHipFlex: 0,
    lHipAbd: 0,
    lKnee: 0,
    rHipFlex: 0,
    rHipAbd: 0,
    rKnee: 0,
  };

  constructor(container: HTMLElement, golfer: Golfer, onChange?: () => void, ownsPose = true) {
    this.golfer = golfer;
    this.onChange = onChange;
    this.ownsPose = ownsPose;
    this.appearance = golfer.appearance;
    this.poseTarget = new GolferPoseTarget(golfer);
    this.root = document.createElement('div');
    this.root.className = 'appearance-inline';
    container.appendChild(this.root);
    this.build();
  }

  // Re-read the golfer's appearance and rebuild the controls. Used by hosts
  // that replace the appearance wholesale (e.g. reloading a saved baseline).
  refreshFromGolfer() {
    this.appearance = this.golfer.appearance;
    this.root.innerHTML = '';
    this.build();
  }

  // Apply the current pose through the adapter (semantic -> rig). When the
  // host owns the pose (master), defer to the host via onChange instead of
  // overwriting with this panel's internal zero-pose.
  private applyPose() {
    if (!this.ownsPose) {
      this.onChange?.();
      return;
    }
    const d = THREE.MathUtils.degToRad;
    const p = this.pose;
    const pose: GolferPose = {
      id: 'dev/change-look-pose',
      name: 'Change Look Pose',
      leftShoulder: { abduction: d(p.lAbduction), flexion: d(p.lFlexion) },
      leftElbow: { flexion: d(p.lElbow) },
      rightShoulder: { abduction: d(p.rAbduction), flexion: d(p.rFlexion) },
      rightElbow: { flexion: d(p.rElbow) },
      head: { yaw: d(p.headYaw), pitch: d(p.headPitch) },
      leftHip: { flexion: d(p.lHipFlex), abduction: d(p.lHipAbd) },
      leftKnee: { flexion: d(p.lKnee) },
      rightHip: { flexion: d(p.rHipFlex), abduction: d(p.rHipAbd) },
      rightKnee: { flexion: d(p.rKnee) },
    };
    this.golfer.applyPoseBaseline();
    this.poseTarget.applyPose(pose);
    this.onChange?.();
  }

  private profile() {
    return this.appearance.profile ?? BODY_PROFILES[this.appearance.bodyProfile ?? 'athleticMale'];
  }

  private face() {
    return this.appearance.face ?? FACE_PRESETS[this.appearance.facePreset ?? 'male'];
  }

  private setNum(key: Key, value: number) {
    const nextProfile = { ...this.profile() } as Record<string, unknown>;
    const nextFace = { ...this.face() } as Record<string, unknown>;
    if (key in FACE_ADVANCED_DEFAULTS) {
      nextFace[key] = value;
    } else if (key in FACE_PARAMETER_LIMITS) {
      const k = key as keyof typeof FACE_PARAMETER_LIMITS;
      const v = clampFaceParameterValue(k, value);
      if (k === 'headScale' || k === 'jawWidth' || k === 'chinShape') {
        nextProfile[key] = v;
      } else {
        nextFace[key] = v;
      }
    } else {
      nextProfile[key] = value;
    }
    this.appearance = {
      ...this.appearance,
      profile: nextProfile as unknown as GolferAppearance['profile'],
      face: nextFace as unknown as GolferAppearance['face'],
    };
    this.apply();
  }

  private setColor(
    key: 'skinTone' | 'hairColor' | 'shirtColor' | 'shortsColor' | 'shoeColor' | 'accentColor',
    hex: string
  ) {
    this.appearance = { ...this.appearance, [key]: Number.parseInt(hex.slice(1), 16) };
    this.apply();
  }

  private apply() {
    this.golfer.setAppearance(this.appearance);
    this.onChange?.();
  }

  private slider(
    label: string,
    key: Key,
    min: number,
    max: number,
    step: number,
    get: () => number
  ): HTMLElement {
    const row = document.createElement('label');
    row.className = 'appearance-control';
    const span = document.createElement('span');
    span.textContent = label;
    const out = document.createElement('output');
    out.textContent = get().toFixed(step < 0.01 ? 3 : 2);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(get());
    input.addEventListener('input', () => {
      const v = Number(input.value);
      out.textContent = v.toFixed(step < 0.01 ? 3 : 2);
      this.setNum(key, v);
    });
    row.append(span, out, input);
    return row;
  }

  private poseSlider(label: string, key: keyof PoseState, min: number, max: number): HTMLElement {
    const row = document.createElement('label');
    row.className = 'appearance-control';
    const span = document.createElement('span');
    span.textContent = label;
    const out = document.createElement('output');
    out.textContent = `${this.pose[key]}°`;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = '1';
    input.value = String(this.pose[key]);
    input.addEventListener('input', () => {
      this.pose[key] = Number(input.value);
      out.textContent = `${input.value}°`;
      this.applyPose();
    });
    row.append(span, out, input);
    return row;
  }

  private color(
    label: string,
    key: 'skinTone' | 'hairColor' | 'shirtColor' | 'shortsColor' | 'shoeColor' | 'accentColor',
    get: () => number
  ): HTMLElement {
    const row = document.createElement('label');
    row.className = 'appearance-control';
    const span = document.createElement('span');
    span.textContent = label;
    const input = document.createElement('input');
    input.type = 'color';
    input.value = '#' + get().toString(16).padStart(6, '0');
    input.addEventListener('input', () => this.setColor(key, input.value));
    row.append(span, input);
    return row;
  }

  private hairStyleSelect(): HTMLElement {
    const row = document.createElement('label');
    row.className = 'appearance-control';
    row.style.gridTemplateColumns = '1fr auto';
    const span = document.createElement('span');
    span.textContent = 'Style';
    const sel = document.createElement('select');
    sel.style.cssText =
      'padding:4px 8px;border-radius:6px;border:1px solid rgba(255,213,74,.3);background:rgba(10,17,28,.96);color:#edf4ff;';
    const styles: Array<[string, string]> = [['buzzCut', 'Buzz Cut']];
    for (const [value, label] of styles) {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = label;
      sel.appendChild(o);
    }
    sel.value = this.appearance.hairStyle ?? 'sidePart';
    sel.addEventListener('change', () => {
      this.appearance = {
        ...this.appearance,
        hairStyle: sel.value as GolferAppearance['hairStyle'],
      };
      this.apply();
    });
    row.append(span, sel);
    return row;
  }

  private section(
    id: string,
    title: string,
    summary: string,
    build: (c: HTMLElement) => void
  ): HTMLElement {
    const section = document.createElement('div');
    section.className = 'face-section';
    section.dataset.section = id;
    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'face-section-header';
    const t = document.createElement('span');
    t.className = 'face-section-title';
    t.textContent = title;
    const sum = document.createElement('span');
    sum.className = 'face-section-summary';
    sum.textContent = summary;
    const chev = document.createElement('span');
    chev.className = 'face-section-chevron';
    chev.textContent = this.expanded === id ? '▾' : '▸';
    header.append(t, sum, chev);
    section.appendChild(header);
    const content = document.createElement('div');
    content.className = 'face-section-content';
    content.hidden = this.expanded !== id;
    build(content);
    section.appendChild(content);
    header.addEventListener('click', () => {
      this.expanded = this.expanded === id ? null : id;
      this.root.querySelectorAll<HTMLElement>('.face-section').forEach((s) => {
        const open = s.dataset.section === this.expanded;
        const c = s.querySelector<HTMLElement>('.face-section-content');
        const ch = s.querySelector<HTMLElement>('.face-section-chevron');
        if (c) c.hidden = !open;
        if (ch) ch.textContent = open ? '▾' : '▸';
      });
    });
    return section;
  }

  private heading(label: string): HTMLElement {
    const d = document.createElement('div');
    d.className = 'appearance-face-group-heading';
    d.textContent = label;
    return d;
  }

  private build() {
    const p = this.profile();
    const f = this.face();
    const adv = (k: FaceAdvancedKey) =>
      (f as Record<string, number | undefined>)[k] ?? FACE_ADVANCED_DEFAULTS[k];
    const scale = (label: string, k: FaceAdvancedKey) =>
      this.slider(label, k, 0.1, 2.5, 0.01, () => adv(k));
    const pos = (label: string, k: FaceAdvancedKey) =>
      this.slider(label, k, -0.5, 0.5, 0.005, () => adv(k));
    const macro = (label: string, k: keyof typeof FACE_PARAMETER_LIMITS, get: () => number) =>
      this.slider(
        label,
        k,
        FACE_PARAMETER_LIMITS[k].min,
        FACE_PARAMETER_LIMITS[k].max,
        FACE_PARAMETER_LIMITS[k].step,
        get
      );

    // FACE sections
    const faceWrap = document.createElement('div');
    faceWrap.append(
      this.heading('Face Shape'),
      this.section('head', 'Head', p.headScale.toFixed(2), (c) => {
        c.append(
          macro('Scale', 'headScale', () => this.profile().headScale),
          scale('Width', 'headWidth'),
          scale('Height', 'headHeight'),
          scale('Depth', 'headDepth'),
          pos('Vertical', 'headPositionY'),
          pos('Forward / Back', 'headPositionZ')
        );
      }),
      this.section('cheeks', 'Cheeks', adv('cheekSize').toFixed(2), (c) => {
        c.append(
          scale('Size', 'cheekSize'),
          scale('Width', 'cheekWidth'),
          scale('Height', 'cheekHeight'),
          scale('Depth', 'cheekDepth'),
          scale('Spacing', 'cheekSpacing'),
          pos('Vertical', 'cheekPositionY'),
          pos('Forward / Back', 'cheekPositionZ')
        );
      }),
      this.section('jaw', 'Jaw', p.jawWidth.toFixed(2), (c) => {
        c.append(
          macro('Main', 'jawWidth', () => this.profile().jawWidth),
          scale('Height', 'jawHeight'),
          scale('Depth', 'jawDepth'),
          pos('Vertical', 'jawPositionY'),
          pos('Forward / Back', 'jawPositionZ')
        );
      }),
      this.section('chin', 'Chin', p.chinShape.toFixed(2), (c) => {
        c.append(
          macro('Prominence', 'chinShape', () => this.profile().chinShape),
          scale('Size', 'chinSize'),
          scale('Width', 'chinWidth'),
          scale('Height', 'chinHeight'),
          scale('Depth', 'chinDepth'),
          pos('Vertical', 'chinPositionY'),
          pos('Forward / Back', 'chinPositionZ')
        );
      }),
      this.heading('Features'),
      this.section('eyes', 'Eyes', (f.eyeSize ?? 1).toFixed(2), (c) => {
        c.append(
          macro('Size', 'eyeSize', () => this.face().eyeSize ?? 1),
          scale('Width', 'eyeWidth'),
          scale('Height', 'eyeHeight'),
          scale('Depth', 'eyeDepth'),
          macro('Spacing', 'eyeSpacing', () => this.face().eyeSpacing),
          pos('Vertical', 'eyePositionY'),
          pos('Forward / Back', 'eyePositionZ')
        );
      }),
      this.section('nose', 'Nose', f.nose.toFixed(2), (c) => {
        c.append(
          macro('Size', 'nose', () => this.face().nose),
          scale('Width', 'noseWidth'),
          scale('Height', 'noseHeight'),
          scale('Depth', 'noseDepth'),
          pos('Vertical', 'nosePositionY'),
          pos('Forward / Back', 'nosePositionZ')
        );
      }),
      this.section('mouth', 'Mouth', f.mouth.toFixed(2), (c) => {
        c.append(
          macro('Size', 'mouth', () => this.face().mouth),
          scale('Width', 'mouthWidth'),
          scale('Height', 'mouthHeight'),
          scale('Depth', 'mouthDepth'),
          scale('Lip Fullness', 'mouthFullness'),
          pos('Vertical', 'mouthPositionY'),
          pos('Forward / Back', 'mouthPositionZ'),
          this.slider('Corner Angle', 'mouthCornerAngle', -30, 30, 1, () =>
            adv('mouthCornerAngle')
          ),
          this.slider('Opening', 'mouthOpening', 0, 1, 0.01, () => adv('mouthOpening'))
        );
      }),
      this.section('brows', 'Brows', f.brow.toFixed(2), (c) => {
        c.append(
          macro('Size', 'brow', () => this.face().brow),
          scale('Width', 'browWidth'),
          scale('Thickness', 'browThickness'),
          scale('Spacing', 'browSpacing'),
          pos('Vertical', 'browPositionY'),
          this.slider('Angle', 'browAngle', -45, 45, 1, () => adv('browAngle')),
          this.slider('Arch', 'browArch', -1, 1, 0.01, () => adv('browArch')),
          pos('Inner Height', 'browInnerHeight'),
          pos('Outer Height', 'browOuterHeight'),
          pos('Inner Fwd / Back', 'browInnerForward'),
          pos('Outer Fwd / Back', 'browOuterForward')
        );
      }),
      this.heading('Facial Hair'),
      this.section('facialHair', 'Facial Hair', f.beard.toFixed(2), (c) => {
        c.append(
          macro('Beard', 'beard', () => this.face().beard),
          macro('Stubble', 'stubble', () => this.face().stubble)
        );
      }),
      this.heading('Hair'),
      this.section('hair', 'Hair', '', (c) => {
        c.append(this.hairStyleSelect());
        c.append(
          scale('Scale', 'hairScale'),
          scale('Width', 'hairWidth'),
          scale('Height', 'hairHeight'),
          scale('Depth', 'hairDepth'),
          pos('Vertical', 'hairPositionY'),
          pos('Forward / Back', 'hairPositionZ'),
          this.color('Color', 'hairColor', () => this.appearance.hairColor)
        );
        const crownLbl = document.createElement('div');
        crownLbl.className = 'ftitle';
        crownLbl.textContent = 'Crown (Front / Top)';
        c.appendChild(crownLbl);
        c.append(
          scale('Crown Width', 'hairCrownWidth'),
          scale('Crown Height', 'hairCrownHeight'),
          scale('Crown Depth', 'hairCrownDepth'),
          this.slider('Top Grow In', 'hairCrownGrowIn', 0.5, 2.0, 0.01, () =>
            adv('hairCrownGrowIn')
          )
        );
        const backLbl = document.createElement('div');
        backLbl.className = 'ftitle';
        backLbl.textContent = 'Back';
        c.appendChild(backLbl);
        c.append(
          scale('Back Width', 'hairBackWidth'),
          scale('Back Height', 'hairBackHeight'),
          scale('Back Depth', 'hairBackDepth'),
          this.slider('Back Grow In', 'hairBackGrowIn', 0.5, 2.0, 0.01, () =>
            adv('hairBackGrowIn')
          ),
          scale('Back Length', 'backHairLength')
        );
        const sideLbl = document.createElement('div');
        sideLbl.className = 'ftitle';
        sideLbl.textContent = 'Sides / Sideburns';
        c.appendChild(sideLbl);
        c.append(
          scale('Side Width', 'hairSideWidth'),
          scale('Side Height', 'hairSideHeight'),
          scale('Side Depth', 'hairSideDepth'),
          scale('Sideburn Length', 'sideburnLength'),
          scale('Sideburn Width', 'sideburnWidth')
        );
      }),
      this.heading('Ears'),
      this.section('ears', 'Ears', '', (c) => {
        c.append(
          scale('Size', 'earSize'),
          scale('Prominence (Stick Out)', 'earProminence'),
          scale('Spacing (In / Out)', 'earSpacing'),
          pos('Vertical', 'earVertical')
        );
      }),
      this.heading('Skin'),
      this.color('Skin tone', 'skinTone', () => this.appearance.skinTone)
    );

    // BODY sections
    const bodyWrap = document.createElement('div');
    bodyWrap.append(
      this.section('torso', 'Torso', '', (c) => {
        c.append(
          this.slider('Length', 'torsoLength', 0.5, 1.5, 0.01, () => this.profile().torsoLength),
          this.slider(
            'Width / Taper',
            'torsoTaper',
            0.4,
            1.4,
            0.01,
            () => this.profile().torsoTaper
          ),
          this.color('Shirt color', 'shirtColor', () => this.appearance.shirtColor),
          this.color('Accent color', 'accentColor', () => this.appearance.accentColor ?? 0xd72638)
        );
      }),
      this.section('shoulders', 'Shoulders', '', (c) => {
        c.append(
          this.slider('Width', 'shoulderWidth', 0.5, 1.5, 0.01, () => this.profile().shoulderWidth)
        );
      }),
      this.section('arms', 'Arms', '', (c) => {
        c.append(
          this.slider(
            'Thickness',
            'armThickness',
            0.5,
            1.6,
            0.01,
            () => this.profile().armThickness
          )
        );
      }),
      this.section('legs', 'Hips / Legs', '', (c) => {
        c.append(
          this.slider('Hip width', 'hipWidth', 0.5, 1.5, 0.01, () => this.profile().hipWidth),
          this.slider('Leg length', 'legLength', 0.6, 1.5, 0.01, () => this.profile().legLength),
          this.slider('Leg taper', 'legTaper', 0.5, 1.5, 0.01, () => this.profile().legTaper),
          this.color('Shorts color', 'shortsColor', () => this.appearance.shortsColor)
        );
      }),
      this.section('feet', 'Feet', '', (c) => {
        c.append(this.color('Shoe color', 'shoeColor', () => this.appearance.shoeColor));
      })
    );

    // POSE sections (anatomical rig controls, degrees, via GolferPoseTarget)
    const poseWrap = document.createElement('div');
    poseWrap.append(
      this.section('leftArm', 'Left Arm', '', (c) => {
        c.append(
          this.poseSlider('Out / In', 'lAbduction', 0, 140),
          this.poseSlider('Forward / Back', 'lFlexion', -40, 140),
          this.poseSlider('Elbow Bend', 'lElbow', 0, 140)
        );
      }),
      this.section('rightArm', 'Right Arm', '', (c) => {
        c.append(
          this.poseSlider('Out / In', 'rAbduction', 0, 140),
          this.poseSlider('Forward / Back', 'rFlexion', -40, 140),
          this.poseSlider('Elbow Bend', 'rElbow', 0, 140)
        );
      }),
      this.section('head', 'Head', '', (c) => {
        c.append(
          this.poseSlider('Face Left / Right', 'headYaw', -80, 80),
          this.poseSlider('Look Up / Down', 'headPitch', -50, 50)
        );
      }),
      this.section('leftLeg', 'Left Leg', '', (c) => {
        c.append(
          this.poseSlider('Step Fwd / Back', 'lHipFlex', -60, 90),
          this.poseSlider('Leg Out / In', 'lHipAbd', 0, 60),
          this.poseSlider('Knee Bend', 'lKnee', 0, 120)
        );
      }),
      this.section('rightLeg', 'Right Leg', '', (c) => {
        c.append(
          this.poseSlider('Step Fwd / Back', 'rHipFlex', -60, 90),
          this.poseSlider('Leg Out / In', 'rHipAbd', 0, 60),
          this.poseSlider('Knee Bend', 'rKnee', 0, 120)
        );
      })
    );

    // Face/Body/Pose toggle
    const toggle = document.createElement('div');
    toggle.className = 'appearance-mode-toggle';
    const faceBtn = document.createElement('button');
    faceBtn.textContent = 'Face';
    faceBtn.className = 'appearance-mode-button is-active';
    const bodyBtn = document.createElement('button');
    bodyBtn.textContent = 'Body';
    bodyBtn.className = 'appearance-mode-button';
    const poseBtn = document.createElement('button');
    poseBtn.textContent = 'Pose';
    poseBtn.className = 'appearance-mode-button';
    const show = (mode: 'face' | 'body' | 'pose') => {
      faceWrap.hidden = mode !== 'face';
      bodyWrap.hidden = mode !== 'body';
      poseWrap.hidden = mode !== 'pose';
      faceBtn.classList.toggle('is-active', mode === 'face');
      bodyBtn.classList.toggle('is-active', mode === 'body');
      poseBtn.classList.toggle('is-active', mode === 'pose');
    };
    faceBtn.addEventListener('click', () => show('face'));
    bodyBtn.addEventListener('click', () => show('body'));
    poseBtn.addEventListener('click', () => show('pose'));
    toggle.append(faceBtn, bodyBtn, poseBtn);

    bodyWrap.hidden = true;
    poseWrap.hidden = true;
    this.root.append(toggle, faceWrap, bodyWrap, poseWrap);
  }
}
