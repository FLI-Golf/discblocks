// Deprecated: this generator created placeholder meshes for prototype work only.
// The active runtime avatar assets are supplied from approved external sample models
// and are stored in public/models/ as shipped GLB files.
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

class FileReaderPolyfill {
  constructor() {
    this.result = null;
    this.onloadend = null;
  }

  readAsArrayBuffer(blob) {
    Promise.resolve(blob.arrayBuffer()).then((buffer) => {
      this.result = buffer;
      if (typeof this.onloadend === 'function') {
        this.onloadend({ target: this });
      }
    });
  }
}

globalThis.FileReader = FileReaderPolyfill;

const outDir = path.resolve(process.cwd(), 'public/models');
await fs.mkdir(outDir, { recursive: true });

function bone(name, parent, position = [0, 0, 0]) {
  const b = new THREE.Bone();
  b.name = name;
  b.position.set(position[0], position[1], position[2]);
  parent.add(b);
  return b;
}

function addMesh(parent, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

async function createAvatar(config) {
  const root = new THREE.Group();
  root.name = config.name;

  const skin = new THREE.MeshStandardMaterial({ color: config.skin, roughness: 0.82, metalness: 0.04 });
  const shirt = new THREE.MeshStandardMaterial({ color: config.shirt, roughness: 0.78, metalness: 0.04 });
  const shorts = new THREE.MeshStandardMaterial({ color: config.shorts, roughness: 0.88, metalness: 0.04 });
  const shoe = new THREE.MeshStandardMaterial({ color: config.shoe, roughness: 0.82, metalness: 0.08 });
  const hairMat = new THREE.MeshStandardMaterial({ color: config.hair, roughness: 0.92, metalness: 0.04 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.2, metalness: 0.2 });

  // Root skeleton; this keeps the model compatible with the gameplay attachment points.
  const hips = bone('Hips', root, [0, 1.0, 0]);
  const spine = bone('Spine', hips, [0, 0.45, 0]);
  const neck = bone('Neck', spine, [0, 0.68, 0]);
  const head = bone('Head', neck, [0, 0.18, 0]);
  const leftArm = bone('LeftArm', spine, [-0.48, 0.42, 0]);
  const leftForeArm = bone('LeftForeArm', leftArm, [-0.18, -0.62, 0]);
  const leftHand = bone('LeftHand', leftForeArm, [0, -0.46, 0]);
  const rightArm = bone('RightArm', spine, [0.48, 0.42, 0]);
  const rightForeArm = bone('RightForeArm', rightArm, [0.18, -0.62, 0]);
  const rightHand = bone('RightHand', rightForeArm, [0, -0.46, 0]);
  const leftLeg = bone('LeftLeg', hips, [-0.14, -0.4, 0]);
  const leftShin = bone('LeftShin', leftLeg, [0, -0.7, 0]);
  const leftFoot = bone('LeftFoot', leftShin, [0, -0.52, 0.1]);
  const rightLeg = bone('RightLeg', hips, [0.14, -0.4, 0]);
  const rightShin = bone('RightShin', rightLeg, [0, -0.7, 0]);
  const rightFoot = bone('RightFoot', rightShin, [0, -0.52, 0.1]);

  // Pelvis / hips: slightly wider than a mannequin to look human rather than robotic.
  addMesh(hips, new THREE.SphereGeometry(0.25, 20, 16), shorts, [0, -0.06, 0.02], [0, 0, 0], [1.45, 0.92, 1.15]);

  // Torso with softer chest, waist, and shoulder volume.
  addMesh(spine, new THREE.SphereGeometry(0.26, 24, 18), shirt, [0, 0.48, 0], [0, 0, 0], [1.25, 1.18, 0.82]);
  addMesh(spine, new THREE.SphereGeometry(0.22, 20, 18), shirt, [0, 0.12, 0], [0, 0, 0], [1.15, 0.9, 0.7]);
  addMesh(spine, new THREE.SphereGeometry(0.18, 18, 14), shirt, [0, -0.18, 0], [0, 0, 0], [1.15, 0.8, 0.7]);
  addMesh(spine, new THREE.SphereGeometry(0.21, 18, 14), shirt, [-0.26, 0.42, 0], [0, 0, 0], [1.2, 1, 1]);
  addMesh(spine, new THREE.SphereGeometry(0.21, 18, 14), shirt, [0.26, 0.42, 0], [0, 0, 0], [1.2, 1, 1]);
  addMesh(spine, new THREE.BoxGeometry(0.18, 0.38, 0.08), skin, [0, 0.15, 0.22], [0, 0, 0], [1, 1, 1]);

  // Head with more organic proportions and face structure.
  const headMesh = addMesh(head, new THREE.SphereGeometry(0.26, 30, 28), skin, [0, 0.2, 0], [0, 0, 0], [1.12, 1.28, 1.05]);
  headMesh.name = 'HeadMesh';

  addMesh(head, new THREE.SphereGeometry(0.26, 28, 24), hairMat, [0, 0.22, 0.02], [0, 0, 0], [1.16, 0.82, 1.09]);
  addMesh(head, new THREE.BoxGeometry(0.26, 0.12, 0.14), hairMat, [0, 0.1, 0.17], [0, 0, 0], [1.1, 1, 1]);
  addMesh(head, new THREE.SphereGeometry(0.036, 12, 10), eyeMat, [-0.08, 0.18, 0.2], [0, 0, 0], [1, 1, 1]);
  addMesh(head, new THREE.SphereGeometry(0.036, 12, 10), eyeMat, [0.08, 0.18, 0.2], [0, 0, 0], [1, 1, 1]);
  addMesh(head, new THREE.BoxGeometry(0.05, 0.08, 0.04), skin, [0, -0.02, 0.22], [0, 0, 0], [1, 1, 1]);
  addMesh(head, new THREE.SphereGeometry(0.04, 12, 10), skin, [0, -0.12, 0.18], [0, 0, 0], [0.9, 1.1, 0.8]);
  addMesh(head, new THREE.SphereGeometry(0.04, 12, 10), skin, [-0.18, 0.12, 0.02], [0, 0, 0], [0.8, 1.2, 0.7]);
  addMesh(head, new THREE.SphereGeometry(0.04, 12, 10), skin, [0.18, 0.12, 0.02], [0, 0, 0], [0.8, 1.2, 0.7]);

  // Arms and legs shaped more like a real human body.
  addMesh(leftArm, new THREE.CapsuleGeometry(0.11, 0.56, 8, 16), shirt, [-0.08, -0.34, 0], [0, 0, 0], [1.12, 1, 1.08]);
  addMesh(leftForeArm, new THREE.CapsuleGeometry(0.09, 0.46, 8, 16), skin, [0, -0.28, 0], [0, 0, 0], [1.05, 1, 1]);
  addMesh(leftHand, new THREE.SphereGeometry(0.09, 16, 12), skin, [0, -0.12, 0], [0, 0, 0], [0.92, 1.08, 0.9]);

  addMesh(rightArm, new THREE.CapsuleGeometry(0.11, 0.56, 8, 16), shirt, [0.08, -0.34, 0], [0, 0, 0], [1.12, 1, 1.08]);
  addMesh(rightForeArm, new THREE.CapsuleGeometry(0.09, 0.46, 8, 16), skin, [0, -0.28, 0], [0, 0, 0], [1.05, 1, 1]);
  addMesh(rightHand, new THREE.SphereGeometry(0.09, 16, 12), skin, [0, -0.12, 0], [0, 0, 0], [0.92, 1.08, 0.9]);

  addMesh(leftLeg, new THREE.CapsuleGeometry(0.15, 0.62, 8, 16), shorts, [0, -0.28, 0], [0, 0, 0], [1.22, 1, 1]);
  addMesh(leftShin, new THREE.CapsuleGeometry(0.12, 0.56, 8, 16), skin, [0, -0.28, 0], [0, 0, 0], [1.08, 1, 1]);
  addMesh(leftFoot, new THREE.BoxGeometry(0.18, 0.12, 0.34), shoe, [0, -0.08, 0.08], [0, 0.08, 0], [1.1, 1, 1.2]);

  addMesh(rightLeg, new THREE.CapsuleGeometry(0.15, 0.62, 8, 16), shorts, [0, -0.28, 0], [0, 0, 0], [1.22, 1, 1]);
  addMesh(rightShin, new THREE.CapsuleGeometry(0.12, 0.56, 8, 16), skin, [0, -0.28, 0], [0, 0, 0], [1.08, 1, 1]);
  addMesh(rightFoot, new THREE.BoxGeometry(0.18, 0.12, 0.34), shoe, [0, -0.08, 0.08], [0, 0.08, 0], [1.1, 1, 1.2]);

  const exporter = new GLTFExporter();
  const arrayBuffer = await exporter.parseAsync(root, { binary: true, onlyVisible: false });
  return { arrayBuffer, root };
}

const male = await createAvatar({
  name: 'male_avatar',
  skin: 0xe6c7b0,
  shirt: 0xf2f5f9,
  shorts: 0x24292f,
  shoe: 0x0b0d11,
  hair: 0x4b2d1f,
  torsoScale: 1,
});

const female = await createAvatar({
  name: 'female_avatar',
  skin: 0xeec7a9,
  shirt: 0xf4f6fa,
  shorts: 0x313844,
  shoe: 0x181b20,
  hair: 0x6c4633,
  torsoScale: 0.9,
});

await fs.writeFile(path.join(outDir, 'male_avatar.glb'), Buffer.from(male.arrayBuffer));
await fs.writeFile(path.join(outDir, 'female_avatar.glb'), Buffer.from(female.arrayBuffer));

console.log('Generated male and female avatar models in', outDir);
