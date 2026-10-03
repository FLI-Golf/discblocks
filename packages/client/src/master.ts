// MASTER AVATAR — permanent avatar rig & pose authoring workspace.
// Uses the SAME procedural Golfer as gameplay. Semantic controls flow:
//   Body Feature control -> GolferPose -> GolferPoseTarget -> Golfer rig.
// The UI never directly mutates Three.js joints.
import * as THREE from 'three';
import { Golfer, DEFAULT_GOLFER_APPEARANCE } from '@/rendering/Golfer';
import { GolferPoseTarget, PoseLibrary, type GolferPose } from '@/rendering/avatar';
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

const poseTarget = new GolferPoseTarget(golfer);

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
};
let camYaw = 0;
const poseLibrary = new PoseLibrary();

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

// ---- Save Pose + Pose Library (in-memory, builds the library as we author) ----
const foot = document.getElementById('master-foot')!;
const saveBtn = document.createElement('button');
saveBtn.textContent = 'Save Pose';
saveBtn.style.borderColor = 'rgba(94,234,212,.5)';
saveBtn.style.color = '#5eead4';
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

foot.insertBefore(savedList, foot.children[1] ?? null);
foot.insertBefore(saveBtn, savedList);

// ---- Layout: Change Look (right menu), Body Features upper (left menu),
// ---- lower-body sections (bottom nav) ----
let expanded: string | null = null;
const featureLeft = document.getElementById('feature-left')!;
const featureRight = document.getElementById('feature-right')!;
const lowerNav = document.getElementById('lower')!;

// Change Look (appearance) editor in the RIGHT menu — edits the same golfer,
// no separate preview.
new AppearancePanel(featureRight, golfer, () => frameCamera());

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
    | 'armLength'
    | 'thighLength'
    | 'armThickness',
  min: number,
  max: number
) {
  const row = document.createElement('label');
  row.className = 'row';
  const span = document.createElement('span');
  span.textContent = label;
  const out = document.createElement('output');
  const get = () => golfer.appearance.profile?.[key] ?? 1;
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
    frameCamera();
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

// Upper-body / head features -> LEFT menu
makeSection(featureLeft, 'headPose', 'Head (Pose)', (c) => {
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
makeSection(featureLeft, 'torso', 'Torso', (c) => {
  const propLabel = document.createElement('div');
  propLabel.className = 'ftitle';
  propLabel.textContent = 'Proportions';
  c.appendChild(propLabel);
  c.appendChild(appearanceSlider('Shorter / Taller', 'torsoLength', 0.5, 1.5));
  c.appendChild(appearanceSlider('Wide / Skinny', 'torsoTaper', 0.4, 1.4));
  c.appendChild(appearanceSlider('Arm Length (Both)', 'armLength', 0.6, 1.6));
  c.appendChild(appearanceSlider('Arm Thickness (Both)', 'armThickness', 0.5, 1.6));
  const poseLabel = document.createElement('div');
  poseLabel.className = 'ftitle';
  poseLabel.textContent = 'Pose';
  poseLabel.style.marginTop = '12px';
  c.appendChild(poseLabel);
  c.appendChild(
    slider(
      'Coil',
      () => draft.torsoCoil,
      (v) => (draft.torsoCoil = v),
      -90,
      90
    )
  );
  c.appendChild(
    slider(
      'Lean',
      () => draft.torsoLean,
      (v) => (draft.torsoLean = v),
      -45,
      45
    )
  );
});
makeSection(featureLeft, 'leftArm', "Left Arm (golfer's left)", (c) => {
  const hint = document.createElement('div');
  hint.className = 'soon';
  hint.textContent = "Golfer's anatomical left — appears on screen-right in Front view.";
  c.appendChild(hint);
  c.appendChild(
    slider(
      'Arm Out / In',
      () => draft.lAbduction,
      (v) => (draft.lAbduction = v)
    )
  );
});
makeSection(featureLeft, 'rightArm', "Right Arm (golfer's right)", (c) => {
  const hint = document.createElement('div');
  hint.className = 'soon';
  hint.textContent = "Golfer's anatomical right — appears on screen-left in Front view.";
  c.appendChild(hint);
  c.appendChild(
    slider(
      'Arm Out / In',
      () => draft.rAbduction,
      (v) => (draft.rAbduction = v)
    )
  );
});
makeSection(featureLeft, 'lowerBody', 'Lower Body', (c) => {
  const propLabel = document.createElement('div');
  propLabel.className = 'ftitle';
  propLabel.textContent = 'Proportions';
  c.appendChild(propLabel);
  c.appendChild(appearanceSlider('Leg Length', 'legLength', 0.6, 1.5));
  c.appendChild(appearanceSlider('Thigh Length (Hip to Knee)', 'thighLength', 0.6, 1.6));
  c.appendChild(appearanceSlider('Leg Taper', 'legTaper', 0.5, 1.5));
  c.appendChild(appearanceSlider('Hip Width', 'hipWidth', 0.5, 1.5));
  const poseLabel = document.createElement('div');
  poseLabel.className = 'ftitle';
  poseLabel.textContent = 'Pose';
  poseLabel.style.marginTop = '12px';
  c.appendChild(poseLabel);
  c.appendChild(document.createTextNode('Left Leg'));
  c.appendChild(
    slider(
      'Step Fwd / Back',
      () => draft.lHipFlex,
      (v) => (draft.lHipFlex = v),
      -60,
      90
    )
  );
  c.appendChild(
    slider(
      'Leg Out / In',
      () => draft.lHipAbd,
      (v) => (draft.lHipAbd = v),
      0,
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
  const sep = document.createElement('div');
  sep.style.cssText = 'border-top:1px solid rgba(255,255,255,.08);margin:10px 0;';
  c.appendChild(sep);
  c.appendChild(document.createTextNode('Right Leg'));
  c.appendChild(
    slider(
      'Step Fwd / Back',
      () => draft.rHipFlex,
      (v) => (draft.rHipFlex = v),
      -60,
      90
    )
  );
  c.appendChild(
    slider(
      'Leg Out / In',
      () => draft.rHipAbd,
      (v) => (draft.rHipAbd = v),
      0,
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
});

// Hands/Wrists and Disc organizational sections live in the bottom nav.
makeSection(lowerNav, 'hands', 'Hands / Wrists', (c) => comingSoon(c));
makeSection(lowerNav, 'disc', 'Disc', (c) => comingSoon(c));

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
