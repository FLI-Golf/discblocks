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
  lHipFlex: 0,
  lHipAbd: 0,
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
    leftShoulder: { abduction: d(draft.lAbduction) },
    rightShoulder: { abduction: d(draft.rAbduction) },
    leftHip: { flexion: d(draft.lHipFlex), abduction: d(draft.lHipAbd) },
    leftKnee: { flexion: d(draft.lKnee) },
    rightHip: { flexion: d(draft.rHipFlex), abduction: d(draft.rHipAbd) },
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
    | 'armThickness'
    | 'neckWidth'
    | 'neckLength'
    | 'neckVertical'
    | 'neckForward'
    | 'trapeziusWidth'
    | 'trapeziusHeight'
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

function slider(label: string, get: () => number, set: (v: number) => void, min = 0, max = 140) {
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
  c.appendChild(appearanceSlider('Trapezius Width', 'trapeziusWidth', 0.5, 1.8));
  c.appendChild(appearanceSlider('Trapezius Height', 'trapeziusHeight', 0.0, 1.8));
});

// TORSO
makeSection(featureLeft, 'torso', 'Torso', (c) => {
  const propLabel = document.createElement('div');
  propLabel.className = 'ftitle';
  propLabel.textContent = 'Proportions';
  c.appendChild(propLabel);
  c.appendChild(appearanceSlider('Shorter / Taller', 'torsoLength', 0.3, 1.5));
  c.appendChild(appearanceSlider('Wide / Skinny', 'torsoTaper', 0.4, 1.4));
  c.appendChild(appearanceSlider('Chest Width', 'chestWidth', 0.6, 1.6));
  c.appendChild(appearanceSlider('Chest Depth (Side)', 'chestDepth', 0.6, 1.6));
  c.appendChild(appearanceSlider('Lower Torso Width', 'lowerTorsoWidth', 0.5, 1.8));
  c.appendChild(appearanceSlider('Lower Torso Depth', 'lowerTorsoDepth', 0.5, 1.8));
  c.appendChild(appearanceSlider('Waist Size', 'waistSize', 0.6, 1.6));
  c.appendChild(appearanceSlider('Shoulder Width', 'shoulderWidth', 0.6, 1.6));
  c.appendChild(appearanceSlider('Shoulders In / Out', 'shoulderInOut', 0.4, 1.5));
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
      140
    )
  );
  c.appendChild(comingSoonRow('Forward / Back'));
  c.appendChild(comingSoonRow('Arm Twist'));
  c.appendChild(comingSoonRow('Elbow Bend'));
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
      140
    )
  );
  c.appendChild(comingSoonRow('Forward / Back'));
  c.appendChild(comingSoonRow('Arm Twist'));
  c.appendChild(comingSoonRow('Elbow Bend'));
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
  c.appendChild(comingSoonRow('Hip Rotation'));
  c.appendChild(
    slider(
      'Knee Bend',
      () => draft.lKnee,
      (v) => (draft.lKnee = v),
      0,
      120
    )
  );
  c.appendChild(comingSoonRow('Foot Direction'));
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
  c.appendChild(comingSoonRow('Hip Rotation'));
  c.appendChild(
    slider(
      'Knee Bend',
      () => draft.rKnee,
      (v) => (draft.rKnee = v),
      0,
      120
    )
  );
  c.appendChild(comingSoonRow('Foot Direction'));
});

// LEGS (PROPORTIONS) — both-legs baseline geometry, grouped together.
makeSection(featureLeft, 'legsProp', 'Legs (Proportions)', (c) => {
  c.appendChild(appearanceSlider('Leg Length', 'legLength', 0.3, 1.5));
  c.appendChild(appearanceSlider('Thigh Length (Hip to Knee)', 'thighLength', 0.6, 1.6));
  c.appendChild(appearanceSlider('Leg Width (Both)', 'legTaper', 0.4, 1.8));
  c.appendChild(appearanceSlider('Hip Width', 'hipWidth', 0.5, 1.5));
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
  c.appendChild(appearanceSlider('Shorts Width', 'shortsWidth', 0.6, 2.2));
  c.appendChild(appearanceSlider('Shorts Length', 'shortsLength', 0.4, 2.2));
  c.appendChild(appearanceSlider('Shorts Up / Down', 'shortsRise', -0.3, 0.3));
  c.appendChild(appearanceSlider('Shorts Forward / Back', 'shortsForward', -0.15, 0.15));
  c.appendChild(appearanceSlider('Shorts Depth', 'shortsDepth', 0.2, 3));
  c.appendChild(appearanceSlider('Short Leg Width', 'shortLegWidth', 0.5, 2.2));
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
    ['right', 'Right Hand'],
    ['left', 'Left Hand'],
  ].forEach(([v, label]) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = label;
    handSel.appendChild(o);
  });
  handSel.value = 'right';
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
