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
  DEFAULT_MALE_APPEARANCE,
  FACE_PRESETS,
  FACE_PARAMETER_LIMITS,
  buildCharacterAppearance,
  Face,
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

  it('should expose the active sidePart hair root through the full golfer rig for body preview debugging', () => {
    const golfer = new Golfer({ ...DEFAULT_GOLFER_APPEARANCE, hairStyle: 'sidePart' });
    const hairRoot = golfer.getHairRoot();

    expect(hairRoot).not.toBeNull();
    expect(hairRoot?.name).toBe('hair-root');
    expect(hairRoot?.getObjectByName('hair-sidepart-cap')).not.toBeNull();
    expect(golfer.root.getObjectByName('hair-sidepart-cap')).not.toBeNull();

    golfer.dispose();
  });

  it('should include neck width and length in the body profile and apply them to the neck mesh', () => {
    const golfer = new Golfer({
      ...DEFAULT_GOLFER_APPEARANCE,
      profile: {
        ...DEFAULT_GOLFER_APPEARANCE.profile,
        neckWidth: 1.4,
        neckLength: 1.7,
      },
    });

    const neck = golfer.root.getObjectByName('neck-part') as THREE.Mesh;
    expect(neck).not.toBeNull();
    expect(golfer.appearance.profile.neckWidth).toBe(1.4);
    expect(golfer.appearance.profile.neckLength).toBe(1.7);
    expect(neck.scale.x).toBeCloseTo(1.4, 4);
    expect(neck.scale.y).toBeCloseTo(1.7, 4);

    golfer.dispose();
  });

  it('should hide neck controls from the face UI', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const modal = new AppearanceModal(container, {
      playerName: 'Face UI Test',
      mode: 'face',
      initialAppearance: DEFAULT_GOLFER_APPEARANCE,
      initialAccessories: {},
      onApply: () => undefined,
    });

    const labels = Array.from(container.querySelectorAll('label')).map(
      (label) => label.textContent ?? ''
    );
    expect(labels.some((label) => label.includes('Neck'))).toBe(false);

    modal.close(false);
    container.remove();
  });

  it('should reset the preview back to the procedural fallback instead of reloading a male GLTF avatar', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const modal = new AppearanceModal(container, {
      playerName: 'Reset Test',
      mode: 'face',
      initialAppearance: {
        ...DEFAULT_GOLFER_APPEARANCE,
        avatarModelId: 'male',
      },
      initialAccessories: {},
      onApply: () => undefined,
    });

    const preview = (modal as any).preview as Golfer;
    const resetButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Reset'
    );

    expect(resetButton).toBeTruthy();
    expect((preview as any).appearance.avatarModelId).toBe('none');

    resetButton!.click();

    expect((preview as any).appearance.avatarModelId).toBe('none');
    expect((preview as any).root.getObjectByName('hair-root')).not.toBeNull();

    modal.close(false);
    container.remove();
  });

  it('should open the face preview on the front-facing default pose', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const modal = new AppearanceModal(container, {
      playerName: 'Face Turn Test',
      mode: 'face',
      initialAppearance: DEFAULT_GOLFER_APPEARANCE,
      initialAccessories: {},
      onApply: () => undefined,
    });

    const preview = (modal as any).preview as Golfer;
    expect(preview.root.rotation.y).toBeCloseTo(0, 5);

    modal.close(false);
    container.remove();
  });

  it('should collapse the face diagnostics panel by default and expand on toggle', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const modal = new AppearanceModal(container, {
      playerName: 'Face Collapse Test',
      mode: 'face',
      initialAppearance: DEFAULT_GOLFER_APPEARANCE,
      initialAccessories: {},
      onApply: () => undefined,
    });

    const panel = container.querySelector('.face-debug-panel');
    const toggle = container.querySelector('.face-debug-toggle') as HTMLButtonElement | null;

    expect(panel).not.toBeNull();
    expect(panel?.classList.contains('is-collapsed')).toBe(true);
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');

    toggle?.click();

    expect(panel?.classList.contains('is-collapsed')).toBe(false);
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');

    modal.close(false);
    container.remove();
  });

  it('should generate a thin skull-following buzz cut without a floating cap or forehead box', () => {
    const face = new Golfer({
      ...DEFAULT_GOLFER_APPEARANCE,
      hairStyle: 'buzzCut',
      hairColor: 0x1b120d,
    });

    const hairRoot = face.root.getObjectByName('hair-root') as THREE.Group;
    expect(hairRoot).not.toBeNull();
    // Three-part architecture: crown (top), back, and side pieces.
    const names = hairRoot.children.map((child) => child.name);
    expect(names).toContain('hair-crown');
    expect(names).toContain('hair-back');
    expect(names.some((n) => n === 'hair-side-left' || n === 'hair-side-right')).toBe(true);
    expect(
      hairRoot.children.some(
        (child) => child instanceof THREE.Mesh && child.geometry.type === 'BoxGeometry'
      )
    ).toBe(false);
    expect(hairRoot.children.some((child) => child.name === 'hair-part')).toBe(false);

    face.dispose();
  });

  it('should expose front and back face preview buttons in order', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const modal = new AppearanceModal(container, {
      playerName: 'Orientation Test',
      mode: 'face',
      initialAppearance: DEFAULT_GOLFER_APPEARANCE,
      initialAccessories: {},
      onApply: () => undefined,
    });

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.appearance-header-orientation')
    );

    expect(buttons.map((button) => button.textContent)).toEqual(['Front', 'Left', 'Right', 'Back']);

    const face = (modal as any).isolatedFace as import('@/rendering/Golfer').Face;
    const preview = (modal as any).preview as Golfer;

    buttons[3].click(); // Back
    expect(face.root.rotation.y).toBeCloseTo(Math.PI, 5);

    buttons[1].click(); // Left
    expect(face.root.rotation.y).toBeCloseTo(Math.PI / 2, 5);

    buttons[2].click(); // Right
    expect(face.root.rotation.y).toBeCloseTo(-Math.PI / 2, 5);

    buttons[0].click(); // Front
    expect(face.root.rotation.y).toBeCloseTo(0, 5);
    expect(preview).toBeTruthy();

    modal.close(false);
    container.remove();
  });

  it('should frame the full body preview above the root center so the head and hair remain visible', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const modal = new AppearanceModal(container, {
      playerName: 'Body Framing Test',
      mode: 'face',
      initialAppearance: DEFAULT_GOLFER_APPEARANCE,
      initialAccessories: {},
      onApply: () => undefined,
    });

    const bodyButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.appearance-mode-button')
    ).find((button) => button.textContent === 'Body');
    bodyButton?.click();

    const preview = (modal as any).preview as Golfer;
    const bounds = new THREE.Box3().setFromObject(preview.root);
    const center = bounds.getCenter(new THREE.Vector3());
    const cameraTarget = (modal as any).cameraTarget as THREE.Vector3;

    expect(bounds.isEmpty()).toBe(false);
    expect(cameraTarget.y).toBeGreaterThan(center.y);
    expect((modal as any).camera.position.distanceTo(cameraTarget)).toBeGreaterThan(1.5);

    modal.close(false);
    container.remove();
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
      // The decorative placket was removed (m600 fix); it must stay gone.
      expect(placket).toBeUndefined();
      expect(collar?.material).toBeTruthy();
      expect((collar?.material as THREE.MeshStandardMaterial).color).toBeTruthy();
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
    ).toBeGreaterThan(0.3);
    expect(BODY_PROFILES.neutralLean.headScale).toBeLessThan(
      BODY_PROFILES.athleticFemale.headScale - 0.06
    );
  });

  it('should default a fresh face to the male preset and keep the face-specific controls aligned to that base', () => {
    const fresh = buildCharacterAppearance({});
    expect(fresh.facePreset).toBe('male');
    expect(fresh.hairStyle).toBe('buzzCut');
    expect(fresh.hairColor).toBe(0x1b120d);
    expect(fresh.skinTone).toBe(0xe8c4b8);
    expect(fresh.face.brow).toBeCloseTo(FACE_PRESETS.male.brow, 5);
    expect(fresh.face.eyeSpacing).toBeCloseTo(FACE_PRESETS.male.eyeSpacing, 5);
    expect(fresh.profile.jawWidth).toBeCloseTo(BODY_PROFILES.neutralLean.jawWidth, 5);
  });

  it('should match the placeholder-inspired male and female settings as the shared defaults', () => {
    expect(FACE_PRESETS.male.hairStyle).toBe('buzzCut');
    expect(FACE_PRESETS.male.hairColor).toBe(0x1b120d);
    expect(FACE_PRESETS.male.skinTone).toBe(0xe8c4b8);
    expect(FACE_PRESETS.female.hairStyle).toBe('bun');
    expect(FACE_PRESETS.female.hairColor).toBe(0x6b4a2f);
    expect(FACE_PRESETS.female.skinTone).toBe(0xeec19a);
    expect(FACE_PRESETS.neutral.hairStyle).toBe('shortCrop');
    expect(FACE_PRESETS.neutral.hairColor).toBe(0x533725);
    expect(FACE_PRESETS.neutral.skinTone).toBe(0xefc49d);
    expect(FACE_PRESETS.neutral.headScale).toBeCloseTo(1.04, 5);
    expect(FACE_PRESETS.neutral.jawWidth).toBeCloseTo(1.08, 5);
    expect(DEFAULT_MALE_APPEARANCE.hairStyle).toBe('buzzCut');
    expect(DEFAULT_MALE_APPEARANCE.facePreset).toBe('male');
    expect(DEFAULT_MALE_APPEARANCE.profile.headScale).toBeCloseTo(1.06, 5);
    expect(DEFAULT_MALE_APPEARANCE.profile.jawWidth).toBeCloseTo(1.12, 5);
    expect(DEFAULT_GOLFER_APPEARANCE.hairStyle).toBe('buzzCut');
    expect(DEFAULT_GOLFER_APPEARANCE.facePreset).toBe('male');
  });

  it('should use 1.12 as the default male jaw width in the procedural face state', () => {
    const face = new Face({ ...FACE_PRESETS.male });
    expect(face['config'].jawWidth).toBeCloseTo(0.99, 5);
    expect(DEFAULT_MALE_APPEARANCE.profile.jawWidth).toBeCloseTo(1.12, 5);
    expect(DEFAULT_GOLFER_APPEARANCE.profile.jawWidth).toBeCloseTo(1.12, 5);
  });

  it('should centralize the procedural face ranges and keep jaw default at 0.99 while widening the range', () => {
    expect(FACE_PARAMETER_LIMITS.jawWidth.default).toBeCloseTo(0.99, 5);
    expect(FACE_PARAMETER_LIMITS.jawWidth.min).toBeLessThan(0.99);
    expect(FACE_PARAMETER_LIMITS.jawWidth.max).toBeGreaterThan(0.99);
    expect(FACE_PARAMETER_LIMITS.jawWidth.min).toBeLessThanOrEqual(0.4);
    expect(FACE_PARAMETER_LIMITS.jawWidth.max).toBeGreaterThanOrEqual(1.6);
    expect(FACE_PARAMETER_LIMITS.headScale.min).toBeLessThan(1);
    expect(FACE_PARAMETER_LIMITS.headScale.max).toBeGreaterThan(1);
    expect(FACE_PARAMETER_LIMITS.eyeSpacing.min).toBeLessThan(0.7);
    expect(FACE_PARAMETER_LIMITS.eyeSpacing.max).toBeGreaterThan(0.7);
  });

  it('should keep cheek geometry independent from eye size changes', () => {
    const face = new Face({
      ...FACE_PRESETS.male,
      eyeSpacing: 0.68,
      jawWidth: 0.99,
    });

    const cheekLeft = face.root.getObjectByName('cheek-left') as THREE.Mesh;
    const cheekRight = face.root.getObjectByName('cheek-right') as THREE.Mesh;
    const leftEye = face.root.getObjectByName('eye-white-left') as THREE.Mesh;
    const rightEye = face.root.getObjectByName('eye-white-right') as THREE.Mesh;

    const cheekLeftBefore = cheekLeft.scale.clone();
    const cheekRightBefore = cheekRight.scale.clone();
    const leftEyeBefore = leftEye.scale.clone();
    const rightEyeBefore = rightEye.scale.clone();

    face.setConfig({ eyeSize: 0.6 });

    expect(cheekLeft.scale.x).toBeCloseTo(cheekLeftBefore.x, 5);
    expect(cheekRight.scale.x).toBeCloseTo(cheekRightBefore.x, 5);
    expect(leftEye.scale.x).not.toBeCloseTo(leftEyeBefore.x, 5);
    expect(rightEye.scale.x).not.toBeCloseTo(rightEyeBefore.x, 5);
  });

  it('should hide the shoulder rig in the head-only body preview while leaving the torso visible', () => {
    const golfer = new Golfer(DEFAULT_GOLFER_APPEARANCE);
    const shoulderL = (golfer as any).joints.get('shoulderL') as THREE.Group;
    const shoulderR = (golfer as any).joints.get('shoulderR') as THREE.Group;
    const torso = (golfer as any).joints.get('torso') as THREE.Group;

    golfer.setHeadOnlyPreview(true);

    expect(shoulderL).toBeTruthy();
    expect(shoulderR).toBeTruthy();
    expect(torso).toBeTruthy();
    expect(shoulderL.visible).toBe(false);
    expect(shoulderR.visible).toBe(false);
    expect(torso.visible).toBe(true);

    golfer.setHeadOnlyPreview(false);
    expect(shoulderL.visible).toBe(true);
    expect(shoulderR.visible).toBe(true);
    golfer.dispose();
  });

  it('should hide hair-style controls in body mode and keep the full body preview visible', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const modal = new AppearanceModal(container, {
      playerName: 'Body Controls Test',
      mode: 'look',
      initialAppearance: DEFAULT_GOLFER_APPEARANCE,
      initialAccessories: {},
      onApply: () => undefined,
    });

    const bodyToggle = container.querySelector(
      '.appearance-mode-button[data-mode="look"]'
    ) as HTMLButtonElement;
    bodyToggle.click();

    const labels = Array.from(container.querySelectorAll('label')).map(
      (label) => label.textContent ?? ''
    );
    expect(labels.some((label) => label.includes('Hair style'))).toBe(false);

    const preview = (modal as any).preview as Golfer;
    const bounds = new THREE.Box3().setFromObject(preview.root);
    expect(bounds.isEmpty()).toBe(false);
    // Full body is visible (arms hang at the sides in the corrected neutral pose,
    // so width reflects shoulder width, not the old wide outstretched pose).
    expect(bounds.max.x - bounds.min.x).toBeGreaterThan(0.8);
    expect(bounds.max.y - bounds.min.y).toBeGreaterThan(1.5);

    modal.close(false);
    container.remove();
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
    ).filter(
      (input) =>
        input.getAttribute('aria-label') !== 'Part transforms' &&
        input.getAttribute('aria-label') !== 'Face Guides'
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
    const leftIris = face.root.getObjectByName('iris-left') as THREE.Mesh;
    const rightIris = face.root.getObjectByName('iris-right') as THREE.Mesh;
    const jaw = face.root.getObjectByName('jaw-part') as THREE.Mesh;

    const initialWhiteScaleX = leftEye.scale.x;
    const initialIrisScaleX = leftIris.scale.x;
    const initialEyelidScaleX = leftEyelid.scale.x;
    const initialJawScaleX = jaw.scale.x;

    face.setConfig({ eyeSize: 0.6, jawWidth: 1.4, chinShape: 1.35, nose: 0.8, mouth: 0.9 });

    expect(leftEye.scale.x).toBeLessThan(initialWhiteScaleX);
    expect(rightEye.scale.x).toBeLessThan(initialWhiteScaleX);
    expect(leftIris.scale.x).toBeLessThan(initialIrisScaleX);
    expect(rightIris.scale.x).toBeLessThan(initialIrisScaleX);
    expect(leftEyelid.scale.x).toBeLessThan(initialEyelidScaleX);
    expect(rightEyelid.scale.x).toBeLessThan(initialEyelidScaleX);
    expect(leftIris.scale.x / leftEye.scale.x).toBeCloseTo(
      initialIrisScaleX / initialWhiteScaleX,
      5
    );
    expect(leftIris.position.x).toBeCloseTo(leftEye.position.x, 5);
    expect(rightIris.position.x).toBeCloseTo(rightEye.position.x, 5);
    expect(Math.abs(leftEye.position.x)).toBeCloseTo(Math.abs(rightEye.position.x), 5);
    expect(jaw.scale.x).toBeGreaterThan(initialJawScaleX);

    const xAfterSizeOnly = leftEye.position.x;
    face.setConfig({ eyeSpacing: 0.3 });
    expect(leftEye.position.x).not.toBeCloseTo(xAfterSizeOnly, 5);
    expect(leftEye.scale.x).toBeLessThan(initialWhiteScaleX);
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
    expect(document.querySelector('.appearance-control input[data-key="skinTone"]')).not.toBeNull();
  });

  it('should render expandable face sections and keep the face preview mounted while toggling', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const modal = new AppearanceModal(container, {
      playerName: 'Face Sections Test',
      mode: 'face',
      initialAppearance: DEFAULT_GOLFER_APPEARANCE,
      initialAccessories: {},
      onApply: () => undefined,
    });

    const sections = Array.from(container.querySelectorAll<HTMLElement>('.face-section')).map(
      (section) => section.dataset.section
    );
    expect(sections).toEqual([
      'head',
      'cheeks',
      'jaw',
      'chin',
      'eyes',
      'nose',
      'mouth',
      'brows',
      'facialHair',
      'hair',
    ]);

    // All sections must start collapsed (content hidden).
    container.querySelectorAll<HTMLElement>('.face-section-content').forEach((content) => {
      expect(content.hidden).toBe(true);
    });

    const faceRoot = (modal as any).isolatedFaceRoot as THREE.Group;
    const jawHeader = container.querySelector(
      '.face-section[data-section="jaw"] .face-section-header'
    ) as HTMLButtonElement;
    jawHeader.click();

    const jawContent = container.querySelector(
      '.face-section[data-section="jaw"] .face-section-content'
    ) as HTMLElement;
    expect(jawContent.hidden).toBe(false);
    expect((modal as any).isolatedFaceRoot).toBe(faceRoot);

    const eyesHeader = container.querySelector(
      '.face-section[data-section="eyes"] .face-section-header'
    ) as HTMLButtonElement;
    eyesHeader.click();

    expect(jawContent.hidden).toBe(true);
    const eyesContent = container.querySelector(
      '.face-section[data-section="eyes"] .face-section-content'
    ) as HTMLElement;
    expect(eyesContent.hidden).toBe(false);

    // Clicking the open section header collapses it again.
    eyesHeader.click();
    expect(eyesContent.hidden).toBe(true);

    // Accordion interaction must not move the camera or touch appearance.
    const camera = (modal as any).camera as THREE.PerspectiveCamera;
    const camPos = camera.position.clone();
    const jawBefore = (modal as any).draft.profile.jawWidth;
    jawHeader.click();
    expect(camera.position.x).toBeCloseTo(camPos.x, 5);
    expect(camera.position.y).toBeCloseTo(camPos.y, 5);
    expect(camera.position.z).toBeCloseTo(camPos.z, 5);
    expect((modal as any).draft.profile.jawWidth).toBeCloseTo(jawBefore, 5);

    const jawInput = jawContent.querySelector('input[type="range"]') as HTMLInputElement;
    expect(jawInput.dataset.key).toBe('jawWidth');
    const before = jawInput.value;
    jawInput.value = '1.4';
    jawInput.dispatchEvent(new Event('input'));
    expect((modal as any).draft.profile.jawWidth).toBeCloseTo(1.4, 5);
    jawInput.value = before;
    jawInput.dispatchEvent(new Event('input'));

    modal.close(false);
    container.remove();
  });

  it('should make Reset View camera-only and leave appearance unchanged', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const modal = new AppearanceModal(container, {
      playerName: 'Reset View Test',
      mode: 'face',
      initialAppearance: DEFAULT_GOLFER_APPEARANCE,
      initialAccessories: {},
      onApply: () => undefined,
    });

    const camera = (modal as any).camera as THREE.PerspectiveCamera;
    (modal as any).draft.profile.jawWidth = 1.5;
    camera.position.set(9, 9, 9);

    const resetViewBtn = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Reset View'
    ) as HTMLButtonElement;
    resetViewBtn.click();

    expect(camera.position.x).not.toBeCloseTo(9, 1);
    expect((modal as any).draft.profile.jawWidth).toBeCloseTo(1.5, 5);

    modal.close(false);
    container.remove();
  });

  it('should isolate the face and hide the body and shoulders in face mode', () => {
    document.body.innerHTML = '';
    const container = document.createElement('div');
    document.body.appendChild(container);

    const modal = new AppearanceModal(container, {
      playerName: 'Face Isolation Test',
      mode: 'face',
      initialAppearance: DEFAULT_GOLFER_APPEARANCE,
      initialAccessories: {},
      onApply: () => undefined,
    });

    const preview = (modal as any).preview as Golfer;
    const isolatedFaceRoot = (modal as any).isolatedFaceRoot as THREE.Group;

    expect(preview.root.visible).toBe(false);
    expect(isolatedFaceRoot.visible).toBe(true);
    expect(isolatedFaceRoot.getObjectByName('head-part')).not.toBeNull();
    expect(preview.root.getObjectByName('torso-part')).not.toBeNull();

    modal.close(false);
    container.remove();
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
