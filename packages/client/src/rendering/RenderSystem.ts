import type { System } from 'bitecs';
import { Transform } from '@/core/components';
import { transformQuery } from '@/core/ecs';
import * as THREE from 'three';
import { Scene } from './Scene';

interface MeshComponent {
  mesh: THREE.Mesh;
}

const Mesh = new Map<number, MeshComponent>();
let sceneRef: Scene;

export function initRenderSystem(scene: Scene) {
  sceneRef = scene;
}

export function getScene(): Scene | undefined {
  return sceneRef;
}

export function addMesh(entity: number, mesh: THREE.Mesh) {
  Mesh.set(entity, { mesh });
  sceneRef.scene.add(mesh);
}

/** For visuals that are animated directly rather than driven by a Transform component. */
export function addSceneObject(object: THREE.Object3D) {
  sceneRef.scene.add(object);
}

export function removeSceneObject(object: THREE.Object3D) {
  sceneRef.scene.remove(object);
}

export function removeMesh(entity: number) {
  const meshComp = Mesh.get(entity);
  if (meshComp) {
    sceneRef.scene.remove(meshComp.mesh);
    meshComp.mesh.geometry.dispose();
    if (meshComp.mesh.material instanceof THREE.Material) {
      meshComp.mesh.material.dispose();
    }
    Mesh.delete(entity);
  }
}

export function createBoxMesh(
  width: number,
  height: number,
  depth: number,
  color: number
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.3,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createSphereMesh(radius: number, color: number): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 32, 16);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.5,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createCylinderMesh(radius: number, height: number, color: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 24);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.7,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createDiscMesh(radius: number, thickness: number, color: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(radius, radius * 0.92, thickness, 28);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Open-ended tube used for the basket tray and rim walls. */
export function createBandMesh(
  radius: number,
  height: number,
  color: number,
  opacity: number = 1
): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.7,
    side: THREE.DoubleSide,
    transparent: opacity < 1,
    opacity,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createTorusMesh(radius: number, tube: number, color: number): THREE.Mesh {
  const geometry = new THREE.TorusGeometry(radius, tube, 12, 48);
  geometry.rotateX(Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.8,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createCapsuleMesh(radius: number, height: number, color: number): THREE.Mesh {
  const geometry = new THREE.CapsuleGeometry(radius, height, 4, 8);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.25,
    metalness: 0.9,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

let netTexture: THREE.Texture | null = null;

function getNetTexture(): THREE.Texture {
  if (netTexture) {
    return netTexture;
  }

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(245, 248, 255, 0.95)';
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, size, size);

  netTexture = new THREE.CanvasTexture(canvas);
  netTexture.wrapS = THREE.RepeatWrapping;
  netTexture.wrapT = THREE.RepeatWrapping;
  return netTexture;
}

/** Protective netting: a thin slab whose mesh pattern comes from a repeating alpha texture. */
export function createNetMesh(width: number, height: number, depth: number): THREE.Mesh {
  const texture = getNetTexture().clone();
  texture.needsUpdate = true;
  texture.repeat.set(Math.max(width, depth) / 1.5, height / 1.5);

  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    alphaMap: texture,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geometry, material);
}

export const LOGO_URL = '/fliGolf_rwb.png';

// yac.png and am.jpg ship with opaque white backgrounds, so those boards stay white.
const SPONSOR_BOARDS = [
  { url: LOGO_URL, bg: '#ffffff' },
  { url: '/yac.png', bg: '#ffffff' },
  { url: '/neology_logo.png', bg: '#0f2545' },
  { url: '/am.jpg', bg: '#ffffff' },
];

/** One sponsor board spans this many world units before the texture repeats. */
const AD_PANEL_WIDTH = 12;
const AD_PANEL_COUNT = SPONSOR_BOARDS.length;

let adCanvas: HTMLCanvasElement | null = null;
// Ad textures built before the logos finish loading; refreshed as each arrives, then dropped.
let pendingAdTextures: THREE.CanvasTexture[] | null = [];

function buildAdCanvas(): HTMLCanvasElement {
  if (adCanvas) {
    return adCanvas;
  }

  const panelWidth = 512;
  const panelHeight = 256;
  const canvas = document.createElement('canvas');
  canvas.width = panelWidth * AD_PANEL_COUNT;
  canvas.height = panelHeight;

  const ctx = canvas.getContext('2d')!;
  let remaining = SPONSOR_BOARDS.length;

  const drawTrim = (x: number) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.fillRect(x + panelWidth - 6, 0, 6, panelHeight);
    ctx.fillStyle = 'rgba(18, 48, 92, 0.85)';
    ctx.fillRect(x, 0, panelWidth, 14);
    ctx.fillRect(x, panelHeight - 14, panelWidth, 14);
  };

  SPONSOR_BOARDS.forEach((sponsor, i) => {
    const x = i * panelWidth;

    ctx.fillStyle = sponsor.bg;
    ctx.fillRect(x, 0, panelWidth, panelHeight);
    drawTrim(x);

    const image = new Image();
    image.onload = () => {
      const scale = Math.min(
        (panelWidth * 0.84) / image.width,
        (panelHeight * 0.72) / image.height
      );
      const w = image.width * scale;
      const h = image.height * scale;
      ctx.drawImage(image, x + (panelWidth - w) / 2, (panelHeight - h) / 2, w, h);
      drawTrim(x);

      pendingAdTextures?.forEach((texture) => {
        texture.needsUpdate = true;
      });

      remaining -= 1;
      if (remaining === 0) {
        pendingAdTextures = null;
      }
    };
    image.src = sponsor.url;
  });

  adCanvas = canvas;
  return canvas;
}

/** Perimeter board carrying repeating sponsor advertising along its long axis. */
export function createAdWallMesh(width: number, height: number, depth: number): THREE.Mesh {
  const span = Math.max(width, depth);
  const texture = new THREE.CanvasTexture(buildAdCanvas());
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.repeat.set(span / (AD_PANEL_WIDTH * AD_PANEL_COUNT), 1);
  pendingAdTextures?.push(texture);

  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.75,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export const AD_SPONSOR_COUNT = AD_PANEL_COUNT;

/** Sponsor advertising wrapped around a pillar, showing `panelsAround` boards per revolution. */
export function createAdCylinderMesh(
  radius: number,
  height: number,
  sponsorIndex: number,
  panelsAround: number = 2
): THREE.Mesh {
  const texture = new THREE.CanvasTexture(buildAdCanvas());
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.repeat.set(panelsAround / AD_PANEL_COUNT, 1);
  texture.offset.set((sponsorIndex % AD_PANEL_COUNT) / AD_PANEL_COUNT, 0);
  pendingAdTextures?.push(texture);

  const geometry = new THREE.CylinderGeometry(radius, radius, height, 40, 1);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.7,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A single freestanding sponsor board showing one logo, for panels separated by gaps. */
export function createAdPanelMesh(
  sponsorIndex: number,
  width: number,
  height: number,
  depth: number
): THREE.Mesh {
  const texture = new THREE.CanvasTexture(buildAdCanvas());
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.repeat.set(1 / AD_PANEL_COUNT, 1);
  texture.offset.set((sponsorIndex % AD_PANEL_COUNT) / AD_PANEL_COUNT, 0);
  pendingAdTextures?.push(texture);

  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.7,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geometry, material);
  // Perimeter boards would otherwise streak long shadows back across the fairway.
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

const TEAMS = [
  { name: 'ACE MAKERS', url: '/team_logos/ace_makers_logo_1senu6r6ys.png', score: 7 },
  { name: 'DISC DYNASTY', url: '/team_logos/disc_dynasty_regular_kgg3frih96.png', score: 5 },
];

export const LEAGUE_LOGO_URL = '/team_logos/fli_logo.png';

/** League crest on a solid banner, for the roof flags. */
export function createFlagTexture(background: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const crest = new Image();
  crest.onload = () => {
    const scale = Math.min(
      (canvas.width * 0.5) / crest.width,
      (canvas.height * 0.85) / crest.height
    );
    const w = crest.width * scale;
    const h = crest.height * scale;
    ctx.drawImage(crest, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    texture.needsUpdate = true;
  };
  crest.src = LEAGUE_LOGO_URL;

  return texture;
}

const geometryForBoard = (width: number, height: number, depth: number) =>
  new THREE.BoxGeometry(width, height, depth);

const OTHER_TEAMS = [
  {
    name: 'CHAIN BREAKERS',
    score: 6,
    url: '/team_logos/chain_breakers_regular_01_4ticluji4m.jpg',
  },
  { name: 'CHAIN SEEKERS', score: 4, url: '/team_logos/chain_seekers_mini_01_ebssfkymie.jpg' },
  { name: 'DISK JESTERS', score: 9, url: '/team_logos/disk_jesters_mini_ll9ttpclk3.png' },
  { name: 'FAIRWAY BOMBERS', score: 3, url: '/team_logos/fair_way_bombers_mini_8k4kmyawb1.png' },
  { name: 'GLIDE MASTERS', score: 8, url: '/team_logos/glide_masters_miini_9jiee04jq3.png' },
  { name: 'MIDAS TOUCH', score: 5, url: '/team_logos/midas_touch_mini_eqgncmsn7n.png' },
];

/** How many world units one pass of the ticker text occupies. */
const TICKER_SPAN = 120;

/** Scrolling results strip. Advance `userData.scrollTexture.offset.x` to animate it. */
export function createTickerMesh(width: number, height: number): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 3072;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  const step = canvas.width / OTHER_TEAMS.length;
  const chipSize = 150;
  const chipX = 20;
  const chipY = (canvas.height - chipSize) / 2;

  ctx.fillStyle = '#071019';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.repeat.set(width / TICKER_SPAN, 1);

  OTHER_TEAMS.forEach((team, i) => {
    const x = i * step;

    // Light chip behind every crest, so opaque-white minis do not read as stray boxes.
    ctx.fillStyle = '#f2f4f8';
    ctx.fillRect(x + chipX, chipY, chipSize, chipSize);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8eef6';
    ctx.font = 'bold 54px Helvetica, Arial, sans-serif';
    ctx.fillText(team.name, x + chipX + chipSize + 28, 74);

    ctx.fillStyle = '#ffd54a';
    ctx.font = 'bold 62px Helvetica, Arial, sans-serif';
    ctx.fillText(String(team.score), x + chipX + chipSize + 28, 140);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(x + step - 4, 20, 3, canvas.height - 40);

    const image = new Image();
    image.onload = () => {
      const pad = 14;
      const scale = Math.min(
        (chipSize - pad * 2) / image.width,
        (chipSize - pad * 2) / image.height
      );
      const w = image.width * scale;
      const h = image.height * scale;
      ctx.drawImage(image, x + chipX + (chipSize - w) / 2, chipY + (chipSize - h) / 2, w, h);
      texture.needsUpdate = true;
    };
    image.src = team.url;
  });

  const face = new THREE.MeshBasicMaterial({ map: texture });
  const frame = new THREE.MeshStandardMaterial({ color: 0x14202e, roughness: 0.8 });
  const mesh = new THREE.Mesh(geometryForBoard(width, height, 0.8), [
    frame,
    frame,
    frame,
    frame,
    face,
    frame,
  ]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.scrollTexture = texture;
  return mesh;
}

/** Stadium scoreboard showing the two teams, their scores and the hole info. */
export function createScoreboardMesh(width: number, height: number): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;

  ctx.fillStyle = '#0b1726';
  ctx.fillRect(0, 0, w, canvas.height);

  ctx.fillStyle = '#12305c';
  ctx.fillRect(0, 0, w, 170);
  ctx.fillStyle = '#ffd54a';
  ctx.font = 'bold 104px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FLI GOLF CHAMPIONSHIP', w / 2, 88);

  TEAMS.forEach((team, i) => {
    const cx = w * (i === 0 ? 0.24 : 0.76);
    ctx.fillStyle = '#f2f4f8';
    ctx.font = 'bold 74px Helvetica, Arial, sans-serif';
    ctx.fillText(team.name, cx, 650);
    ctx.fillStyle = '#ffd54a';
    ctx.font = 'bold 210px Helvetica, Arial, sans-serif';
    ctx.fillText(String(team.score), cx, 810);
  });

  ctx.fillStyle = '#9fb3cc';
  ctx.font = 'bold 72px Helvetica, Arial, sans-serif';
  ctx.fillText('HOLE 1   •   PAR 3   •   105 FT', w / 2, 960);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const drawInto = (url: string, cx: number, cy: number, boxW: number, boxH: number) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(boxW / image.width, boxH / image.height);
      const iw = image.width * scale;
      const ih = image.height * scale;
      ctx.drawImage(image, cx - iw / 2, cy - ih / 2, iw, ih);
      texture.needsUpdate = true;
    };
    image.src = url;
  };

  TEAMS.forEach((team, i) => {
    drawInto(team.url, w * (i === 0 ? 0.24 : 0.76), 400, 560, 380);
  });
  drawInto(LEAGUE_LOGO_URL, w / 2, 520, 460, 560);

  const geometry = new THREE.BoxGeometry(width, height, 0.8);
  const face = new THREE.MeshBasicMaterial({ map: texture });
  const frame = new THREE.MeshStandardMaterial({ color: 0x14202e, roughness: 0.8 });
  const mesh = new THREE.Mesh(geometry, [frame, frame, frame, frame, face, frame]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export const RenderSystem: System = (world) => {
  const entities = transformQuery(world);

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const meshComp = Mesh.get(entity);

    if (meshComp) {
      meshComp.mesh.position.set(Transform.x[entity], Transform.y[entity], Transform.z[entity]);

      meshComp.mesh.quaternion.set(
        Transform.qx[entity],
        Transform.qy[entity],
        Transform.qz[entity],
        Transform.qw[entity]
      );
    }
  }

  sceneRef.render();

  return world;
};
