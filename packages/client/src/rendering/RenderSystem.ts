import type { System } from 'bitecs';
import { Transform } from '@/core/components';
import { transformQuery } from '@/core/ecs';
import { COURSE, FEET_PER_UNIT } from '@/game/course';
import { PLAYING_TEAMS, type TeamResult } from '@/game/teams';
import * as THREE from 'three';
import { Scene } from './Scene';

interface MeshComponent {
  mesh: THREE.Object3D;
}

const Mesh = new Map<number, MeshComponent>();
let sceneRef: Scene;

export function initRenderSystem(scene: Scene) {
  sceneRef = scene;
}

export function getScene(): Scene | undefined {
  return sceneRef;
}

export function addMesh(entity: number, mesh: THREE.Object3D) {
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
  if (!meshComp) {
    return;
  }

  sceneRef.scene.remove(meshComp.mesh);

  // Entities can carry a group of parts, so dispose the whole subtree.
  meshComp.mesh.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    child.geometry.dispose();
    const material = child.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else {
      material.dispose();
    }
  });

  Mesh.delete(entity);
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

/** Saguaro: a capsule trunk with elbowed arms, built around the entity origin. */
export function createCactusMesh(height: number, radius: number, arms: number): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x4f7a43,
    roughness: 0.92,
    metalness: 0,
  });

  const trunk = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, height - radius * 2, 4, 12),
    material
  );
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  for (let i = 0; i < arms; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const armRadius = radius * 0.72;
    const armLength = height * (0.26 + Math.random() * 0.12);
    const elbowY = height * (0.02 + i * 0.16) - height * 0.14;
    const reach = radius * 2.6;

    const spur = new THREE.Mesh(new THREE.CapsuleGeometry(armRadius, reach, 4, 8), material);
    spur.rotation.z = (Math.PI / 2) * side;
    spur.position.set(side * reach * 0.5, elbowY, 0);
    spur.castShadow = true;
    group.add(spur);

    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(armRadius, armLength, 4, 8), material);
    upper.position.set(side * reach, elbowY + armLength * 0.5 + armRadius, 0);
    upper.castShadow = true;
    group.add(upper);
  }

  return group;
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

/** Shared texture showing exactly one sponsor panel. */
function singleSponsorTexture(sponsorIndex: number, mirrored = false): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(buildAdCanvas());
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;

  const span = 1 / AD_PANEL_COUNT;
  const start = (sponsorIndex % AD_PANEL_COUNT) * span;

  // A negative repeat walks the slice backwards, so the art reads correctly when
  // the surface is viewed from behind.
  texture.repeat.set(mirrored ? -span : span, 1);
  texture.offset.set(mirrored ? start + span : start, 0);

  pendingAdTextures?.push(texture);
  return texture;
}

/** Tow banner with a swallowtail notch, extending back along local -X. */
function swallowtailGeometry(width: number, height: number): THREE.ShapeGeometry {
  const notch = height * 0.55;
  const shape = new THREE.Shape();
  shape.moveTo(0, -height / 2);
  shape.lineTo(-width, -height / 2);
  shape.lineTo(-width + notch, 0);
  shape.lineTo(-width, height / 2);
  shape.lineTo(0, height / 2);
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);

  // ShapeGeometry emits model-space UVs, so remap them onto the 0-1 range.
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const spanX = box.max.x - box.min.x;
  const spanY = box.max.y - box.min.y;
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;

  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, (position.getX(i) - box.min.x) / spanX, (position.getY(i) - box.min.y) / spanY);
  }
  uv.needsUpdate = true;

  return geometry;
}

function createTowBanner(width: number, height: number, sponsorIndex: number): THREE.Group {
  const group = new THREE.Group();

  const backing = new THREE.Mesh(
    swallowtailGeometry(width * 1.03, height * 1.12),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, fog: false })
  );
  group.add(backing);

  // One face per side rather than a double-sided sheet: the back face gets a
  // mirrored texture, so the logo reads the right way whichever way the plane flies.
  const faces = [
    { side: THREE.FrontSide, mirrored: false, z: 0.05 },
    { side: THREE.BackSide, mirrored: true, z: -0.05 },
  ];

  for (const face of faces) {
    const panel = new THREE.Mesh(
      swallowtailGeometry(width, height),
      new THREE.MeshBasicMaterial({
        map: singleSponsorTexture(sponsorIndex, face.mirrored),
        side: face.side,
        fog: false,
      })
    );
    panel.position.z = face.z;
    group.add(panel);
  }

  return group;
}

/** Thin strut running between two points in the z = 0 plane. */
function strutBetween(
  from: THREE.Vector2,
  to: THREE.Vector2,
  material: THREE.Material,
  thickness = 0.06
): THREE.Mesh {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(thickness, thickness, Math.hypot(dx, dy), 5),
    material
  );
  mesh.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, 0);
  // A Y-aligned cylinder rotated by theta about Z points along (-sin, cos).
  mesh.rotation.z = Math.atan2(-dx, dy);
  return mesh;
}

/** Banner plane towing a sponsor sheet. Nose points along local +X. */
export function createBannerPlaneMesh(sponsorIndex: number, color: number = 0xf2b705): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.MeshLambertMaterial({ color, fog: false });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2b3240, fog: false });
  const glass = new THREE.MeshLambertMaterial({ color: 0x6fc4e8, fog: false });

  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(1, 6.2, 4, 10), body);
  fuselage.rotation.z = Math.PI / 2;
  group.add(fuselage);

  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.6), glass);
  cockpit.position.set(0.8, 0.8, 0);
  group.add(cockpit);

  // High wing sitting on top of the fuselage, as in the reference.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.26, 14), body);
  wing.position.set(0.2, 1.45, 0);
  group.add(wing);

  for (const side of [-1, 1]) {
    const strut = strutBetween(
      new THREE.Vector2(0.2, 0.5),
      new THREE.Vector2(0.2, 1.4),
      dark,
      0.09
    );
    strut.position.z = side * 3;
    group.add(strut);
  }

  // Triangular fin.
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(-2.6, 0);
  finShape.lineTo(-2.6, 3);
  finShape.closePath();
  const fin = new THREE.Mesh(new THREE.ShapeGeometry(finShape), body);
  fin.position.set(-3.1, 0.6, 0);
  group.add(fin);

  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 5.4), body);
  tailplane.position.set(-4.2, 0.3, 0);
  group.add(tailplane);

  // Blade silhouette rather than a disc, matching the flat reference art.
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.6, 0.6), dark);
  blade.position.x = 3.7;
  group.add(blade);

  const spinner = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), dark);
  spinner.position.x = 3.8;
  group.add(spinner);

  for (const side of [-1, 1]) {
    const leg = strutBetween(new THREE.Vector2(0.9, -0.8), new THREE.Vector2(0.9, -2), dark, 0.11);
    leg.position.z = side * 1.1;
    group.add(leg);

    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 12), dark);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(0.9, -2.2, side * 1.1);
    group.add(wheel);
  }

  const bannerHeight = 7.4;
  const bannerX = -9.5;
  const banner = createTowBanner(26, bannerHeight, sponsorIndex);
  banner.position.set(bannerX, -0.2, 0);
  group.add(banner);

  // Twin tow lines converging from the tail to the banner's leading corners.
  for (const side of [-1, 1]) {
    group.add(
      strutBetween(
        new THREE.Vector2(-4.4, 0.1),
        new THREE.Vector2(bannerX, -0.2 + (side * bannerHeight) / 2),
        dark,
        0.05
      )
    );
  }

  return group;
}

/** Wraps the shared sponsor canvas around a circumference, showing `panelsAround` boards. */
function wrappedAdTexture(sponsorIndex: number, panelsAround: number): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(buildAdCanvas());
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.repeat.set(panelsAround / AD_PANEL_COUNT, 1);
  texture.offset.set((sponsorIndex % AD_PANEL_COUNT) / AD_PANEL_COUNT, 0);
  pendingAdTextures?.push(texture);
  return texture;
}

/** Mushroom cap for a guard pillar: advertising around the rim, tapered underside. */
export function createMushroomCapMesh(
  radius: number,
  rimHeight: number,
  sponsorIndex: number,
  panelsAround: number = 6
): THREE.Group {
  const group = new THREE.Group();

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, rimHeight, 48, 1, true),
    new THREE.MeshStandardMaterial({
      map: wrappedAdTexture(sponsorIndex, panelsAround),
      roughness: 0.7,
      metalness: 0.05,
      side: THREE.DoubleSide,
    })
  );
  rim.castShadow = true;
  rim.receiveShadow = true;
  group.add(rim);

  const shell = new THREE.MeshStandardMaterial({
    color: 0xeef1f5,
    roughness: 0.6,
    metalness: 0.1,
  });

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.05, radius * 1.05, 0.34, 48),
    shell
  );
  top.position.y = rimHeight / 2 + 0.17;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const skirtHeight = radius * 0.55;
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(radius, skirtHeight, 48), shell);
  skirt.rotation.x = Math.PI;
  skirt.position.y = -rimHeight / 2 - skirtHeight / 2;
  skirt.castShadow = true;
  group.add(skirt);

  return group;
}

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

const TEAMS = PLAYING_TEAMS;

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

  TEAMS.forEach((team: TeamResult, i: number) => {
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
  const holeFeet = Math.round((COURSE.teeZ - COURSE.basketZ) * FEET_PER_UNIT);
  ctx.fillText(`HOLE 1   •   PAR 3   •   ${holeFeet} FT`, w / 2, 960);

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

  TEAMS.forEach((team: TeamResult, i: number) => {
    drawInto(team.logo, w * (i === 0 ? 0.24 : 0.76), 400, 560, 380);
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
