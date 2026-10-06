// MASTER AVATAR — permanent avatar rig & pose authoring workspace.
// Uses the SAME procedural Golfer as gameplay. Semantic controls flow:
//   Body Feature control -> GolferPose -> GolferPoseTarget -> Golfer rig.
// The UI never directly mutates Three.js joints.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Golfer, DEFAULT_GOLFER_APPEARANCE } from '@/rendering/Golfer';
import { GolferPoseTarget, PoseLibrary, type GolferPose } from '@/rendering/avatar';
import {
  DefaultAvatarFactory,
  LocalStorageBaselineRepository,
  type MaleBaselineDraft,
} from '@/rendering/avatar/authoring';
import { AppearancePanel } from '@/ui/AppearancePanel';
import { DEFAULT_BRANDING, resolveBranding } from '@/game/branding';
import { AuthoringSlider } from './masterAuthoring';

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  // Surface WebGL context-creation failure visibly instead of a blank canvas.
  const el = document.getElementById('camdebug');
  if (el) el.textContent = 'WEBGL UNAVAILABLE: ' + (e as Error).message;
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// Surface the actual GL renderer once so we can diagnose blank-canvas issues
// in real browsers (headless SwiftShader works, hardware GL may differ).
const glCtx = renderer.getContext();
const glRendererStr = glCtx.getParameter(glCtx.RENDERER);
console.info('[MASTER GL]', glRendererStr);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1726);
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(2, 4, 3);
scene.add(key);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

// Free mouse orbit around the avatar. The Front/Left/Right/Back buttons still
// snap to canonical views; dragging orbits freely. Orbit target is updated by
// frameCamera so zoom/orbit stay centered on the golfer.
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.enablePan = false;
orbit.minDistance = 2;
orbit.maxDistance = 40;
// frameCamera owns camera position when snapping to a preset view.
let orbitDirty = false;
orbit.addEventListener('start', () => {
  orbitDirty = true;
});

const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
// Seed the uniform from resolved DEFAULT branding (no team assigned).
golfer.applyBranding(resolveBranding(null));
scene.add(golfer.root);

// ---- Diagnostic visibility (DEV-ONLY editor state) ----
// Lives ONLY here in the /master page — never in BodyProfile, appearance,
// draft, pose, team, or branding. Not persisted; page reload resets it.
const diagnosticVisibility = { hideBelt: false, hideShorts: false, hideJersey: false };

// Meshes that carry the jersey CanvasTexture AND provide the torso/waist body
// form, plus the accent clothing pieces (collar/placket) that would otherwise
// stay red. We keep the body-form meshes VISIBLE but neutralize texture/accent
// color for a readable body. collar/placket have no map (map=null) — only their
// color is stashed/neutralized/restored.
const JERSEY_MESHES = [
  'torso-part',
  'lower-torso-part',
  'sleeve-left',
  'sleeve-right',
  'collar-part',
  'placket-part',
];
const INSPECTION_COLOR = 0xd9b8a6; // neutral skin inspection tone

// Bypass (or restore) the jersey texture on the body-form meshes. The original
// map/color are stashed on material.userData so OFF restores them exactly. A
// rebuild creates fresh materials (with the map), so re-running this after a
// rebuild re-applies the bypass cleanly.
function applyJerseyInspection() {
  for (const name of JERSEY_MESHES) {
    const mesh = golfer.root.getObjectByName(name) as THREE.Mesh | undefined;
    if (!mesh) continue;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (!mat) continue;
    if (diagnosticVisibility.hideJersey) {
      if (!mat.userData.__diagStash) {
        mat.userData.__diagStash = { map: mat.map, color: mat.color.getHex() };
      }
      mat.map = null;
      mat.color.setHex(INSPECTION_COLOR);
      mat.needsUpdate = true;
    } else if (mat.userData.__diagStash) {
      const stash = mat.userData.__diagStash as { map: THREE.Texture | null; color: number };
      mat.map = stash.map;
      mat.color.setHex(stash.color);
      mat.needsUpdate = true;
      delete mat.userData.__diagStash;
    }
  }
}

// Resolve the CURRENT garment groups from the CURRENT rig (never retain stale
// references across rebuilds) and apply the diagnostic visibility state.
function applyDiagnosticVisibility() {
  const belt = golfer.root.getObjectByName('belt-root');
  if (belt) belt.visible = !diagnosticVisibility.hideBelt;
  const shorts = golfer.root.getObjectByName('shorts-root');
  if (shorts) shorts.visible = !diagnosticVisibility.hideShorts;
  applyJerseyInspection();
}

// setAppearance() rebuilds the rig, recreating belt-root/shorts-root visible.
// Wrap it once so EVERY rebuild (from any call site) reapplies the diagnostic
// visibility afterward — hidden garments stay hidden across slider changes.
const _setAppearance = golfer.setAppearance.bind(golfer);
golfer.setAppearance = (appearance: typeof golfer.appearance) => {
  _setAppearance(appearance);
  applyDiagnosticVisibility();
  applyFaceDiagnosticVisibility();
};

// ---- FACE diagnostic visibility (DEV-ONLY editor state) ----
// Same lesson as the body diagnostics: a central editor-only state, one apply
// function that re-resolves CURRENT objects from the CURRENT hierarchy, and a
// reapply hook after every rebuild. Never serialized into saved appearance,
// baseline, profile, or pose.
// Individual per-feature hide overrides + a mutually-exclusive inspection MODE.
// The mode NEVER rewrites the individual overrides — final visibility = mode
// rules + individual overrides. Individual state is preserved across mode swaps
// and rebuilds. Editor-only; never serialized.
type FaceInspectionMode = 'normal' | 'face-only' | 'head-shell-only';
const faceDiagnosticVisibility = {
  mode: 'normal' as FaceInspectionMode,
  hideHair: false,
  hideFacialHair: false,
  hideEars: false,
  hideBrows: false,
  hideEyes: false,
  hideNose: false,
  hideMouth: false,
  hideCheeks: false,
  hideJaw: false,
  hideChin: false,
};

// Object groups resolved from the live face hierarchy (audited, not assumed).
const FACE_GROUPS: Record<string, string[]> = {
  hideEars: ['ear-left', 'ear-right'],
  hideBrows: ['brow-left', 'brow-right'],
  hideEyes: [
    'eye-white-left',
    'eye-white-right',
    'iris-left',
    'iris-right',
    'eyelid-left',
    'eyelid-right',
  ],
  hideNose: ['nose-part'],
  hideMouth: ['mouth-part'],
  hideCheeks: ['cheek-left', 'cheek-right'],
  hideJaw: ['jaw-part'],
  hideFacialHair: ['beard-part', 'stubble-part'],
};

function setVisible(name: string, visible: boolean) {
  const obj = golfer.root.getObjectByName(name);
  if (obj) obj.visible = visible;
}

function applyFaceDiagnosticVisibility() {
  const s = faceDiagnosticVisibility;
  const mode = s.mode;
  // Per-feature hidden = individual override OR the mode's hide-set.
  const hideHair = s.hideHair || mode !== 'normal';
  const hideFacial = s.hideFacialHair || mode !== 'normal';
  const hideEars = s.hideEars || mode !== 'normal';
  const hideBrows = s.hideBrows || mode === 'head-shell-only';
  const hideEyes = s.hideEyes || mode === 'head-shell-only';
  const hideNose = s.hideNose || mode === 'head-shell-only';
  const hideMouth = s.hideMouth || mode === 'head-shell-only';
  const hideCheeks = s.hideCheeks || mode === 'head-shell-only';
  const hideJaw = s.hideJaw || mode === 'head-shell-only';
  // (chin is part of the jaw mesh in this procedural head; no separate mesh.)

  const hair = golfer.root.getObjectByName('hair-root');
  if (hair) hair.visible = !hideHair;
  FACE_GROUPS.hideFacialHair.forEach((n) => setVisible(n, !hideFacial));
  FACE_GROUPS.hideEars.forEach((n) => setVisible(n, !hideEars));
  FACE_GROUPS.hideBrows.forEach((n) => setVisible(n, !hideBrows));
  FACE_GROUPS.hideEyes.forEach((n) => setVisible(n, !hideEyes));
  setVisible('nose-part', !hideNose);
  setVisible('mouth-part', !hideMouth);
  FACE_GROUPS.hideCheeks.forEach((n) => setVisible(n, !hideCheeks));
  setVisible('jaw-part', !hideJaw);
  // chin is a sub-region of the jaw mesh in this procedural head (no separate
  // chin mesh) — hideChin maps onto the jaw detail region only when one exists.
}

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(6, 32),
  new THREE.MeshStandardMaterial({ color: 0x0f1c2e })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const poseTarget = new GolferPoseTarget(golfer);

// Registered UI controls so Reset Draft can re-sync every slider.
const poseSliders: Array<() => void> = [];
const appearanceSliders: Array<() => void> = [];

// ---- Current draft pose (degrees in UI -> radians in GolferPose) ----
const draft = {
  lAbduction: 0,
  rAbduction: 0,
  lFlexion: 0,
  rFlexion: 0,
  lTwist: 0,
  rTwist: 0,
  lElbow: 0,
  rElbow: 0,
  lHipFlex: 0,
  lHipAbd: 0,
  lHipRot: 0,
  rHipRot: 0,
  lKnee: 0,
  rHipFlex: 0,
  rHipAbd: 0,
  rKnee: 0,
  torsoCoil: 0,
  torsoLean: 0,
  headYaw: 0,
  headPitch: 0,
  pelvisTurn: 0,
  pelvisTilt: 0,
  pelvisFlex: 0,
};
let camYaw = 0;
// Persisted pose library — saved poses survive page reloads.
const poseLibrary = new PoseLibrary('master-pose-library');

// ---- Authoring session: DEFAULT CREATION (mode is locked for this
// ---- milestone; Pose Creation arrives after the baseline is finalized) ----
// The draft is pure domain data — never serialized Three.js scene objects.
function captureBaselineDraft(): MaleBaselineDraft {
  return { appearance: structuredClone(golfer.appearance), pose: { ...draft } };
}

const baselineSession = new DefaultAvatarFactory(
  new LocalStorageBaselineRepository(window.localStorage)
).createSession(captureBaselineDraft());

// Apply the persisted working baseline's appearance immediately so every
// editor built below reads it.
golfer.setAppearance(structuredClone(baselineSession.getDraft().appearance));

function updateStatus() {
  const el = document.getElementById('save-status');
  if (!el) return;
  const s = baselineSession.status;
  el.textContent = s === 'unsaved' ? 'Unsaved Changes' : s === 'final' ? 'Final' : 'Saved';
  el.dataset.state = s;
}

// Visible confirmation that SAVE actually persisted — brief green flash.
let flashTimer: ReturnType<typeof setTimeout> | undefined;
function flashSaved() {
  const el = document.getElementById('save-status');
  if (!el) return;
  clearTimeout(flashTimer);
  el.textContent = `Saved ✓ ${new Date().toLocaleTimeString()}`;
  el.dataset.state = 'flash';
  flashTimer = setTimeout(() => updateStatus(), 2000);
}

function markEdited() {
  baselineSession.updateDraft(captureBaselineDraft());
  updateStatus();
}

// Push a session draft into the UI + golfer. Callers pass the session's own
// draft, so the session state stays the source of truth.
function applyBaselineDraft(d: MaleBaselineDraft) {
  // Merge the loaded profile over the CURRENT default profile so fields added
  // after the draft was saved (e.g. shorts/sock) get their defaults instead of
  // being dropped — otherwise their sliders reset and writes get clobbered.
  const mergedAppearance = structuredClone(d.appearance);
  mergedAppearance.profile = {
    ...DEFAULT_GOLFER_APPEARANCE.profile,
    ...mergedAppearance.profile,
  };
  golfer.setAppearance(mergedAppearance);
  Object.assign(draft, d.pose);
  poseSliders.forEach((sync) => sync());
  appearanceSliders.forEach((sync) => sync());
  applyDraft();
  frameCamera();
}

// Intentional confirmation for FINAL (never a bare window.confirm).
function confirmFinalize() {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  const box = document.createElement('div');
  box.className = 'confirm-box';
  const title = document.createElement('div');
  title.className = 'confirm-title';
  title.textContent = 'Finalize Male Baseline?';
  const body = document.createElement('div');
  body.className = 'confirm-body';
  body.textContent = 'This establishes the canonical baseline used by future poses.';
  const actions = document.createElement('div');
  actions.className = 'confirm-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'hbtn';
  cancel.textContent = 'Cancel';
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'hbtn';
  ok.style.borderColor = 'rgba(255,213,74,.5)';
  ok.style.color = '#ffd54a';
  ok.textContent = 'Finalize';
  cancel.addEventListener('click', () => overlay.remove());
  ok.addEventListener('click', () => {
    baselineSession.updateDraft(captureBaselineDraft());
    baselineSession.finalize();
    updateStatus();
    overlay.remove();
  });
  actions.append(cancel, ok);
  box.append(title, body, actions);
  overlay.appendChild(box);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

// Header actions. Default Creation: SAVE enabled, FINAL enabled, SAVE POSE
// disabled (mode safety — no cross-writing between baseline and pose data).
document.getElementById('btn-save')?.addEventListener('click', () => {
  baselineSession.updateDraft(captureBaselineDraft());
  baselineSession.save();
  flashSaved();
});
document.getElementById('btn-final')?.addEventListener('click', () => confirmFinalize());

// Build a semantic GolferPose from the current draft (degrees -> radians).
function draftToPose(id: string, name: string): GolferPose {
  const d = THREE.MathUtils.degToRad;
  return {
    id,
    name,
    leftShoulder: {
      abduction: d(draft.lAbduction),
      flexion: d(draft.lFlexion),
      rotation: d(draft.lTwist),
    },
    rightShoulder: {
      abduction: d(draft.rAbduction),
      flexion: d(draft.rFlexion),
      rotation: d(draft.rTwist),
    },
    leftElbow: { flexion: d(draft.lElbow) },
    rightElbow: { flexion: d(draft.rElbow) },
    leftHip: {
      flexion: d(draft.lHipFlex),
      abduction: d(draft.lHipAbd),
      rotation: d(draft.lHipRot),
    },
    leftKnee: { flexion: d(draft.lKnee) },
    rightHip: {
      flexion: d(draft.rHipFlex),
      abduction: d(draft.rHipAbd),
      rotation: d(draft.rHipRot),
    },
    rightKnee: { flexion: d(draft.rKnee) },
    torso: { rotation: d(draft.torsoCoil), lean: d(draft.torsoLean) },
    pelvis: {
      rotation: d(draft.pelvisTurn),
      lateralTilt: d(draft.pelvisTilt),
      flexion: d(draft.pelvisFlex),
    },
    head: { yaw: d(draft.headYaw), pitch: d(draft.headPitch) },
  };
}

function applyPose(pose: GolferPose) {
  golfer.applyPoseBaseline();
  poseTarget.applyPose(pose);
}

function applyDraft() {
  applyPose(draftToPose('dev/master-draft', 'Master Draft'));
}

// ---- Full-body camera fit ----
function frameCamera() {
  golfer.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(golfer.root);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  // Guard: if any transform is non-finite (e.g. a corrupt persisted draft),
  // reset the rig to the clean default pose and re-measure rather than
  // producing a NaN camera position (which blanks the viewport).
  if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || !Number.isFinite(size.z)) {
    baselineSession.reset();
    applyBaselineDraft(baselineSession.getDraft());
    golfer.root.updateMatrixWorld(true);
    return;
  }
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = camera.aspect || 1;
  const distH = (size.y * 0.5) / Math.tan(fov / 2);
  const distW = (size.x * 0.5) / (Math.tan(fov / 2) * aspect);
  const dist = Math.max(distH, distW) * 1.3 + 1.2;
  const target = center.clone();
  target.y -= size.y * 0.08;
  // Keep the orbit target centered on the golfer so free mouse orbit/zoom
  // pivot around the avatar.
  orbit.target.copy(target);
  // Only reposition the camera when snapping to a preset view (not while the
  // user is freely orbiting).
  if (!orbitDirty) {
    camera.position.set(
      target.x + Math.sin(camYaw) * dist,
      target.y,
      target.z + Math.cos(camYaw) * dist
    );
  }
  orbit.update();
  const el = document.getElementById('camdebug');
  if (el) {
    el.textContent = `cam dist ${dist.toFixed(1)}  bounds h ${size.y.toFixed(2)}  centerY ${center.y.toFixed(2)}`;
  }
}

// ---- Camera view buttons ----
const views: Array<[string, number]> = [
  ['Front', 0],
  ['Left', -Math.PI / 2],
  ['Right', Math.PI / 2],
  ['Back', Math.PI],
];
const viewsEl = document.getElementById('views')!;
views.forEach(([label, yaw]) => {
  const b = document.createElement('button');
  b.textContent = label;
  b.dataset.testid = `view-${label.toLowerCase()}`;
  b.classList.toggle('is-active', yaw === 0);
  b.addEventListener('click', () => {
    camYaw = yaw;
    orbitDirty = false; // snap back to the preset view
    viewsEl.querySelectorAll('button').forEach((x) => x.classList.remove('is-active'));
    b.classList.add('is-active');
    frameCamera();
  });
  viewsEl.appendChild(b);
});
const resetView = document.createElement('button');
resetView.textContent = 'Reset View';
resetView.addEventListener('click', () => {
  camYaw = 0;
  orbitDirty = false;
  viewsEl.querySelectorAll('button').forEach((x, i) => x.classList.toggle('is-active', i === 0));
  frameCamera();
});
viewsEl.appendChild(resetView);

// ---- Save Pose + Pose Library (in-memory, builds the library as we author) ----
const foot = document.getElementById('master-foot')!;
const saveBtn = document.createElement('button');
saveBtn.textContent = 'Save Pose';
saveBtn.style.borderColor = 'rgba(94,234,212,.5)';
saveBtn.style.color = '#5eead4';
// Mode safety: SAVE POSE is disabled during Default Creation so pose data can
// never be written while editing the default golfer.
saveBtn.disabled = true;
saveBtn.title = 'Available in Pose Creation mode';
saveBtn.style.opacity = '0.45';
saveBtn.style.cursor = 'not-allowed';
const savedList = document.createElement('select');
// Show between 1 and 10 entries at once (size 10 for a pose library view).
savedList.size = 10;
savedList.style.cssText =
  'padding:7px 10px;border-radius:8px;border:1px solid rgba(255,213,74,.3);background:rgba(10,17,28,.96);color:#edf4ff;min-width:200px;max-height:160px;overflow-y:auto;';
savedList.innerHTML = '<option value="">Saved poses…</option>';

function refreshSavedList() {
  savedList.innerHTML = '';
  const poses = poseLibrary.list();
  savedList.size = Math.min(10, Math.max(1, poses.length));
  poses.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    savedList.appendChild(opt);
  });
}

// Build a compact pose ID from a human name. "Right Hand Backhand Tee Shot" ->
// "rhb-tee-shot" (initials of the leading modifiers + the trailing key words).
function abbreviatePoseName(name: string): string {
  const words = name.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'pose';
  if (words.length <= 2) return words.join('-');
  const leading = words
    .slice(0, -2)
    .map((w) => w[0])
    .join('');
  const tail = words.slice(-2).join('-');
  return `${leading}-${tail}`;
}

saveBtn.addEventListener('click', () => {
  const name = window.prompt('Name this pose (e.g. Right Hand Backhand Tee Shot):');
  if (!name) return;
  const suggested = abbreviatePoseName(name);
  const idInput = window.prompt('Pose ID (edit if needed):', suggested);
  if (idInput === null) return;
  const id = idInput.trim() || suggested;
  poseLibrary.register(draftToPose(id, name));
  refreshSavedList();
  savedList.value = id;
});

savedList.addEventListener('change', () => {
  const pose = poseLibrary.get(savedList.value);
  if (pose) {
    applyPose(pose);
  }
});

// Load persisted poses into the list on startup.
refreshSavedList();

foot.insertBefore(savedList, foot.children[1] ?? null);
foot.insertBefore(saveBtn, savedList);

// ---- Layout: Change Look (right menu), Body Features upper (left menu),
// ---- lower-body sections (bottom nav) ----
let expanded: string | null = null;
const featureLeft = document.getElementById('feature-left')!;
const featureRight = document.getElementById('feature-right')!;

// Change Look (appearance) editor in the RIGHT menu — edits the same golfer,
// no separate preview. Master owns the authoritative pose draft (ownsPose=false);
// after any appearance change rebuilds the rig, we re-apply the current draft.
const appearancePanel = new AppearancePanel(
  featureRight,
  golfer,
  () => {
    applyDraft();
    markEdited();
    frameCamera();
  },
  false
);

function makeSection(
  host: HTMLElement,
  id: string,
  title: string,
  build: (c: HTMLElement) => void
) {
  const s = document.createElement('div');
  s.className = 'sect';
  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'sect-head';
  const t = document.createElement('span');
  t.textContent = title;
  const chev = document.createElement('span');
  chev.textContent = expanded === id ? '▾' : '▸';
  head.append(t, chev);
  const body = document.createElement('div');
  body.className = 'sect-body';
  body.hidden = expanded !== id;
  build(body);
  head.addEventListener('click', () => {
    expanded = expanded === id ? null : id;
    document.querySelectorAll<HTMLElement>('.sect').forEach((el) => {
      const open = el === s && expanded === id;
      const b = el.querySelector<HTMLElement>('.sect-body');
      const c = el.querySelector<HTMLElement>('.sect-head span:last-child');
      if (b) b.hidden = !open;
      if (c) c.textContent = open ? '▾' : '▸';
    });
  });
  s.append(head, body);
  host.appendChild(s);
}

// Appearance slider (body proportions) — updates the golfer's profile directly.
function appearanceSlider(
  label: string,
  key:
    | 'legLength'
    | 'legTaper'
    | 'hipWidth'
    | 'hipDepth'
    | 'torsoLength'
    | 'torsoTaper'
    | 'chestWidth'
    | 'chestDepth'
    | 'lowerTorsoWidth'
    | 'lowerTorsoDepth'
    | 'waistSize'
    | 'waistThickness'
    | 'headVertical'
    | 'armLength'
    | 'thighLength'
    | 'thighThickness'
    | 'armThickness'
    | 'neckWidth'
    | 'neckLength'
    | 'neckVertical'
    | 'neckForward'
    | 'trapeziusWidth'
    | 'trapeziusHeight'
    | 'trapeziusDepth'
    | 'trapeziusVertical'
    | 'shoulderWidth'
    | 'shoulderInOut'
    | 'shoulderVertical'
    | 'handSize'
    | 'palmWidth'
    | 'palmLength'
    | 'palmDepth'
    | 'shortsWidth'
    | 'shortsLength'
    | 'shortsRise'
    | 'shortsForward'
    | 'shortsDepth'
    | 'shortLegWidth'
    | 'shortLegLength'
    | 'footLength'
    | 'footWidth'
    | 'footHeight'
    | 'sockThickness',
  min: number,
  max: number
) {
  const row = document.createElement('label');
  row.className = 'row';
  const span = document.createElement('span');
  span.textContent = label;
  const out = document.createElement('output');
  const get = () =>
    golfer.appearance.profile?.[key] ?? (key === 'shortsRise' || key === 'shortsForward' ? 0 : 1);
  out.textContent = get().toFixed(2);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = '0.01';
  input.value = String(get());
  input.addEventListener('input', () => {
    const v = Number(input.value);
    out.textContent = v.toFixed(2);
    const profile = { ...golfer.appearance.profile, [key]: v };
    golfer.setAppearance({ ...golfer.appearance, profile });
    // setAppearance rebuilds the rig, so re-apply the current pose offsets
    // (e.g. raised arms) or they reset to neutral.
    applyDraft();
    markEdited();
    frameCamera();
  });
  appearanceSliders.push(() => {
    input.value = String(get());
    out.textContent = get().toFixed(2);
  });
  row.append(span, out, input);
  return row;
}

// Adaptive-range authoring slider for a BodyProfile key. Reuses the SAME
// profile update path as appearanceSlider; only the editor range is new.
type ProfileKey = Parameters<typeof appearanceSlider>[1];
function authoringProfileSlider(
  label: string,
  key: ProfileKey,
  cfg: { min: number; max: number; step?: number; hardMin?: number; hardMax?: number }
): HTMLElement {
  const get = () =>
    golfer.appearance.profile?.[key] ?? (key === 'shortsRise' || key === 'shortsForward' ? 0 : 1);
  const slider = new AuthoringSlider({
    id: key,
    label,
    defaultMin: cfg.min,
    defaultMax: cfg.max,
    defaultStep: cfg.step ?? 0.01,
    hardMin: cfg.hardMin,
    hardMax: cfg.hardMax,
    get,
    onChange: (v) => {
      const profile = { ...golfer.appearance.profile, [key]: v };
      golfer.setAppearance({ ...golfer.appearance, profile });
      applyDraft();
      markEdited();
      frameCamera();
    },
  });
  appearanceSliders.push(() => slider.sync());
  return slider.el;
}

function slider(
  label: string,
  get: () => number,
  set: (v: number) => void,
  min = 0,
  max = 140,
  testId?: string
) {
  const row = document.createElement('label');
  row.className = 'row';
  const span = document.createElement('span');
  span.textContent = label;
  const out = document.createElement('output');
  out.textContent = `${get()}°`;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  input.value = String(get());
  if (testId) {
    row.dataset.testid = testId;
    input.dataset.testid = `${testId}-input`;
    out.dataset.testid = `${testId}-value`;
  }
  input.addEventListener('input', () => {
    set(Number(input.value));
    out.textContent = `${input.value}°`;
    applyDraft();
    markEdited();
  });
  poseSliders.push(() => {
    input.value = String(get());
    out.textContent = `${get()}°`;
  });
  row.append(span, out, input);
  return row;
}

// A labeled row for a reserved-but-not-yet-wired semantic control.
function comingSoonRow(label: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'row';
  const span = document.createElement('span');
  span.textContent = label;
  const soon = document.createElement('span');
  soon.className = 'soon';
  soon.textContent = 'Coming Soon';
  row.append(span, soon);
  return row;
}

// Foot Direction note: the foot hangs off the KNEE joint (no dedicated ankle
// pivot yet), so a true ankle-direction control is blocked until an ankle
// joint exists. Reported, not faked by rotating the shoe mesh.
function ankleNoteRow(): HTMLElement {
  const row = document.createElement('div');
  row.className = 'row';
  const span = document.createElement('span');
  span.textContent = 'Foot Direction';
  const soon = document.createElement('span');
  soon.className = 'soon';
  soon.textContent = 'Needs ankle joint';
  row.append(span, soon);
  return row;
}

// ---- Dev joint markers (diagnostic only, never in gameplay) ----
// Small spheres parented to the anatomical joint groups / end meshes so we can
// visually verify that visible geometry is centered on intended joints.
// Center chain = yellow, anatomical left = cyan, anatomical right = orange.
const markerGeo = new THREE.SphereGeometry(0.028, 10, 8);
const markers: THREE.Mesh[] = [];
const MARKER_JOINTS: Array<[string, number]> = [
  ['hips', 0xffd54a],
  ['torso', 0xffd54a],
  ['head', 0xffd54a],
  ['shoulderL', 0x22d3ee],
  ['elbowL', 0x22d3ee],
  ['hipL', 0x22d3ee],
  ['kneeL', 0x22d3ee],
  ['shoulderR', 0xfb923c],
  ['elbowR', 0xfb923c],
  ['hipR', 0xfb923c],
  ['kneeR', 0xfb923c],
];
const MARKER_MESHES: Array<[string, number]> = [
  ['shorts-root', 0xffd54a],
  ['palm-left', 0x22d3ee],
  ['palm-right', 0xfb923c],
  ['shoe-left', 0x22d3ee],
  ['shoe-right', 0xfb923c],
];

function setJointMarkersVisible(show: boolean) {
  if (!show) {
    markers.forEach((m) => m.parent?.remove(m));
    markers.length = 0;
    return;
  }
  const addMarker = (parent: THREE.Object3D | undefined, color: number) => {
    if (!parent) return;
    const m = new THREE.Mesh(
      markerGeo,
      new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.9 })
    );
    m.renderOrder = 999;
    parent.add(m);
    markers.push(m);
  };
  MARKER_JOINTS.forEach(([name, color]) =>
    addMarker(golfer.getJointGroup(name as Parameters<typeof golfer.getJointGroup>[0]), color)
  );
  MARKER_MESHES.forEach(([name, color]) => addMarker(golfer.root.getObjectByName(name), color));
}

// Color legend shown inside the Baseline Tools section when markers are on.
const MARKER_LEGEND: Array<[string, string]> = [
  ['#ffd54a', 'PELVIS / TORSO / HEAD (center)'],
  ['#22d3ee', 'LEFT: shoulder / elbow / hip / knee / ankle'],
  ['#fb923c', 'RIGHT: shoulder / elbow / hip / knee / ankle'],
];

// ---- Baseline diagnostics (dev-only inspection of the neutral golfer) ----
const DIAG_JOINTS = [
  'hips',
  'torso',
  'head',
  'shoulderL',
  'elbowL',
  'shoulderR',
  'elbowR',
  'hipL',
  'kneeL',
  'hipR',
  'kneeR',
] as const;
const DIAG_MESHES = [
  'palm-left',
  'palm-right',
  'shoe-left',
  'shoe-right',
  'toe-left',
  'toe-right',
] as const;

function diagnosticsText(): string {
  golfer.root.updateMatrixWorld(true);
  const v3 = (v: THREE.Vector3) => `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
  const deg = (e: THREE.Euler) =>
    `(${THREE.MathUtils.radToDeg(e.x).toFixed(1)}°, ${THREE.MathUtils.radToDeg(e.y).toFixed(1)}°, ${THREE.MathUtils.radToDeg(e.z).toFixed(1)}°)`;
  const lines: string[] = ['JOINTS  (canonical forward = +Z, anatomical left = +X)'];
  for (const name of DIAG_JOINTS) {
    const g = golfer.getJointGroup(name);
    if (!g) continue;
    lines.push(
      `${name.padEnd(10)} parent=${(g.parent?.name || g.parent?.type || '?').padEnd(12)} local=${v3(g.position)} rot=${deg(g.rotation)} world=${v3(g.getWorldPosition(new THREE.Vector3()))}`
    );
  }
  lines.push('', 'END MESHES (world)');
  for (const name of DIAG_MESHES) {
    const m = golfer.root.getObjectByName(name);
    if (!m) continue;
    lines.push(`${name.padEnd(16)} world=${v3(m.getWorldPosition(new THREE.Vector3()))}`);
  }
  return lines.join('\n');
}

function makeToggleRow(label: string, initial: boolean, onChange: (v: boolean) => void) {
  const row = document.createElement('label');
  row.className = 'row';
  row.style.gridTemplateColumns = '1fr auto';
  const span = document.createElement('span');
  span.textContent = label;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = initial;
  input.addEventListener('change', () => onChange(input.checked));
  row.append(span, input);
  return row;
}

function resetToMaleBaseline() {
  baselineSession.reset();
  applyBaselineDraft(baselineSession.getDraft());
  appearancePanel.refreshFromGolfer();
  updateStatus();
}

// BASELINE TOOLS — dev-only controls for inspecting the neutral male golfer.
makeSection(featureLeft, 'baselineTools', 'Baseline Tools', (c) => {
  c.appendChild(makeToggleRow('Show Disc', false, (v) => golfer.setDiscVisible(v)));
  const legend = document.createElement('div');
  legend.hidden = true;
  legend.style.cssText = 'font-size:10px;line-height:1.7;color:#9fb3cc;margin:6px 0;';
  MARKER_LEGEND.forEach(([hex, text]) => {
    const row = document.createElement('div');
    const dot = document.createElement('span');
    dot.style.cssText = `display:inline-block;width:9px;height:9px;border-radius:50%;background:${hex};margin-right:6px;vertical-align:middle;`;
    const lbl = document.createElement('span');
    lbl.textContent = text;
    row.append(dot, lbl);
    legend.appendChild(row);
  });
  c.appendChild(
    makeToggleRow('Show Joint Markers', false, (v) => {
      setJointMarkersVisible(v);
      legend.hidden = !v;
    })
  );
  c.appendChild(legend);
  const btnStyle =
    'width:100%;margin-top:8px;padding:8px 10px;border-radius:8px;border:1px solid rgba(94,234,212,.5);background:rgba(94,234,212,.08);color:#5eead4;cursor:pointer;font-weight:600;';
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.textContent = 'Reset Draft (Neutral)';
  resetBtn.title = 'Return the editing session to neutral starting values';
  resetBtn.style.cssText = btnStyle;
  resetBtn.addEventListener('click', () => resetToMaleBaseline());
  const reloadBtn = document.createElement('button');
  reloadBtn.type = 'button';
  reloadBtn.textContent = 'Reload Saved';
  reloadBtn.title = 'Discard unsaved changes and reload the last SAVE';
  reloadBtn.style.cssText = btnStyle;
  reloadBtn.addEventListener('click', () => {
    if (baselineSession.reloadSaved()) {
      applyBaselineDraft(baselineSession.getDraft());
      appearancePanel.refreshFromGolfer();
    }
    updateStatus();
  });
  c.append(resetBtn, reloadBtn);
});

// BASELINE DIAGNOSTICS — collapsible joint data for the neutral golfer.
makeSection(featureLeft, 'baselineDiag', 'Baseline Diagnostics', (c) => {
  // ---- Development-only visibility toggles (diagnostic state only) ----
  // These set editor state + reapply via applyDiagnosticVisibility(). State
  // survives rig rebuilds because setAppearance is wrapped to reapply it.
  const diagLabel = document.createElement('div');
  diagLabel.className = 'ftitle';
  diagLabel.textContent = 'Visibility (dev-only)';
  c.appendChild(diagLabel);

  const hideBelt = makeToggleRow('Hide Belt', false, (v) => {
    diagnosticVisibility.hideBelt = v;
    applyDiagnosticVisibility();
  });
  const hideShorts = makeToggleRow('Hide Shorts', false, (v) => {
    diagnosticVisibility.hideShorts = v;
    applyDiagnosticVisibility();
  });
  const hideJersey = makeToggleRow('Hide Jersey Texture', false, (v) => {
    diagnosticVisibility.hideJersey = v;
    applyDiagnosticVisibility();
  });
  const bodyOnly = makeToggleRow('Body Only', false, (v) => {
    diagnosticVisibility.hideBelt = v;
    diagnosticVisibility.hideShorts = v;
    diagnosticVisibility.hideJersey = v;
    (hideBelt.querySelector('input') as HTMLInputElement).checked = v;
    (hideShorts.querySelector('input') as HTMLInputElement).checked = v;
    (hideJersey.querySelector('input') as HTMLInputElement).checked = v;
    applyDiagnosticVisibility();
  });
  c.append(hideBelt, hideShorts, hideJersey, bodyOnly);

  // Dev-only live readout so visibility failures are obvious.
  const diagReadout = document.createElement('div');
  diagReadout.style.cssText = 'font-size:10px;color:#9fb3cc;margin-top:6px;line-height:1.6;';
  const updateReadout = () => {
    const beltV = golfer.root.getObjectByName('belt-root')?.visible;
    const shortsV = golfer.root.getObjectByName('shorts-root')?.visible;
    const chestMat = (golfer.root.getObjectByName('torso-part') as THREE.Mesh | undefined)
      ?.material as THREE.MeshStandardMaterial | undefined;
    const jerseyActive = chestMat ? chestMat.map !== null : undefined;
    diagReadout.textContent =
      `Hide Belt: ${diagnosticVisibility.hideBelt}  |  belt-root visible: ${beltV}\n` +
      `Hide Shorts: ${diagnosticVisibility.hideShorts}  |  shorts-root visible: ${shortsV}\n` +
      `Hide Jersey: ${diagnosticVisibility.hideJersey}  |  jersey texture active: ${jerseyActive}`;
    diagReadout.style.whiteSpace = 'pre-wrap';
  };
  const readoutBtn = document.createElement('button');
  readoutBtn.type = 'button';
  readoutBtn.textContent = 'Check Visibility State';
  readoutBtn.style.cssText =
    'margin-top:4px;padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#edf4ff;cursor:pointer;font-size:10px;';
  readoutBtn.addEventListener('click', updateReadout);
  c.append(readoutBtn, diagReadout);

  const pre = document.createElement('pre');
  pre.style.cssText =
    'font-size:10px;line-height:1.5;color:#9fb3cc;white-space:pre-wrap;word-break:break-all;margin:0 0 8px;';
  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.textContent = 'Refresh';
  refreshBtn.style.cssText =
    'padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#edf4ff;cursor:pointer;font-size:11px;';
  const refresh = () => {
    pre.textContent = diagnosticsText();
  };
  refreshBtn.addEventListener('click', refresh);
  refresh();
  c.append(pre, refreshBtn);
});

// FACE DIAGNOSTICS — dev-only visibility isolation for the procedural head.
// Editor-only state (faceDiagnosticVisibility); never serialized into saved
// appearance, baseline, profile, or pose. Reapplied after every rebuild via the
// wrapped setAppearance hook. Body diagnostics and Face diagnostics are separate.
makeSection(featureLeft, 'faceDiag', 'Face Diagnostics', (c) => {
  const diagLabel = document.createElement('div');
  diagLabel.className = 'ftitle';
  diagLabel.textContent = 'Visibility (dev-only)';
  c.appendChild(diagLabel);

  const faceToggle = (
    label: string,
    key: Exclude<keyof typeof faceDiagnosticVisibility, 'mode'>,
    onChange?: (v: boolean) => void
  ) =>
    makeToggleRow(label, faceDiagnosticVisibility[key], (v) => {
      faceDiagnosticVisibility[key] = v;
      onChange?.(v);
      applyFaceDiagnosticVisibility();
    });

  c.appendChild(faceToggle('Hide Hair', 'hideHair'));
  c.appendChild(faceToggle('Hide Facial Hair', 'hideFacialHair'));
  c.appendChild(faceToggle('Hide Ears', 'hideEars'));
  c.appendChild(faceToggle('Hide Brows', 'hideBrows'));
  c.appendChild(faceToggle('Hide Eyes', 'hideEyes'));
  c.appendChild(faceToggle('Hide Nose', 'hideNose'));
  c.appendChild(faceToggle('Hide Mouth', 'hideMouth'));
  c.appendChild(faceToggle('Hide Cheeks', 'hideCheeks'));
  c.appendChild(faceToggle('Hide Jaw', 'hideJaw'));
  c.appendChild(faceToggle('Hide Chin', 'hideChin'));

  // Mutually-exclusive INSPECTION MODE (never rewrites the individual
  // overrides). Only one active at a time.
  const modeLabel = document.createElement('div');
  modeLabel.className = 'ftitle';
  modeLabel.textContent = 'Inspection Mode';
  modeLabel.style.marginTop = '10px';
  c.appendChild(modeLabel);

  const modeRow = document.createElement('div');
  modeRow.style.cssText = 'display:flex;gap:6px;margin:6px 0;';
  const modeBtns: Array<{ id: FaceInspectionMode; label: string }> = [
    { id: 'normal', label: 'Normal' },
    { id: 'face-only', label: 'Face Only' },
    { id: 'head-shell-only', label: 'Head Shell Only' },
  ];
  const syncModeButtons = () => {
    modeRow.querySelectorAll('button').forEach((b) => {
      const active = (b as HTMLButtonElement).dataset.mode === faceDiagnosticVisibility.mode;
      b.style.background = active ? 'rgba(255,213,74,.18)' : 'transparent';
      b.style.color = active ? '#ffd54a' : '#edf4ff';
      b.style.borderColor = active ? 'rgba(255,213,74,.5)' : 'rgba(255,255,255,.18)';
    });
  };
  modeBtns.forEach(({ id, label }) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.mode = id;
    b.style.cssText =
      'flex:1;padding:5px;border-radius:6px;border:1px solid rgba(255,255,255,.18);background:transparent;color:#edf4ff;cursor:pointer;font-size:11px;';
    b.addEventListener('click', () => {
      faceDiagnosticVisibility.mode = id;
      syncModeButtons();
      applyFaceDiagnosticVisibility();
    });
    modeRow.appendChild(b);
  });
  c.appendChild(modeRow);
  syncModeButtons();

  // Dev-only live readout of the diagnostic state + key live objects.
  const readout = document.createElement('div');
  readout.style.cssText =
    'font-size:10px;color:#9fb3cc;margin-top:6px;line-height:1.5;white-space:pre-wrap;';
  const checkBtn = document.createElement('button');
  checkBtn.type = 'button';
  checkBtn.textContent = 'Check Face Visibility State';
  checkBtn.style.cssText =
    'margin-top:4px;padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#edf4ff;cursor:pointer;font-size:10px;';
  checkBtn.addEventListener('click', () => {
    const s = faceDiagnosticVisibility;
    const vis = (n: string) => golfer.root.getObjectByName(n)?.visible;
    const lines = [
      `Inspection Mode: ${s.mode}`,
      'INDIVIDUAL OVERRIDES:',
      `  Hide Hair: ${s.hideHair} | FacialHair: ${s.hideFacialHair} | Ears: ${s.hideEars}`,
      `  Hide Brows: ${s.hideBrows} | Eyes: ${s.hideEyes} | Nose: ${s.hideNose}`,
      `  Hide Mouth: ${s.hideMouth} | Cheeks: ${s.hideCheeks} | Jaw: ${s.hideJaw} | Chin: ${s.hideChin}`,
      'LIVE OBJECT VISIBILITY:',
      `  hair-root: ${vis('hair-root')} | head-part: ${vis('head-part')} | jaw-part: ${vis('jaw-part')}`,
      `  cheek-left: ${vis('cheek-left')} | brow-left: ${vis('brow-left')} | eye-white-left: ${vis('eye-white-left')}`,
      `  nose-part: ${vis('nose-part')} | mouth-part: ${vis('mouth-part')} | ear-left: ${vis('ear-left')}`,
    ];
    readout.textContent = lines.join('\n');
  });
  c.append(checkBtn, readout);
});

// ---- Full anatomical Body Features (permanent organization) ----
// HEAD
makeSection(featureLeft, 'head', 'Head', (c) => {
  c.appendChild(appearanceSlider('Head Up / Down', 'headVertical', 0.6, 1.4));
  c.appendChild(
    slider(
      'Turn Left / Right',
      () => draft.headYaw,
      (v) => (draft.headYaw = v),
      -80,
      80
    )
  );
  c.appendChild(
    slider(
      'Look Up / Down',
      () => draft.headPitch,
      (v) => (draft.headPitch = v),
      -50,
      50
    )
  );
});

// NECK
makeSection(featureLeft, 'neck', 'Neck', (c) => {
  c.appendChild(appearanceSlider('Neck Width', 'neckWidth', 0.5, 1.8));
  c.appendChild(appearanceSlider('Neck Length', 'neckLength', 0.5, 1.8));
  c.appendChild(appearanceSlider('Neck Vertical', 'neckVertical', 0.7, 1.4));
  c.appendChild(appearanceSlider('Neck Forward / Back', 'neckForward', -0.08, 0.08));
  const trapLabel = document.createElement('div');
  trapLabel.className = 'ftitle';
  trapLabel.textContent = 'Trapezius (Neck → Shoulder)';
  trapLabel.style.marginTop = '12px';
  c.appendChild(trapLabel);
  c.appendChild(appearanceSlider('Trapezius Width', 'trapeziusWidth', 0.2, 1.8));
  c.appendChild(appearanceSlider('Trapezius Height', 'trapeziusHeight', 0.0, 1.8));
  c.appendChild(appearanceSlider('Trapezius Depth', 'trapeziusDepth', 0.2, 1.8));
  c.appendChild(appearanceSlider('Trapezius Vertical', 'trapeziusVertical', 0.5, 1.5));
});

// TORSO
makeSection(featureLeft, 'torso', 'Torso', (c) => {
  const propLabel = document.createElement('div');
  propLabel.className = 'ftitle';
  propLabel.textContent = 'Proportions';
  c.appendChild(propLabel);
  c.appendChild(appearanceSlider('Torso Length', 'torsoLength', 0.3, 1.5));
  // Shoulder Width = anatomical attachment span (shoulderInOut), NOT the
  // legacy shoulderWidth joint-X-scale (which is arm/shoulder bulk).
  c.appendChild(appearanceSlider('Shoulder Width', 'shoulderInOut', 0.4, 1.5));

  const chestLabel = document.createElement('div');
  chestLabel.className = 'ftitle';
  chestLabel.textContent = 'Chest';
  chestLabel.style.marginTop = '12px';
  c.appendChild(chestLabel);
  c.appendChild(
    authoringProfileSlider('Chest Width', 'chestWidth', {
      min: 0.6,
      max: 1.6,
      step: 0.05,
      hardMin: 0.1,
      hardMax: 3.0,
    })
  );
  c.appendChild(appearanceSlider('Chest Depth', 'chestDepth', 0.6, 1.6));

  const waistLabel = document.createElement('div');
  waistLabel.className = 'ftitle';
  waistLabel.textContent = 'Waist';
  waistLabel.style.marginTop = '12px';
  c.appendChild(waistLabel);
  c.appendChild(appearanceSlider('Waist Width', 'lowerTorsoWidth', 0.5, 1.8));
  c.appendChild(appearanceSlider('Waist Depth', 'lowerTorsoDepth', 0.5, 1.8));

  const advLabel = document.createElement('div');
  advLabel.className = 'ftitle';
  advLabel.textContent = 'Advanced / Legacy';
  advLabel.style.marginTop = '12px';
  c.appendChild(advLabel);
  // Legacy: broad parent-Z scaling, superseded by Chest/Waist Depth. Persisted
  // value is preserved and runtime-compatible, but hidden from primary torso
  // authoring as LEGACY.
  c.appendChild(appearanceSlider('Wide / Skinny (Legacy)', 'torsoTaper', 0.4, 1.4));
  c.appendChild(appearanceSlider('Waist Size (Belt)', 'waistSize', 0.6, 1.6));
  // Shoulder/arm bulk (joint X scale) — NOT anatomical shoulder span.
  c.appendChild(appearanceSlider('Shoulder Bulk (Legacy)', 'shoulderWidth', 0.6, 1.6));
  c.appendChild(appearanceSlider('Shoulders Up / Down', 'shoulderVertical', 0.6, 1.4));
  c.appendChild(appearanceSlider('Arm Length (Both)', 'armLength', 0.3, 1.6));
  c.appendChild(appearanceSlider('Arm Thickness (Both)', 'armThickness', 0.3, 1.6));
  const poseLabel = document.createElement('div');
  poseLabel.className = 'ftitle';
  poseLabel.textContent = 'Pose';
  poseLabel.style.marginTop = '12px';
  c.appendChild(poseLabel);
  c.appendChild(
    slider(
      'Turn Left / Right',
      () => draft.torsoCoil,
      (v) => (draft.torsoCoil = v),
      -90,
      90
    )
  );
  c.appendChild(
    slider(
      'Lean Forward / Back',
      () => draft.torsoLean,
      (v) => (draft.torsoLean = v),
      -45,
      45
    )
  );
  c.appendChild(comingSoonRow('Lean Left / Right'));
});

// LEFT ARM
makeSection(featureLeft, 'leftArm', 'Left Arm', (c) => {
  const hint = document.createElement('div');
  hint.className = 'soon';
  hint.textContent = "Golfer's anatomical left — appears on screen-right in Front view.";
  c.appendChild(hint);
  c.appendChild(
    slider(
      'Out / In',
      () => draft.lAbduction,
      (v) => (draft.lAbduction = v),
      0,
      180,
      'left-arm-out-in'
    )
  );
  c.appendChild(
    slider(
      'Forward / Back',
      () => draft.lFlexion,
      (v) => (draft.lFlexion = v),
      -90,
      180,
      'left-arm-forward-back'
    )
  );
  c.appendChild(
    slider(
      'Arm Twist',
      () => draft.lTwist,
      (v) => (draft.lTwist = v),
      -90,
      90,
      'left-arm-twist'
    )
  );
  c.appendChild(
    slider(
      'Elbow Bend',
      () => draft.lElbow,
      (v) => (draft.lElbow = v),
      0,
      145,
      'left-arm-elbow-bend'
    )
  );
});

// RIGHT ARM
makeSection(featureLeft, 'rightArm', 'Right Arm', (c) => {
  const hint = document.createElement('div');
  hint.className = 'soon';
  hint.textContent = "Golfer's anatomical right — appears on screen-left in Front view.";
  c.appendChild(hint);
  c.appendChild(
    slider(
      'Out / In',
      () => draft.rAbduction,
      (v) => (draft.rAbduction = v),
      0,
      180,
      'right-arm-out-in'
    )
  );
  c.appendChild(
    slider(
      'Forward / Back',
      () => draft.rFlexion,
      (v) => (draft.rFlexion = v),
      -90,
      180,
      'right-arm-forward-back'
    )
  );
  c.appendChild(
    slider(
      'Arm Twist',
      () => draft.rTwist,
      (v) => (draft.rTwist = v),
      -90,
      90,
      'right-arm-twist'
    )
  );
  c.appendChild(
    slider(
      'Elbow Bend',
      () => draft.rElbow,
      (v) => (draft.rElbow = v),
      0,
      145,
      'right-arm-elbow-bend'
    )
  );
});

// HIPS / PELVIS
// HIPS / PELVIS
makeSection(featureLeft, 'pelvis', 'Hips / Pelvis', (c) => {
  c.appendChild(
    slider(
      'Turn Left / Right',
      () => draft.pelvisTurn,
      (v) => (draft.pelvisTurn = v),
      -90,
      90
    )
  );
  c.appendChild(
    slider(
      'Tilt Left / Right',
      () => draft.pelvisTilt,
      (v) => (draft.pelvisTilt = v),
      -45,
      45
    )
  );
  c.appendChild(
    slider(
      'Forward / Back',
      () => draft.pelvisFlex,
      (v) => (draft.pelvisFlex = v),
      -45,
      45
    )
  );
});

// LEFT LEG
makeSection(featureLeft, 'leftLeg', 'Left Leg', (c) => {
  c.appendChild(
    slider(
      'Hip Forward / Back',
      () => draft.lHipFlex,
      (v) => (draft.lHipFlex = v),
      -60,
      90
    )
  );
  c.appendChild(
    slider(
      'Hip Out / In',
      () => draft.lHipAbd,
      (v) => (draft.lHipAbd = v),
      0,
      60
    )
  );
  c.appendChild(
    slider(
      'Hip Rotation',
      () => draft.lHipRot,
      (v) => (draft.lHipRot = v),
      -60,
      60
    )
  );
  c.appendChild(
    slider(
      'Knee Bend',
      () => draft.lKnee,
      (v) => (draft.lKnee = v),
      0,
      120
    )
  );
  c.appendChild(ankleNoteRow());
});

// RIGHT LEG
makeSection(featureLeft, 'rightLeg', 'Right Leg', (c) => {
  c.appendChild(
    slider(
      'Hip Forward / Back',
      () => draft.rHipFlex,
      (v) => (draft.rHipFlex = v),
      -60,
      90
    )
  );
  c.appendChild(
    slider(
      'Hip Out / In',
      () => draft.rHipAbd,
      (v) => (draft.rHipAbd = v),
      0,
      60
    )
  );
  c.appendChild(
    slider(
      'Hip Rotation',
      () => draft.rHipRot,
      (v) => (draft.rHipRot = v),
      -60,
      60
    )
  );
  c.appendChild(
    slider(
      'Knee Bend',
      () => draft.rKnee,
      (v) => (draft.rKnee = v),
      0,
      120
    )
  );
  c.appendChild(ankleNoteRow());
});

// LEGS (PROPORTIONS) — both-legs baseline geometry, grouped together.
makeSection(featureLeft, 'legsProp', 'Legs (Proportions)', (c) => {
  c.appendChild(appearanceSlider('Leg Length', 'legLength', 0.3, 1.5));
  c.appendChild(appearanceSlider('Thigh Length (Hip to Knee)', 'thighLength', 0.6, 1.6));
  c.appendChild(appearanceSlider('Thigh Thickness', 'thighThickness', 0.4, 1.8));
  c.appendChild(appearanceSlider('Leg Width (Both)', 'legTaper', 0.4, 1.8));
});

// HIPS / PELVIS — anatomical pelvis body (WAIST → HIPS transition). Hip Width
// also drives hip-joint spacing; Hip Depth is the front/back pelvis depth.
makeSection(featureLeft, 'hips', 'Hips / Pelvis', (c) => {
  c.appendChild(
    authoringProfileSlider('Hip Width', 'hipWidth', {
      min: 0.5,
      max: 1.5,
      step: 0.05,
      hardMin: 0.2,
      hardMax: 3.0,
    })
  );
  c.appendChild(
    authoringProfileSlider('Hip Depth', 'hipDepth', {
      min: 0.5,
      max: 1.5,
      step: 0.05,
      hardMin: 0.2,
      hardMax: 3.0,
    })
  );
});

// HANDS / WRISTS
makeSection(featureLeft, 'hands', 'Hands / Wrists', (c) => {
  const propLabel = document.createElement('div');
  propLabel.className = 'ftitle';
  propLabel.textContent = 'Baseline Geometry';
  c.appendChild(propLabel);
  c.appendChild(appearanceSlider('Hand Size', 'handSize', 0.6, 1.6));
  c.appendChild(appearanceSlider('Palm Width', 'palmWidth', 0.6, 1.6));
  c.appendChild(appearanceSlider('Palm Length', 'palmLength', 0.6, 1.6));
  c.appendChild(appearanceSlider('Palm Depth', 'palmDepth', 0.6, 1.6));
  const poseLabel = document.createElement('div');
  poseLabel.className = 'ftitle';
  poseLabel.textContent = 'Pose';
  poseLabel.style.marginTop = '12px';
  c.appendChild(poseLabel);
  c.appendChild(comingSoonRow('Wrist Flex / Extend'));
  c.appendChild(comingSoonRow('Wrist Twist'));
  c.appendChild(comingSoonRow('Grip'));
});

// SHORTS / CLOTHING
makeSection(featureLeft, 'shorts', 'Shorts / Clothing', (c) => {
  const jerseyLabel = document.createElement('div');
  jerseyLabel.className = 'ftitle';
  jerseyLabel.textContent = 'Jersey';
  c.appendChild(jerseyLabel);
  // Jersey params live on appearance.outfit, not profile.
  const outfitSlider = (
    label: string,
    key:
      | 'sleeveLength'
      | 'sleeveWidth'
      | 'beltThickness'
      | 'beltWidth'
      | 'beltVertical'
      | 'beltBuckle'
      | 'beltTightness',
    min: number,
    max: number
  ) => {
    const row = document.createElement('label');
    row.className = 'row';
    const span = document.createElement('span');
    span.textContent = label;
    const out = document.createElement('output');
    const get = () => golfer.appearance.outfit?.[key] ?? (key === 'beltVertical' ? 0 : 1);
    out.textContent = get().toFixed(2);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = '0.01';
    input.value = String(get());
    input.addEventListener('input', () => {
      const v = Number(input.value);
      out.textContent = v.toFixed(2);
      golfer.setAppearance({
        ...golfer.appearance,
        outfit: { ...golfer.appearance.outfit, [key]: v },
      });
      applyDraft();
      markEdited();
      frameCamera();
    });
    row.append(span, out, input);
    return row;
  };
  c.appendChild(outfitSlider('Sleeve Length', 'sleeveLength', 0.2, 2));
  c.appendChild(outfitSlider('Sleeve Width', 'sleeveWidth', 0.5, 2));

  const beltLabel = document.createElement('div');
  beltLabel.className = 'ftitle';
  beltLabel.textContent = 'Belt';
  beltLabel.style.marginTop = '10px';
  c.appendChild(beltLabel);
  c.appendChild(outfitSlider('Belt Thickness', 'beltThickness', 0.3, 2.5));
  c.appendChild(outfitSlider('Belt Width', 'beltWidth', 0.6, 1.6));
  c.appendChild(outfitSlider('Belt Tightness', 'beltTightness', 0.6, 1.3));
  c.appendChild(outfitSlider('Belt Vertical', 'beltVertical', -0.2, 0.2));
  c.appendChild(outfitSlider('Buckle Size', 'beltBuckle', 0.3, 2));
  // Belt color override (defaults to secondary/shorts color).
  const beltColorRow = document.createElement('label');
  beltColorRow.className = 'row';
  beltColorRow.style.gridTemplateColumns = '1fr auto';
  const beltColorSpan = document.createElement('span');
  beltColorSpan.textContent = 'Belt Color';
  const beltColorInput = document.createElement('input');
  beltColorInput.type = 'color';
  const currentBelt = golfer.appearance.beltColor ?? golfer.appearance.shortsColor;
  beltColorInput.value = '#' + currentBelt.toString(16).padStart(6, '0');
  beltColorInput.addEventListener('input', () => {
    golfer.setAppearance({
      ...golfer.appearance,
      beltColor: Number.parseInt(beltColorInput.value.slice(1), 16),
    });
    applyDraft();
    markEdited();
    frameCamera();
  });
  beltColorRow.append(beltColorSpan, beltColorInput);
  c.appendChild(beltColorRow);
  // Buckle color override (defaults to metallic silver).
  const buckleColorRow = document.createElement('label');
  buckleColorRow.className = 'row';
  buckleColorRow.style.gridTemplateColumns = '1fr auto';
  const buckleColorSpan = document.createElement('span');
  buckleColorSpan.textContent = 'Buckle Color';
  const buckleColorInput = document.createElement('input');
  buckleColorInput.type = 'color';
  const currentBuckle = golfer.appearance.buckleColor ?? 0xc8ccd4;
  buckleColorInput.value = '#' + currentBuckle.toString(16).padStart(6, '0');
  buckleColorInput.addEventListener('input', () => {
    golfer.setAppearance({
      ...golfer.appearance,
      buckleColor: Number.parseInt(buckleColorInput.value.slice(1), 16),
    });
    applyDraft();
    markEdited();
    frameCamera();
  });
  buckleColorRow.append(buckleColorSpan, buckleColorInput);
  c.appendChild(buckleColorRow);

  const shortsLabel = document.createElement('div');
  shortsLabel.className = 'ftitle';
  shortsLabel.textContent = 'Shorts';
  shortsLabel.style.marginTop = '10px';
  c.appendChild(shortsLabel);
  c.appendChild(
    authoringProfileSlider('Shorts Width', 'shortsWidth', {
      min: 0.6,
      max: 2.2,
      step: 0.05,
      hardMin: 0.1,
      hardMax: 4.0,
    })
  );
  c.appendChild(appearanceSlider('Shorts Length', 'shortsLength', 0.4, 1.0));
  c.appendChild(appearanceSlider('Shorts Up / Down', 'shortsRise', -0.3, 0.3));
  c.appendChild(appearanceSlider('Shorts Forward / Back', 'shortsForward', -0.15, 0.15));
  c.appendChild(appearanceSlider('Shorts Depth', 'shortsDepth', 0.2, 3));
  c.appendChild(
    authoringProfileSlider('Short Leg Width', 'shortLegWidth', {
      min: 0.5,
      max: 4.0,
      step: 0.05,
      hardMin: 0.1,
      hardMax: 4.0,
    })
  );
  c.appendChild(appearanceSlider('Short Leg Length', 'shortLegLength', 0.5, 2.2));
  c.appendChild(appearanceSlider('Sock Thickness', 'sockThickness', 0.5, 1.8));
});

// FEET
makeSection(featureLeft, 'feet', 'Feet', (c) => {
  c.appendChild(appearanceSlider('Foot Length', 'footLength', 0.6, 1.6));
  c.appendChild(appearanceSlider('Foot Width', 'footWidth', 0.6, 1.6));
  c.appendChild(appearanceSlider('Foot Height', 'footHeight', 0.6, 1.6));
  const note = document.createElement('div');
  note.className = 'soon';
  note.textContent = 'No ankle joint yet — feet are on the knee chain (rig milestone).';
  note.style.marginTop = '8px';
  c.appendChild(note);
});

// DISC
makeSection(featureLeft, 'disc', 'Disc', (c) => {
  // Show / hide the held disc (display only, not gameplay physics).
  c.appendChild(
    makeToggleRow('Show Disc', false, (v) => {
      golfer.setDiscVisible(v);
      markEdited();
    })
  );

  // Held In: Right / Left hand.
  const handRow = document.createElement('div');
  handRow.className = 'row';
  const handLabel = document.createElement('span');
  handLabel.textContent = 'Held In';
  const handSel = document.createElement('select');
  handSel.style.cssText =
    'padding:4px 8px;border-radius:6px;border:1px solid rgba(255,213,74,.3);background:rgba(10,17,28,.96);color:#edf4ff;';
  [
    ['left', 'Left Hand'],
    ['right', 'Right Hand'],
  ].forEach(([v, label]) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = label;
    handSel.appendChild(o);
  });
  handSel.value = 'left';
  handSel.addEventListener('change', () => {
    golfer.setDiscHand(handSel.value as 'right' | 'left');
    markEdited();
  });
  handRow.append(handLabel, handSel);
  c.appendChild(handRow);

  // Disc color.
  const colorRow = document.createElement('label');
  colorRow.className = 'row';
  colorRow.style.gridTemplateColumns = '1fr auto';
  const colorLabel = document.createElement('span');
  colorLabel.textContent = 'Disc Color';
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = '#e03a2f';
  colorInput.addEventListener('input', () => {
    golfer.setDiscColor(Number.parseInt(colorInput.value.slice(1), 16));
    markEdited();
  });
  colorRow.append(colorLabel, colorInput);
  c.appendChild(colorRow);

  const gripLabel = document.createElement('div');
  gripLabel.className = 'ftitle';
  gripLabel.textContent = 'Grips (Pose — later)';
  gripLabel.style.marginTop = '12px';
  c.appendChild(gripLabel);
  c.appendChild(comingSoonRow('Power Grip'));
  c.appendChild(comingSoonRow('Fan Grip'));
  c.appendChild(comingSoonRow('Putting Grip'));
  c.appendChild(comingSoonRow('Forehand Grip'));
});

// BRANDING — Default Creation fallback uniform colors (NOT team identity).
// These represent the generic dev baseline; a Team can override them later via
// resolveBranding. Branding is independent of pose/proportions.
makeSection(featureLeft, 'branding', 'Branding (Uniform)', (c) => {
  const note = document.createElement('div');
  note.className = 'soon';
  note.textContent = 'Default/fallback uniform colors. Team branding overrides these later.';
  note.style.marginBottom = '8px';
  c.appendChild(note);

  const colorSlot = (
    label: string,
    slot: 'primaryColor' | 'secondaryColor' | 'accentColor',
    apply: (hex: number) => void
  ) => {
    const row = document.createElement('label');
    row.className = 'row';
    row.style.gridTemplateColumns = '1fr auto';
    const span = document.createElement('span');
    span.textContent = label;
    const input = document.createElement('input');
    input.type = 'color';
    input.value = '#' + DEFAULT_BRANDING[slot].toString(16).padStart(6, '0');
    input.addEventListener('input', () => {
      apply(Number.parseInt(input.value.slice(1), 16));
      markEdited();
    });
    row.append(span, input);
    return row;
  };

  c.appendChild(
    colorSlot('Primary (Jersey)', 'primaryColor', (hex) => {
      golfer.setAppearance({ shirtColor: hex });
    })
  );
  c.appendChild(
    colorSlot('Secondary (Shorts)', 'secondaryColor', (hex) => {
      golfer.setAppearance({ shortsColor: hex });
    })
  );
  c.appendChild(
    colorSlot('Accent (Trim)', 'accentColor', (hex) => {
      golfer.setAppearance({ accentColor: hex });
    })
  );
});

// ---- Render loop ----
function tick() {
  golfer.root.updateMatrixWorld(true);
  orbit.update(); // damping for free mouse orbit
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  frameCamera();
}
window.addEventListener('resize', resize);
new ResizeObserver(() => resize()).observe(canvas);

requestAnimationFrame(() => {
  resize();
  frameCamera();
});
// Hydrate the persisted working baseline. Pose values need the sliders
// registered above, so this runs after every section has been built.
applyBaselineDraft(baselineSession.getDraft());
updateStatus();
tick();

// ---- TEMPORARY MASTER RENDER DIAGNOSTIC (one-time) ----
// Logs the full render pipeline state once after init + first frame, and
// samples actual canvas pixels to detect a blank render. Dev-only.
(function renderDiagnostic() {
  const box = new THREE.Box3().setFromObject(golfer.root);
  const v3 = (v: THREE.Vector3) => `(${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)})`;
  const countCanvases = document.querySelectorAll('canvas').length;
  const cs = getComputedStyle(canvas);
  console.info('[MASTER RENDER DIAGNOSTIC]', {
    renderer: {
      exists: !!renderer,
      canvasW: canvas.width,
      canvasH: canvas.height,
      domConnected: renderer.domElement.isConnected,
      glRenderer: glRendererStr,
    },
    canvasStyle: {
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      cssW: canvas.clientWidth,
      cssH: canvas.clientHeight,
    },
    canvasCountOnPage: countCanvases,
    scene: { exists: !!scene, children: scene.children.length },
    camera: {
      pos: v3(camera.position),
      aspect: Number(camera.aspect.toFixed(3)),
      near: camera.near,
      far: camera.far,
    },
    golfer: {
      exists: !!golfer,
      rootVisible: golfer.root.visible,
      rootParentIsScene: golfer.root.parent === scene,
      rootChildren: golfer.root.children.length,
      rootScale: v3(golfer.root.scale),
    },
    bounds: {
      min: v3(box.min),
      max: v3(box.max),
      size: v3(box.getSize(new THREE.Vector3())),
      empty: box.isEmpty(),
    },
  });
  // After 2s, read actual pixels to confirm something was drawn.
  setTimeout(() => {
    try {
      const gl = renderer.getContext();
      const px = new Uint8Array(4);
      gl.readPixels(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        px
      );
      console.info('[MASTER PIXEL CHECK] center pixel RGBA =', Array.from(px));
      debugOverlay(`center pixel RGBA = [${Array.from(px).join(',')}]`);
    } catch (e) {
      console.warn('[MASTER PIXEL CHECK] failed', (e as Error).message);
    }
  }, 2000);

  // Visible on-page debug (no console needed).
  const dbg: string[] = [
    `canvas ${canvas.width}x${canvas.height} css ${canvas.clientWidth}x${canvas.clientHeight}`,
    `canvases on page: ${countCanvases}`,
    `root attached to scene: ${golfer.root.parent === scene}`,
    `root visible: ${golfer.root.visible}`,
    `bounds empty: ${box.isEmpty()} size ${v3(box.getSize(new THREE.Vector3()))}`,
    `GL: ${glRendererStr}`,
  ];
  debugOverlay(...dbg);
})();

function debugOverlay(...lines: string[]) {
  let el = document.getElementById('render-debug');
  if (!el) {
    el = document.createElement('div');
    el.id = 'render-debug';
    el.style.cssText =
      'position:absolute;top:8px;left:8px;z-index:50;background:rgba(0,0,0,.75);color:#4ade80;font:11px monospace;padding:8px 10px;border-radius:6px;line-height:1.5;white-space:pre;';
    document.getElementById('preview')?.appendChild(el);
  }
  const text = lines.join('\n');
  el.textContent = text;
  // Quick copy button.
  let btn = el.querySelector<HTMLButtonElement>('button');
  if (!btn) {
    btn = document.createElement('button');
    btn.textContent = 'Copy';
    btn.style.cssText =
      'margin-top:6px;padding:3px 8px;font:10px monospace;background:#1f6f54;color:#fff;border:none;border-radius:4px;cursor:pointer;pointer-events:auto;';
    el.appendChild(btn);
  }
  btn.onclick = () => {
    navigator.clipboard?.writeText(text).catch(() => {});
    btn!.textContent = 'Copied!';
    setTimeout(() => (btn!.textContent = 'Copy'), 1200);
  };
}
