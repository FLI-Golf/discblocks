// MASTER AVATAR — permanent avatar rig & pose authoring workspace.
// Uses the SAME procedural Golfer as gameplay. Semantic controls flow:
//   Body Feature control -> GolferPose -> GolferPoseTarget -> Golfer rig.
// The UI never directly mutates Three.js joints.
import * as THREE from 'three';
import { Golfer, DEFAULT_GOLFER_APPEARANCE } from '@/rendering/Golfer';
import { GolferPoseTarget, type GolferPose } from '@/rendering/avatar';

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

const poseTarget = new GolferPoseTarget(golfer);

// ---- Current draft pose (degrees in UI -> radians in GolferPose) ----
const draft = { lAbduction: 0, rAbduction: 0 };
let camYaw = 0;

function applyDraft() {
  const d = THREE.MathUtils.degToRad;
  const pose: GolferPose = {
    id: 'dev/master-draft',
    name: 'Master Draft',
    leftShoulder: { abduction: d(draft.lAbduction) },
    rightShoulder: { abduction: d(draft.rAbduction) },
  };
  golfer.applyPoseBaseline();
  poseTarget.applyPose(pose);
}

// ---- Full-body camera fit ----
function frameCamera() {
  golfer.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(golfer.root);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = camera.aspect || 1;
  const distH = (size.y * 0.5) / Math.tan(fov / 2);
  const distW = (size.x * 0.5) / (Math.tan(fov / 2) * aspect);
  const dist = Math.max(distH, distW) * 1.3 + 1.2;
  const target = center.clone();
  target.y -= size.y * 0.08;
  camera.position.set(
    target.x + Math.sin(camYaw) * dist,
    target.y,
    target.z + Math.cos(camYaw) * dist
  );
  camera.lookAt(target);
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
  viewsEl.querySelectorAll('button').forEach((x, i) => x.classList.toggle('is-active', i === 0));
  frameCamera();
});
viewsEl.appendChild(resetView);

// ---- Body Features sections ----
let expanded: string | null = null;
const featureList = document.getElementById('feature-list')!;

function section(id: string, title: string, build: (c: HTMLElement) => void) {
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
    featureList.querySelectorAll<HTMLElement>('.sect').forEach((el) => {
      const open = el === s && expanded === id;
      const b = el.querySelector<HTMLElement>('.sect-body');
      const c = el.querySelector<HTMLElement>('.sect-head span:last-child');
      if (b) b.hidden = !open;
      if (c) c.textContent = open ? '▾' : '▸';
    });
  });
  s.append(head, body);
  featureList.appendChild(s);
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
  });
  row.append(span, out, input);
  return row;
}

function comingSoon(c: HTMLElement) {
  const d = document.createElement('div');
  d.className = 'soon';
  d.textContent = 'Coming Soon';
  c.appendChild(d);
}

section('head', 'Head', (c) => comingSoon(c));
section('torso', 'Torso', (c) => comingSoon(c));
section('leftArm', 'Left Arm', (c) => {
  c.appendChild(
    slider(
      'Arm Out / In',
      () => draft.lAbduction,
      (v) => (draft.lAbduction = v)
    )
  );
});
section('rightArm', 'Right Arm', (c) => {
  c.appendChild(
    slider(
      'Arm Out / In',
      () => draft.rAbduction,
      (v) => (draft.rAbduction = v)
    )
  );
});
section('hips', 'Hips', (c) => comingSoon(c));
section('leftLeg', 'Left Leg', (c) => comingSoon(c));
section('rightLeg', 'Right Leg', (c) => comingSoon(c));
section('hands', 'Hands / Wrists', (c) => comingSoon(c));
section('disc', 'Disc', (c) => comingSoon(c));

// ---- Render loop ----
function tick() {
  golfer.root.updateMatrixWorld(true);
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
applyDraft();
tick();
