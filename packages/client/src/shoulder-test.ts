// DEVELOPMENT-ONLY shoulder adapter test page.
// Drives the real Golfer rig ONLY through GolferPoseTarget.applyPose() using
// semantic pose data. Sliders are in degrees; converted to radians at the
// UI boundary (applySemanticPose). Camera buttons move the camera, never joints.
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

const target = new GolferPoseTarget(golfer);

const state = { leftDeg: 0, rightDeg: 0, yaw: 0 };

// Degree -> radian conversion happens HERE (UI boundary). GolferPose.abduction
// is passed in radians to match the existing adapter's unit contract.
function applySemanticPose() {
  const pose: GolferPose = {
    id: 'dev/shoulder-test',
    name: 'Shoulder Adapter Test',
    leftShoulder: { abduction: THREE.MathUtils.degToRad(state.leftDeg) },
    rightShoulder: { abduction: THREE.MathUtils.degToRad(state.rightDeg) },
  };
  target.applyPose(pose);
}

// Neutral baseline each frame, then apply semantic abduction on top.
function tick() {
  golfer.applyPoseBaseline();
  applySemanticPose();
  golfer.root.updateMatrixWorld(true);
  renderDebug();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function frameCamera() {
  const head = golfer.getJointGroup('head');
  const targetPos = head ? head.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 3, 0);
  const dist = 7;
  camera.position.set(
    targetPos.x + Math.sin(state.yaw) * dist,
    targetPos.y - 0.5,
    targetPos.z + Math.cos(state.yaw) * dist
  );
  camera.lookAt(targetPos);
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

const l = document.getElementById('l') as HTMLInputElement;
const r = document.getElementById('r') as HTMLInputElement;
const lv = document.getElementById('lv')!;
const rv = document.getElementById('rv')!;
l.addEventListener('input', () => {
  state.leftDeg = Number(l.value);
  lv.textContent = `${state.leftDeg}°`;
});
r.addEventListener('input', () => {
  state.rightDeg = Number(r.value);
  rv.textContent = `${state.rightDeg}°`;
});
document.getElementById('reset')!.addEventListener('click', () => {
  state.leftDeg = 0;
  state.rightDeg = 0;
  l.value = '0';
  r.value = '0';
  lv.textContent = '0°';
  rv.textContent = '0°';
});

function renderDebug() {
  const sL = golfer.getJointGroup('shoulderL');
  const sR = golfer.getJointGroup('shoulderR');
  const f = (n: number) => n.toFixed(3);
  document.getElementById('debug')!.textContent = [
    `UI Left Shoulder:  ${state.leftDeg}°`,
    `UI Right Shoulder: ${state.rightDeg}°`,
    ``,
    `Pose Left Shoulder:  ${THREE.MathUtils.degToRad(state.leftDeg).toFixed(3)} rad`,
    `Pose Right Shoulder: ${THREE.MathUtils.degToRad(state.rightDeg).toFixed(3)} rad`,
    ``,
    `Actual left shoulder rotation:`,
    `  x ${sL ? f(sL.rotation.x) : '-'}  y ${sL ? f(sL.rotation.y) : '-'}  z ${sL ? f(sL.rotation.z) : '-'}`,
    `Actual right shoulder rotation:`,
    `  x ${sR ? f(sR.rotation.x) : '-'}  y ${sR ? f(sR.rotation.y) : '-'}  z ${sR ? f(sR.rotation.z) : '-'}`,
  ].join('\n');
}

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

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

buildDocsBrowser();
resize();
frameCamera();
tick();
