// DEVELOPMENT-ONLY isolated shoulder diagnostic page. (Master avatar authoring
// lives at /master.html — see the Avatar Development docs browser.)
// Drives the real Golfer rig ONLY through GolferPoseTarget.applyPose() using
// semantic pose data. Sliders are in degrees; converted to radians at the
// UI boundary (applySemanticPose). Camera buttons move the camera, never joints.
import * as THREE from 'three';
import { Golfer, DEFAULT_GOLFER_APPEARANCE } from '@/rendering/Golfer';
import { GolferPoseTarget, type GolferPose } from '@/rendering/avatar';
import { AppearancePanel } from '@/ui/AppearancePanel';

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1726);
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(2, 4, 3);
scene.add(key);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE });
scene.add(golfer.root);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(6, 32),
  new THREE.MeshStandardMaterial({ color: 0x0f1c2e })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const target = new GolferPoseTarget(golfer);

// All values in DEGREES in the UI. Converted to radians at applySemanticPose.
const state = {
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
  yaw: 0, // camera
};

// Degree -> radian conversion happens HERE (UI boundary). GolferPose uses
// radians to match the adapter's unit contract.
function applySemanticPose() {
  const d = THREE.MathUtils.degToRad;
  const pose: GolferPose = {
    id: 'dev/rig-test',
    name: 'Avatar Rig Test',
    leftShoulder: { abduction: d(state.lAbduction), flexion: d(state.lFlexion) },
    leftElbow: { flexion: d(state.lElbow) },
    rightShoulder: { abduction: d(state.rAbduction), flexion: d(state.rFlexion) },
    rightElbow: { flexion: d(state.rElbow) },
    head: { yaw: d(state.headYaw), pitch: d(state.headPitch) },
    leftHip: { flexion: d(state.lHipFlex), abduction: d(state.lHipAbd) },
    leftKnee: { flexion: d(state.lKnee) },
    rightHip: { flexion: d(state.rHipFlex), abduction: d(state.rHipAbd) },
    rightKnee: { flexion: d(state.rKnee) },
  };
  target.applyPose(pose);
}

// Neutral baseline each frame, then apply semantic offsets on top (no drift).
function tick() {
  golfer.applyPoseBaseline();
  applySemanticPose();
  golfer.root.updateMatrixWorld(true);
  renderDebug();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function frameCamera() {
  // Frame the COMPLETE avatar (head through feet) around the body center.
  golfer.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(golfer.root);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = camera.aspect || 1;
  // distance to fit height AND width with generous authoring padding so the
  // feet always clear the bottom edge of the viewport.
  const distH = (size.y * 0.5) / Math.tan(fov / 2);
  const distW = (size.x * 0.5) / (Math.tan(fov / 2) * aspect);
  const dist = Math.max(distH, distW) * 1.3 + 1.2;
  // Aim slightly BELOW the geometric center so the golfer sits a touch higher
  // in frame, leaving clear space below the feet.
  const target = center.clone();
  target.y -= size.y * 0.12;
  camera.position.set(
    target.x + Math.sin(state.yaw) * dist,
    target.y,
    target.z + Math.cos(state.yaw) * dist
  );
  camera.lookAt(target);
  renderCamDebug(box, center, dist);
}

function renderCamDebug(box: THREE.Box3, center: THREE.Vector3, dist: number) {
  const el = document.getElementById('camdebug');
  if (!el) return;
  const size = box.getSize(new THREE.Vector3());
  const f = (n: number) => n.toFixed(2);
  el.textContent = [
    `CAMERA pos ${f(camera.position.x)} ${f(camera.position.y)} ${f(camera.position.z)}`,
    `  target ${f(center.x)} ${f(center.y)} ${f(center.z)}  dist ${f(dist)}  fov ${camera.fov}  aspect ${f(camera.aspect)}`,
    `AVATAR bounds w ${f(size.x)} h ${f(size.y)} d ${f(size.z)}`,
    `  minY ${f(box.min.y)} maxY ${f(box.max.y)}`,
    `CANVAS ${canvas.clientWidth}x${canvas.clientHeight}`,
  ].join('\n');
}

const views: Array<[string, number]> = [
  ['Front', 0],
  ['Right', Math.PI / 2],
  ['Back', Math.PI],
  ['Left', -Math.PI / 2],
];
const viewsEl = document.getElementById('views')!;
views.forEach(([label, yaw]) => {
  const b = document.createElement('button');
  b.textContent = label;
  b.classList.toggle('is-active', yaw === 0);
  b.addEventListener('click', () => {
    state.yaw = yaw;
    viewsEl.querySelectorAll('button').forEach((x) => x.classList.remove('is-active'));
    b.classList.add('is-active');
    frameCamera();
  });
  viewsEl.appendChild(b);
});

type Key = keyof typeof state;
interface Ctl {
  group: string;
  label: string;
  key: Key;
  min: number;
  max: number;
}

const CONTROLS: Ctl[] = [
  { group: 'LEFT ARM', label: 'Out / In', key: 'lAbduction', min: 0, max: 140 },
  { group: 'LEFT ARM', label: 'Forward / Back', key: 'lFlexion', min: -40, max: 140 },
  { group: 'LEFT ARM', label: 'Elbow Bend', key: 'lElbow', min: 0, max: 140 },
  { group: 'RIGHT ARM', label: 'Out / In', key: 'rAbduction', min: 0, max: 140 },
  { group: 'RIGHT ARM', label: 'Forward / Back', key: 'rFlexion', min: -40, max: 140 },
  { group: 'RIGHT ARM', label: 'Elbow Bend', key: 'rElbow', min: 0, max: 140 },
  { group: 'HEAD', label: 'Face Left / Right', key: 'headYaw', min: -80, max: 80 },
  { group: 'HEAD', label: 'Look Up / Down', key: 'headPitch', min: -50, max: 50 },
  { group: 'LEFT LEG', label: 'Step Fwd / Back', key: 'lHipFlex', min: -60, max: 90 },
  { group: 'LEFT LEG', label: 'Leg Out / In', key: 'lHipAbd', min: 0, max: 60 },
  { group: 'LEFT LEG', label: 'Knee Bend', key: 'lKnee', min: 0, max: 120 },
  { group: 'RIGHT LEG', label: 'Step Fwd / Back', key: 'rHipFlex', min: -60, max: 90 },
  { group: 'RIGHT LEG', label: 'Leg Out / In', key: 'rHipAbd', min: 0, max: 60 },
  { group: 'RIGHT LEG', label: 'Knee Bend', key: 'rKnee', min: 0, max: 120 },
];

const controlsEl = document.getElementById('controls')!;
const inputs = new Map<Key, { input: HTMLInputElement; out: HTMLOutputElement }>();
let lastGroup = '';
CONTROLS.forEach((c) => {
  if (c.group !== lastGroup) {
    const g = document.createElement('div');
    g.className = 'grp';
    g.textContent = c.group;
    controlsEl.appendChild(g);
    lastGroup = c.group;
  }
  const row = document.createElement('div');
  row.className = 'row';
  const lab = document.createElement('label');
  const span = document.createElement('span');
  span.textContent = c.label;
  const out = document.createElement('output');
  out.textContent = '0°';
  lab.append(span, out);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(c.min);
  input.max = String(c.max);
  input.step = '1';
  input.value = '0';
  input.addEventListener('input', () => {
    state[c.key] = Number(input.value);
    out.textContent = `${input.value}°`;
  });
  row.append(lab, input);
  controlsEl.appendChild(row);
  inputs.set(c.key, { input, out });
});

document.getElementById('reset')!.addEventListener('click', () => {
  CONTROLS.forEach((c) => {
    state[c.key] = 0;
    const rec = inputs.get(c.key)!;
    rec.input.value = '0';
    rec.out.textContent = '0°';
  });
});

function renderDebug() {
  const sL = golfer.getJointGroup('shoulderL');
  const sR = golfer.getJointGroup('shoulderR');
  const eL = golfer.getJointGroup('elbowL');
  const eR = golfer.getJointGroup('elbowR');
  const hd = golfer.getJointGroup('head');
  const hL = golfer.getJointGroup('hipL');
  const hR = golfer.getJointGroup('hipR');
  const kL = golfer.getJointGroup('kneeL');
  const kR = golfer.getJointGroup('kneeR');
  const f = (n: number) => n.toFixed(2);
  const rot = (g?: { rotation: THREE.Euler }) =>
    g ? `x ${f(g.rotation.x)}  y ${f(g.rotation.y)}  z ${f(g.rotation.z)}` : '-';
  document.getElementById('debug')!.textContent = [
    `SEMANTIC (deg)`,
    `ARM L  abd ${state.lAbduction}  flex ${state.lFlexion}  elbow ${state.lElbow}`,
    `ARM R  abd ${state.rAbduction}  flex ${state.rFlexion}  elbow ${state.rElbow}`,
    `HEAD yaw ${state.headYaw}  pitch ${state.headPitch}`,
    `LEG L  step ${state.lHipFlex}  out ${state.lHipAbd}  knee ${state.lKnee}`,
    `LEG R  step ${state.rHipFlex}  out ${state.rHipAbd}  knee ${state.rKnee}`,
    ``,
    `ACTUAL THREE.JS ROTATION (diagnostic only)`,
    `shoulderL  ${rot(sL)}`,
    `shoulderR  ${rot(sR)}`,
    `elbowL     ${rot(eL)}`,
    `elbowR     ${rot(eR)}`,
    `head       ${rot(hd)}`,
    `hipL       ${rot(hL)}`,
    `hipR       ${rot(hR)}`,
    `kneeL      ${rot(kL)}`,
    `kneeR      ${rot(kR)}`,
  ].join('\n');
}

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) {
    return;
  }
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  frameCamera();
}
window.addEventListener('resize', resize);
// Refit when the grid reflows (left panel open/close) too.
new ResizeObserver(() => resize()).observe(canvas);

// ---- Avatar Development docs browser (dev-only) ----
const DOCS_FOLDERS = [
  'README',
  'architecture',
  'anatomy',
  'rig',
  'poses',
  'actions',
  'backhand',
  'forehand',
  'putting',
  'overhand',
  'roller',
  'locomotion',
  'reactions',
  'pose-editor',
  'diagnostics',
  'references',
  'prompts',
] as const;

function renderMarkdown(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = md.split('\n');
  let html = '';
  let inCode = false;
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      html += inCode ? '</code></pre>' : '<pre><code>';
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      html += esc(line) + '\n';
      continue;
    }
    const t = line.trimEnd();
    if (t.startsWith('### ')) html += `<h3>${esc(t.slice(4))}</h3>`;
    else if (t.startsWith('## ')) html += `<h2>${esc(t.slice(3))}</h2>`;
    else if (t.startsWith('# ')) html += `<h1>${esc(t.slice(2))}</h1>`;
    else if (t.startsWith('> ')) html += `<blockquote>${esc(t.slice(2))}</blockquote>`;
    else if (t.startsWith('- ') || t.startsWith('* ')) html += `<div>• ${esc(t.slice(2))}</div>`;
    else if (t.trim() === '') html += '<br/>';
    else html += `<div>${esc(t)}</div>`;
  }
  if (inCode) html += '</code></pre>';
  return html;
}

function buildDocsBrowser() {
  const overlay = document.getElementById('docs-overlay')!;
  const nav = document.getElementById('docs-nav')!;
  const content = document.getElementById('docs-content')!;
  const open = document.getElementById('avatar-dev')!;
  const close = document.getElementById('docs-close')!;

  const show = async (folder: string, btn: HTMLButtonElement) => {
    nav.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const url =
      folder === 'README'
        ? '/avatar-development/README.md'
        : `/avatar-development/${folder}/README.md`;
    content.textContent = 'Loading…';
    try {
      const res = await fetch(url);
      const md = await res.text();
      content.innerHTML = renderMarkdown(md);
    } catch {
      content.textContent = `Could not load ${url}`;
    }
  };

  DOCS_FOLDERS.forEach((folder, i) => {
    const b = document.createElement('button');
    b.textContent = folder === 'README' ? 'Overview' : folder;
    b.addEventListener('click', () => show(folder, b));
    nav.appendChild(b);
    if (i === 0) b.classList.add('is-active');
  });

  open.addEventListener('click', () => {
    overlay.hidden = false;
    show('README', nav.querySelector('button')!);
  });
  close.addEventListener('click', () => {
    overlay.hidden = true;
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.hidden = true;
  });
}

// ---- Left tools panel (Change Look + Avatar Development), collapsible ----
function buildLeftPanel() {
  const body = document.getElementById('left-body')!;

  const changeLookLabel = document.createElement('div');
  changeLookLabel.className = 'appearance-face-group-heading';
  changeLookLabel.textContent = 'Change Look';
  body.appendChild(changeLookLabel);
  // Inline appearance editor (Face/Body collapsible sections) editing THIS
  // golfer directly — no separate preview image.
  new AppearancePanel(body, golfer, () => frameCamera());

  const docsBtn = document.createElement('button');
  docsBtn.textContent = 'Avatar Development';
  docsBtn.addEventListener('click', () => {
    document.getElementById('avatar-dev')!.click();
  });
  body.appendChild(docsBtn);
}

buildLeftPanel();
buildDocsBrowser();
// Defer first fit until after layout settles so canvas clientWidth/Height are real.
requestAnimationFrame(() => {
  resize();
  frameCamera();
});
tick();
