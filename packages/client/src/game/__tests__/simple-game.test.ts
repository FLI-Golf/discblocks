import * as THREE from 'three';
import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, addEntity, addComponent, hasComponent } from 'bitecs';
import { Transform, Block, Bomb, PhysicsBody, Velocity } from '@/core/components';
import {
  bankedTurnBias,
  delayedCurveDirection,
  delayedCurveProgress,
  releaseBankQuaternion,
} from '@/game/discs';
import {
  BODY_PROFILES,
  DEFAULT_GOLFER_APPEARANCE,
  FACE_PRESETS,
  buildCharacterAppearance,
  Golfer,
  type CharacterAppearance,
} from '@/rendering/Golfer';
import { LocalStorageAppearanceRepository } from '@/game/appearanceRepository';
import { AppearanceModal } from '@/ui/AppearanceModal';
import { GroupPanel } from '@/ui/GroupPanel';
import { Hole } from '@/game/hole';
import { COURSE, headingTowardBasket } from '@/game/course';

describe('Game Components', () => {
  let world: any;

  beforeEach(() => {
    world = createWorld();
  });

  it('should create block entities with correct components', () => {
    const block = addEntity(world);

    addComponent(world, Transform, block);
    addComponent(world, PhysicsBody, block);
    addComponent(world, Block, block);

    // Set position
    Transform.x[block] = 0;
    Transform.y[block] = 1;
    Transform.z[block] = 0;

    // Verify components
    expect(hasComponent(world, Transform, block)).toBe(true);
    expect(hasComponent(world, PhysicsBody, block)).toBe(true);
    expect(hasComponent(world, Block, block)).toBe(true);

    expect(Transform.x[block]).toBe(0);
    expect(Transform.y[block]).toBe(1);
    expect(Transform.z[block]).toBe(0);
  });

  it('should create bomb entities with velocity', () => {
    const bomb = addEntity(world);

    addComponent(world, Transform, bomb);
    addComponent(world, PhysicsBody, bomb);
    addComponent(world, Velocity, bomb);
    addComponent(world, Bomb, bomb);

    // Set position and velocity
    Transform.x[bomb] = 5;
    Transform.y[bomb] = 10;
    Transform.z[bomb] = 0;

    Velocity.x[bomb] = -10;
    Velocity.y[bomb] = 0;
    Velocity.z[bomb] = -5;

    // Verify
    expect(hasComponent(world, Bomb, bomb)).toBe(true);
    expect(hasComponent(world, Velocity, bomb)).toBe(true);

    expect(Velocity.x[bomb]).toBe(-10);
    expect(Velocity.z[bomb]).toBe(-5);
  });

  it('should simulate pyramid structure', () => {
    const blocks = [];
    const levels = 3;

    // Create pyramid
    for (let level = 0; level < levels; level++) {
      for (let i = 0; i < levels - level; i++) {
        const block = addEntity(world);
        addComponent(world, Transform, block);
        addComponent(world, Block, block);

        Transform.x[block] = i - (levels - level - 1) / 2;
        Transform.y[block] = level + 0.5;
        Transform.z[block] = 0;

        blocks.push(block);
      }
    }

    // Verify we have the right number of blocks
    expect(blocks.length).toBe(6); // 3 + 2 + 1

    // Verify pyramid structure
    const level0Blocks = blocks.filter((b) => Math.abs(Transform.y[b] - 0.5) < 0.1);
    const level1Blocks = blocks.filter((b) => Math.abs(Transform.y[b] - 1.5) < 0.1);
    const level2Blocks = blocks.filter((b) => Math.abs(Transform.y[b] - 2.5) < 0.1);

    expect(level0Blocks.length).toBe(3);
    expect(level1Blocks.length).toBe(2);
    expect(level2Blocks.length).toBe(1);
  });

  it('should stay flat early and bank only after the delayed curve threshold', () => {
    const hyzer = releaseBankQuaternion(-0.35);
    const anhyzer = releaseBankQuaternion(0.35);

    expect(hyzer.x).toBeLessThan(0);
    expect(anhyzer.x).toBeGreaterThan(0);
    expect(hyzer.y).toBe(0);
    expect(anhyzer.z).toBe(0);
    expect(delayedCurveProgress(10, 40)).toBe(0);
    expect(delayedCurveProgress(30, 40)).toBe(0);
    expect(delayedCurveProgress(31, 40)).toBeGreaterThan(0);
    expect(delayedCurveProgress(40, 40)).toBe(1);
    expect(delayedCurveDirection(-0.35, -1)).toBeLessThan(0);
    expect(delayedCurveDirection(0.35, -1)).toBeGreaterThan(0);
    expect(delayedCurveDirection(-0.35, 1)).toBeGreaterThan(0);
    expect(delayedCurveDirection(0, -1)).toBe(0);
    expect(bankedTurnBias(-0.35, -1, 0.9)).toBe(0);
    expect(bankedTurnBias(0.35, -1, 0.9)).toBe(0);
  });

  it('should rebuild the hair root when a preset changes the hairstyle', () => {
    const golfer = new Golfer();

    expect(golfer.root.getObjectByName('hair-root')).not.toBeNull();

    const before = golfer.root.getObjectByName('hair-root') as THREE.Group;
    golfer.setAppearance({ hairStyle: 'short' });

    const after = golfer.root.getObjectByName('hair-root') as THREE.Group;
    expect(after).not.toBeNull();
    expect(after).not.toBe(before);
    expect(after.children.length).toBeGreaterThan(0);

    golfer.dispose();
  });

  it('should equip and remove golfer accessories without leaving orphaned nodes', () => {
    const golfer = new Golfer();
    golfer.setAppearance({ shirtColor: 0x123456, shortsColor: 0x654321 });
    golfer.equipAccessory('cap', { color: 0x987654 });

    expect(golfer.root.getObjectByName('cap-accessory')).not.toBeNull();

    golfer.removeAccessory('cap');
    expect(golfer.root.getObjectByName('cap-accessory')).toBeUndefined();

    golfer.dispose();
  });

  it('should use a relaxed standing pose for preview characters instead of a throwing stance', () => {
    const golfer = new Golfer();
    expect(golfer.root.rotation.y).toBe(0);
    expect(golfer.root.position.y).toBeLessThan(0.5);
    golfer.dispose();
  });

  it('should face the basket when golfers are placed for the next shot', () => {
    const golfer = new Golfer();
    const position = { x: 5, z: COURSE.teeZ };
    const expected = headingTowardBasket(position);

    golfer.setPosition(position.x, 0, position.z);
    golfer.setHeading(expected);

    expect(golfer.root.rotation.y).toBeCloseTo(expected, 5);
    expect(golfer.root.userData.headingYaw).toBe(expected);
    golfer.dispose();
  });

  it('should reuse a configured face loader stack with meshopt and KTX2 support', async () => {
    const { Face } = await import('@/rendering/Golfer');

    expect(typeof Face.getModelLoader).toBe('function');
    expect(typeof Face.getSharedKTX2Loader).toBe('function');

    const loader = Face.getModelLoader();
    const ktx2Loader = Face.getSharedKTX2Loader();

    expect(loader).toBeDefined();
    expect(ktx2Loader).toBeDefined();
    expect(loader).toBe(Face.getModelLoader());
    expect(ktx2Loader).toBe(Face.getSharedKTX2Loader());
  });

  it('should build a golfer from partial appearance data without undefined material colors', () => {
    expect(() => {
      const golfer = new Golfer({
        skinTone: 0xf0c8a0,
        hairColor: 0x2b1d16,
        shirtColor: 0xf2f4f8,
        shortsColor: 0x1a1a1e,
        accentColor: 0xe02b20,
        jerseyNumber: 8,
        bodyProfile: 'athleticMale',
        hairStyle: 'shortCrop',
      });

      const collar = golfer.root.getObjectByName('collar-part') as THREE.Mesh | undefined;
      const placket = golfer.root.getObjectByName('placket-part') as THREE.Mesh | undefined;
      expect(collar).not.toBeUndefined();
      expect(placket).not.toBeUndefined();
      expect(collar?.material).toBeTruthy();
      expect(placket?.material).toBeTruthy();
      expect((collar?.material as THREE.MeshStandardMaterial).color).toBeTruthy();
      expect((placket?.material as THREE.MeshStandardMaterial).color).toBeTruthy();
      golfer.dispose();
    }).not.toThrow();
  });

  it('should expose distinct body profiles for male, female, and neutral presets', () => {
    expect(BODY_PROFILES.athleticMale.shoulderWidth).toBeGreaterThan(
      BODY_PROFILES.neutralLean.shoulderWidth + 0.28
    );
    expect(
      BODY_PROFILES.athleticFemale.hipWidth - BODY_PROFILES.athleticMale.hipWidth
    ).toBeGreaterThan(0.3);
    expect(
      BODY_PROFILES.athleticMale.jawWidth - BODY_PROFILES.athleticFemale.jawWidth
    ).toBeGreaterThan(0.45);
    expect(BODY_PROFILES.neutralLean.headScale).toBeLessThan(
      BODY_PROFILES.athleticFemale.headScale - 0.06
    );
  });

  it('should default a fresh face to the male preset and keep the face-specific controls aligned to that base', () => {
    const fresh = buildCharacterAppearance({});
    expect(fresh.facePreset).toBe('male');
    expect(fresh.hairStyle).toBe('sidePart');
    expect(fresh.hairColor).toBe(0xd4a66b);
    expect(fresh.skinTone).toBe(0xe7c7b7);
    expect(fresh.face.brow).toBeCloseTo(FACE_PRESETS.male.brow, 5);
    expect(fresh.face.eyeSpacing).toBeCloseTo(FACE_PRESETS.male.eyeSpacing, 5);
    expect(fresh.profile.jawWidth).toBeCloseTo(BODY_PROFILES.neutralLean.jawWidth, 5);
  });

  it('should match the placeholder-inspired male and female settings as the shared defaults', () => {
    expect(FACE_PRESETS.male.hairStyle).toBe('sidePart');
    expect(FACE_PRESETS.male.hairColor).toBe(0xd4a66b);
    expect(FACE_PRESETS.male.skinTone).toBe(0xe7c7b7);
    expect(FACE_PRESETS.female.hairStyle).toBe('bun');
    expect(FACE_PRESETS.female.hairColor).toBe(0x6b4a2f);
    expect(FACE_PRESETS.female.skinTone).toBe(0xeec19a);
    expect(FACE_PRESETS.neutral.hairStyle).toBe('shortCrop');
    expect(FACE_PRESETS.neutral.hairColor).toBe(0x533725);
    expect(FACE_PRESETS.neutral.skinTone).toBe(0xefc49d);
    expect(FACE_PRESETS.neutral.headScale).toBeCloseTo(1.04, 5);
    expect(FACE_PRESETS.neutral.jawWidth).toBeCloseTo(1.08, 5);
    expect(DEFAULT_GOLFER_APPEARANCE.hairStyle).toBe('sidePart');
    expect(DEFAULT_GOLFER_APPEARANCE.facePreset).toBe('male');
  });

  it('should keep the face diagnostics panel on by default and isolate the face in the preview', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const modal = new AppearanceModal(host, {
      playerName: 'Test Player',
      mode: 'face',
      initialAppearance: DEFAULT_GOLFER_APPEARANCE,
      initialAccessories: {},
      onApply: () => undefined,
      onCancel: () => undefined,
      onReset: () => undefined,
    });

    const toggles = Array.from(
      modal['root'].querySelectorAll<HTMLInputElement>('.face-debug-control input[type="checkbox"]')
    );

    expect(toggles.length).toBeGreaterThanOrEqual(7);
    expect(toggles[0].checked).toBe(true);
    expect(toggles.every((input) => input.checked)).toBe(true);

    host.remove();
    modal.close(false);
  });

  it('should expose sculpted face geometry and respond to eye-spacing and jaw controls', async () => {
    const { Face } = await import('@/rendering/Golfer');
    const face = new Face({
      ...FACE_PRESETS.male,
      eyeSpacing: 0.5,
      jawWidth: 1.2,
      chinShape: 1.1,
    });

    expect(face.root.getObjectByName('cheek-left')).not.toBeNull();
    expect(face.root.getObjectByName('cheek-right')).not.toBeNull();
    expect(face.root.getObjectByName('eyelid-left')).not.toBeNull();
    expect(face.root.getObjectByName('eyelid-right')).not.toBeNull();

    const leftEye = face.root.getObjectByName('eye-white-left') as THREE.Mesh;
    const rightEye = face.root.getObjectByName('eye-white-right') as THREE.Mesh;
    const leftEyelid = face.root.getObjectByName('eyelid-left') as THREE.Mesh;
    const rightEyelid = face.root.getObjectByName('eyelid-right') as THREE.Mesh;
    const jaw = face.root.getObjectByName('jaw-part') as THREE.Mesh;

    const initialLeftX = leftEye.position.x;
    const initialRightX = rightEye.position.x;
    const initialJawScaleX = jaw.scale.x;

    face.setConfig({ eyeSpacing: 0.25, jawWidth: 1.4, chinShape: 1.35, nose: 0.8, mouth: 0.9 });

    expect(leftEye.position.x).toBeLessThan(initialLeftX);
    expect(rightEye.position.x).toBeGreaterThan(initialRightX);
    expect(leftEyelid.position.x).toBeLessThan(initialLeftX);
    expect(rightEyelid.position.x).toBeGreaterThan(initialRightX);
    expect(jaw.scale.x).toBeGreaterThan(initialJawScaleX);
    expect(face.root.getObjectByName('nose-part')).not.toBeNull();
    expect(face.root.getObjectByName('mouth-part')).not.toBeNull();
  });

  it('should use distinct default face presets for male and female profiles', () => {
    const male = buildCharacterAppearance({ bodyProfile: 'athleticMale' });
    const female = buildCharacterAppearance({ bodyProfile: 'athleticFemale' });

    expect(male.profile.jawWidth).toBeGreaterThan(female.profile.jawWidth);
    expect(male.face.brow).toBeGreaterThan(female.face.brow);
    expect(male.face.eyeSpacing).toBeGreaterThan(female.face.eyeSpacing);
    expect(male.face.nose).toBeLessThan(female.face.nose);
    expect(male.face.mouth).toBeGreaterThan(female.face.mouth);
  });

  it('should build explicit appearance configs without overwriting the shared rig', () => {
    const appearance = buildCharacterAppearance({
      bodyProfile: 'athleticFemale',
      hairStyle: 'bun',
      beard: 0,
      stubble: 0,
      shirtColor: 0x2244aa,
      shortsColor: 0x111111,
      jerseyNumber: 27,
    }) as CharacterAppearance;

    expect(appearance.bodyProfile).toBe('athleticFemale');
    expect(appearance.profile.shoulderWidth).toBeGreaterThan(0);
    expect(appearance.hairStyle).toBe('bun');
    expect(appearance.outfit.sleeveLength).toBeGreaterThan(0);
    expect(appearance.jerseyNumber).toBe(27);

    const golfer = new Golfer({
      ...appearance,
      jersey: appearance.shirtColor,
      accent: 0x334455,
      shorts: appearance.shortsColor,
      skin: appearance.skinTone,
      hair: appearance.hairColor,
      hairStyle: appearance.hairStyle,
      build: 1,
    });

    const torso = golfer.root.getObjectByName('torso-part') as THREE.Mesh;
    expect(golfer.root.getObjectByName('hair-root')).not.toBeNull();
    expect(torso).not.toBeNull();
    expect((torso.material as THREE.MeshStandardMaterial).map).not.toBeNull();
    golfer.dispose();
  });

  it('should fill missing nested defaults without overriding supplied partial face, body, or outfit values', () => {
    const appearance = buildCharacterAppearance({
      bodyProfile: 'athleticFemale',
      profile: { jawWidth: 1.15 },
      face: { eyeSpacing: 0.78 },
      outfit: { collarHeight: 1.4 },
      shirtColor: 0x223344,
      accentColor: 0x99aabb,
    });

    expect(appearance.profile.shoulderWidth).toBeGreaterThan(0);
    expect(appearance.profile.jawWidth).toBe(1.15);
    expect(appearance.profile.headScale).toBeGreaterThan(0);
    expect(appearance.face.eyeSpacing).toBe(0.78);
    expect(appearance.face.brow).toBeGreaterThan(0);
    expect(appearance.outfit.collarHeight).toBe(1.4);
    expect(appearance.outfit.sleeveLength).toBeGreaterThan(0);
    expect(appearance.shirtColor).toBe(0x223344);
    expect(appearance.accentColor).toBe(0x99aabb);
  });

  it('should keep saved appearances isolated by stable player id', () => {
    const repository = new LocalStorageAppearanceRepository();

    repository.save('player-1', {
      version: 1,
      appearance: { hairStyle: 'bald', shirtColor: 0x112233 },
      accessories: { cap: true, bag: true, disc: true },
      savedAt: Date.now(),
    });

    repository.save('player-2', {
      version: 1,
      appearance: { hairStyle: 'ponytail', shirtColor: 0x445566 },
      accessories: { cap: false, bag: true },
      savedAt: Date.now(),
    });

    expect(repository.load('player-1')?.appearance.hairStyle).toBe('bald');
    expect(repository.load('player-2')?.appearance.hairStyle).toBe('ponytail');
    expect(repository.load('player-1')?.accessories.cap).toBe(true);
    expect(repository.load('player-2')?.accessories.cap).toBe(false);
  });

  it('should launch the player modal from Change Look and open on the face controls by default', () => {
    document.body.innerHTML = '';
    const container = document.createElement('div');
    document.body.appendChild(container);

    const hole = new Hole({ x: 0, y: 0, z: 0 }, 3);
    new GroupPanel(container, hole);

    const lookButton = container.querySelector('.group-look-button') as HTMLButtonElement | null;
    expect(lookButton).not.toBeNull();
    expect(container.querySelector('.group-face-button')).toBeNull();

    lookButton!.click();

    const modalTitle = document.querySelector('.appearance-modal-title span');
    expect(modalTitle?.textContent).toBe('Change Look');
    expect(
      document
        .querySelector('.appearance-mode-toggle [data-mode="face"]')
        ?.classList.contains('is-active')
    ).toBe(true);
    expect(document.querySelector('.appearance-control')?.textContent).toContain('Skin tone');
  });

  it('should keep the face diagnostics sliders interactive in the face view', () => {
    document.body.innerHTML = '';
    const container = document.createElement('div');
    document.body.appendChild(container);

    const hole = new Hole({ x: 0, y: 0, z: 0 }, 3);
    new GroupPanel(container, hole);
    (container.querySelector('.group-look-button') as HTMLButtonElement | null)?.click();

    const headScale = document.querySelector('input[type="range"][data-key="headScale"]');
    const eyeSpacing = document.querySelector('input[type="range"][data-key="eyeSpacing"]');
    const skinTone = document.querySelector('input[type="color"][data-key="skinTone"]');

    expect(headScale).not.toBeNull();
    expect(eyeSpacing).not.toBeNull();
    expect(skinTone).not.toBeNull();
    expect((headScale as HTMLInputElement).disabled).toBe(false);
    expect((eyeSpacing as HTMLInputElement).disabled).toBe(false);
    expect((skinTone as HTMLInputElement).disabled).toBe(false);
  });

  it('should not initialize a WebGL context twice on the preview canvas', () => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const calls: Array<{ canvas: HTMLCanvasElement; type: string }> = [];

    HTMLCanvasElement.prototype.getContext = function (type: string) {
      calls.push({ canvas: this, type });
      return null;
    };

    try {
      document.body.innerHTML = '';
      const container = document.createElement('div');
      document.body.appendChild(container);

      const hole = new Hole({ x: 0, y: 0, z: 0 }, 3);
      new GroupPanel(container, hole);
      (container.querySelector('.group-look-button') as HTMLButtonElement | null)?.click();

      const previewCanvas = document.querySelector(
        '.appearance-preview-canvas'
      ) as HTMLCanvasElement | null;
      const previewCalls = calls.filter((call) => call.canvas === previewCanvas).length;
      expect(previewCanvas).not.toBeNull();
      expect(previewCalls).toBeLessThanOrEqual(1);
    } finally {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    }
  });
});
