import { addComponent, removeEntity } from 'bitecs';
import * as THREE from 'three';
import { ColliderDesc } from '@dimforge/rapier3d';
import { world, transformQuery } from '@/core/ecs';
import { Basket, Bomb, Transform } from '@/core/components';
import {
  createStaticBox,
  createStaticCylinder,
  createStaticCompound,
  createDynamicCapsule,
  createDynamicDisc,
  linkWithBallJoint,
  yawQuaternion,
  CollisionGroups,
} from '@/physics/factories';
import {
  addMesh,
  removeMesh,
  addSceneObject,
  getScene,
  createDiscMesh,
  createBoxMesh,
  createAdPanelMesh,
  createAdCylinderMesh,
  createNetMesh,
  createCylinderMesh,
  createBandMesh,
  createTorusMesh,
  createCapsuleMesh,
} from '@/rendering/RenderSystem';
import { Golfer } from '@/rendering/Golfer';
import { getPhysicsWorld } from '@/physics/init';
import { unregisterPhysicsBody, entityToRigidBody } from '@/physics/PhysicsSystem';
import { COURSE } from './course';
import { Hole } from './hole';
import type { Disc, ThrowSelection, ThrowStyle } from './discs';

const BASKET = {
  baseRadius: 1.0,
  baseHeight: 0.2,
  poleRadius: 0.14,
  poleTop: 4.4,
  trayRadius: 1.7,
  trayFloorY: 1.6,
  trayWallHeight: 0.8,
  rimRadius: 1.85,
  rimHeight: 0.3,
  rimY: 4.25,
  chainCount: 12,
  chainRadius: 1.2,
  linksPerChain: 5,
  linkRadius: 0.07,
  linkLength: 0.26,
};

const BAND_COLOR = 0xffd54a;
const METAL_COLOR = 0x6f7681;
const CHAIN_COLOR = 0x5c636d;
const WALL_COLOR = 0x1f3a5f;
// Light backstop behind the basket so the dark chains stay legible at range.
const BACKSTOP_COLOR = 0xdfe7f0;
const PILLAR_COLOR = 0xeef1f5;
const PILLAR_BASE_COLOR = 0x1f3a5f;

export class GameManager {
  private entities: number[] = [];
  private ballTimers = new Set<ReturnType<typeof setTimeout>>();
  private golfer = new Golfer();
  private pendingThrow: {
    direction: { x: number; y: number; z: number };
    selection: ThrowSelection;
  } | null = null;
  private activeDisc: {
    entity: number;
    disc: Disc;
    style: ThrowStyle;
    playerIndex: number;
    airborne: number;
    settleTimer: number;
  } | null = null;
  private releasePoint = new THREE.Vector3();

  /** Each player's disc stays on the ground to mark their lie. */
  private lieDiscs = new Map<number, number>();

  hole = new Hole({ x: 0, y: 0, z: COURSE.basketZ });
  onHoleChange: (() => void) | null = null;

  constructor() {
    this.moveGolferToTurn();
    addSceneObject(this.golfer.root);
  }

  reset() {
    for (const timer of this.ballTimers) {
      clearTimeout(timer);
    }
    this.ballTimers.clear();
    this.activeDisc = null;
    this.pendingThrow = null;
    this.lieDiscs.clear();
    this.hole = new Hole({ x: 0, y: 0, z: COURSE.basketZ });

    // Snapshot: the query array is mutated as entities are removed.
    const allEntities: number[] = Array.from(transformQuery(world) as ArrayLike<number>);
    for (let i = 0; i < allEntities.length; i++) {
      const entity = allEntities[i];
      this.removeEntity(entity);
    }
    this.entities = [];

    // Create ground
    const ground = createStaticBox(
      { x: 0, y: -0.5, z: 0 },
      { x: COURSE.groundWidth, y: 1, z: COURSE.groundLength }
    );
    this.entities.push(ground);

    this.createArena();
    this.createObstacles();
    this.createBasket({ x: 0, y: 0, z: COURSE.basketZ });
    this.moveGolferToTurn();
    this.onHoleChange?.();
  }

  private createObstacles() {
    COURSE.pillars.forEach((pillar, i) => {
      const shaft = createStaticCylinder(
        { x: pillar.x, y: COURSE.pillarHeight / 2, z: pillar.z },
        COURSE.pillarRadius,
        COURSE.pillarHeight
      );
      addMesh(shaft, createCylinderMesh(COURSE.pillarRadius, COURSE.pillarHeight, PILLAR_COLOR));
      this.entities.push(shaft);

      // Sponsor wraps sit just proud of the shaft; the shaft carries the collision.
      for (let b = 0; b < COURSE.pillarAdBands; b++) {
        const bandY = 0.7 + COURSE.pillarAdHeight * (b + 0.5);
        const band = createStaticCylinder(
          { x: pillar.x, y: bandY, z: pillar.z },
          COURSE.pillarRadius * 1.04,
          COURSE.pillarAdHeight
        );
        addMesh(
          band,
          createAdCylinderMesh(
            COURSE.pillarRadius * 1.04,
            COURSE.pillarAdHeight,
            i * COURSE.pillarAdBands + b,
            1
          )
        );
        this.entities.push(band);
      }

      const base = createStaticCylinder(
        { x: pillar.x, y: 0.35, z: pillar.z },
        COURSE.pillarRadius * 1.18,
        0.7
      );
      addMesh(base, createCylinderMesh(COURSE.pillarRadius * 1.18, 0.7, PILLAR_BASE_COLOR));
      this.entities.push(base);
    });
  }

  private createArena() {
    const hw = COURSE.arenaHalfWidth;
    const t = COURSE.wallThickness;
    const length = COURSE.arenaFrontZ - COURSE.arenaBackZ;
    const centerZ = (COURSE.arenaFrontZ + COURSE.arenaBackZ) / 2;

    const walls = [
      {
        x: -hw,
        z: centerZ,
        width: t,
        depth: length,
        height: COURSE.wallHeight,
        color: WALL_COLOR,
        ads: true,
        netted: true,
      },
      {
        x: hw,
        z: centerZ,
        width: t,
        depth: length,
        height: COURSE.wallHeight,
        color: WALL_COLOR,
        ads: true,
        netted: true,
      },
      {
        x: 0,
        z: COURSE.arenaBackZ,
        width: hw * 2 + t,
        depth: t,
        height: COURSE.backstopHeight,
        color: BACKSTOP_COLOR,
        ads: false,
        netted: true,
      },
      {
        x: 0,
        z: COURSE.arenaFrontZ,
        width: hw * 2 + t,
        depth: t,
        height: COURSE.wallHeight,
        color: WALL_COLOR,
        ads: true,
        netted: false,
      },
    ];

    for (const w of walls) {
      const wall = createStaticBox(
        { x: w.x, y: w.height / 2, z: w.z },
        { x: w.width, y: w.height, z: w.depth }
      );
      addMesh(
        wall,
        w.ads
          ? createNetMesh(w.width, w.height, w.depth)
          : createBoxMesh(w.width, w.height, w.depth, w.color)
      );
      this.entities.push(wall);

      if (w.ads) {
        this.createAdPanels(w);
      }

      if (!w.netted) {
        continue;
      }

      const net = createStaticBox(
        { x: w.x, y: w.height + COURSE.netHeight / 2, z: w.z },
        { x: w.width, y: COURSE.netHeight, z: w.depth }
      );
      addMesh(net, createNetMesh(w.width, COURSE.netHeight, w.depth));
      this.entities.push(net);
    }
  }

  /** Freestanding boards along a wall, separated by gaps that show the fence behind. */
  private createAdPanels(wall: { x: number; z: number; width: number; depth: number }) {
    const alongZ = wall.depth > wall.width;
    const span = alongZ ? wall.depth : wall.width;
    const boardLength = 10;
    const pitch = boardLength + 2.6;
    const count = Math.floor(span / pitch);
    const start = -((count - 1) * pitch) / 2;
    const height = COURSE.wallHeight * 0.78;
    const inset = Math.sign(alongZ ? wall.x : wall.z) * -0.7;

    for (let i = 0; i < count; i++) {
      const offset = start + i * pitch;
      const position = alongZ
        ? { x: wall.x + inset, y: height / 2 + 0.15, z: wall.z + offset }
        : { x: wall.x + offset, y: height / 2 + 0.15, z: wall.z + inset };
      const size = alongZ
        ? { x: 0.3, y: height, z: boardLength }
        : { x: boardLength, y: height, z: 0.3 };

      const panel = createStaticBox(position, size);
      addMesh(panel, createAdPanelMesh(i, size.x, size.y, size.z));
      this.entities.push(panel);
    }
  }

  /** Cuboid segments approximating an open-ended tube, in body-local space. */
  private ringColliders(radius: number, height: number, thickness: number, segments: number) {
    const colliders: ColliderDesc[] = [];
    const halfTangential = (Math.PI * radius) / segments;

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      colliders.push(
        ColliderDesc.cuboid(halfTangential, height / 2, thickness / 2)
          .setTranslation(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
          .setRotation(yawQuaternion(Math.PI / 2 - angle))
          .setRestitution(0.1)
      );
    }

    return colliders;
  }

  private createBasket(origin: { x: number; y: number; z: number }) {
    const base = createStaticCylinder(
      { x: origin.x, y: origin.y + BASKET.baseHeight / 2, z: origin.z },
      BASKET.baseRadius,
      BASKET.baseHeight
    );
    addMesh(base, createCylinderMesh(BASKET.baseRadius, BASKET.baseHeight, METAL_COLOR));
    this.tagBasketPart(base);

    const poleHeight = BASKET.poleTop - BASKET.baseHeight;
    const pole = createStaticCylinder(
      { x: origin.x, y: origin.y + BASKET.baseHeight + poleHeight / 2, z: origin.z },
      BASKET.poleRadius,
      poleHeight
    );
    addMesh(pole, createCylinderMesh(BASKET.poleRadius, poleHeight, METAL_COLOR));
    this.tagBasketPart(pole);

    const trayFloor = createStaticCylinder(
      { x: origin.x, y: origin.y + BASKET.trayFloorY, z: origin.z },
      BASKET.trayRadius,
      0.12
    );
    addMesh(trayFloor, createCylinderMesh(BASKET.trayRadius, 0.12, BAND_COLOR));
    this.tagBasketPart(trayFloor);

    const trayWallY = BASKET.trayFloorY + BASKET.trayWallHeight / 2;
    const trayWall = createStaticCompound(
      { x: origin.x, y: origin.y + trayWallY, z: origin.z },
      this.ringColliders(BASKET.trayRadius, BASKET.trayWallHeight, 0.12, 20)
    );
    addMesh(trayWall, createBandMesh(BASKET.trayRadius, BASKET.trayWallHeight, BAND_COLOR));
    this.tagBasketPart(trayWall);

    const rim = createStaticCompound(
      { x: origin.x, y: origin.y + BASKET.rimY, z: origin.z },
      this.ringColliders(BASKET.rimRadius, BASKET.rimHeight, 0.12, 20)
    );
    addMesh(rim, createBandMesh(BASKET.rimRadius, BASKET.rimHeight, BAND_COLOR));
    this.tagBasketPart(rim);

    const rimEdge = createStaticCompound(
      { x: origin.x, y: origin.y + BASKET.rimY, z: origin.z },
      []
    );
    addMesh(rimEdge, createTorusMesh(BASKET.rimRadius, 0.06, METAL_COLOR));
    this.tagBasketPart(rimEdge);

    this.createChains(origin, rim);
  }

  private createChains(origin: { x: number; y: number; z: number }, rim: number) {
    // Anchors sit at the capsule tips, so the chain is already at rest when spawned.
    const linkPitch = BASKET.linkLength + BASKET.linkRadius * 2;
    const topY = origin.y + BASKET.rimY - BASKET.rimHeight / 2;

    for (let c = 0; c < BASKET.chainCount; c++) {
      const angle = (c / BASKET.chainCount) * Math.PI * 2;
      const x = origin.x + Math.cos(angle) * BASKET.chainRadius;
      const z = origin.z + Math.sin(angle) * BASKET.chainRadius;

      let parent = rim;
      let parentAnchor = {
        x: Math.cos(angle) * BASKET.chainRadius,
        y: -BASKET.rimHeight / 2,
        z: Math.sin(angle) * BASKET.chainRadius,
      };

      for (let l = 0; l < BASKET.linksPerChain; l++) {
        const y = topY - linkPitch * (l + 0.5);
        const link = createDynamicCapsule(
          { x, y, z },
          BASKET.linkRadius,
          BASKET.linkLength,
          0.35,
          CollisionGroups.chain
        );
        addMesh(link, createCapsuleMesh(BASKET.linkRadius, BASKET.linkLength, CHAIN_COLOR));
        this.tagBasketPart(link);

        linkWithBallJoint(parent, link, parentAnchor, { x: 0, y: linkPitch / 2, z: 0 });

        parent = link;
        parentAnchor = { x: 0, y: -linkPitch / 2, z: 0 };
      }
    }
  }

  private tagBasketPart(entity: number) {
    addComponent(world, Basket, entity);
    this.entities.push(entity);
  }

  /** Shows the selected disc in the golfer's hand before the throw starts. */
  previewDisc(color: number) {
    if (!this.golfer.isThrowing) {
      this.golfer.setDiscColor(color);
    }
  }

  /** Starts the throw animation; the disc is spawned later, at the release pose. */
  shootBall(direction: { x: number; y: number; z: number }, selection: ThrowSelection) {
    if (this.golfer.isThrowing || this.activeDisc || !this.hole.current) {
      return false;
    }

    this.hole.recordThrow();
    this.pendingThrow = { direction, selection };
    this.golfer.setDiscColor(selection.disc.color);
    this.golfer.setHeading(Math.atan2(-direction.x, 1) * 0.35);
    this.golfer.play(this.animationFor(selection));
    this.onHoleChange?.();
    return true;
  }

  /** Close to the pin the golfer putts, whatever style the bag has selected. */
  private animationFor(selection: ThrowSelection) {
    const state = this.hole.current;
    return state && this.hole.isPutting(state) ? 'putt' : selection.style.id;
  }

  update(dt: number) {
    if (this.golfer.update(dt) && this.pendingThrow) {
      this.releaseDisc(this.pendingThrow.direction, this.pendingThrow.selection);
      this.pendingThrow = null;
    }

    this.applyFlight(dt);
  }

  /**
   * Turn and fade. While the disc is still fast it bends toward its turn rating;
   * as it slows, fade takes over and pulls it back the other way.
   */
  private applyFlight(dt: number) {
    const active = this.activeDisc;
    if (!active) {
      return;
    }

    const body = entityToRigidBody.get(active.entity);
    if (!body) {
      return;
    }

    active.airborne += dt;

    const velocity = body.linvel();
    const horizontal = Math.hypot(velocity.x, velocity.z);
    const speed = Math.hypot(horizontal, velocity.y);

    // Give it a moment off the hand before rest detection can trigger.
    if (active.airborne > 0.5 && speed < 1.2) {
      active.settleTimer += dt;
      if (active.settleTimer > 0.45) {
        this.settleDisc();
        return;
      }
    } else {
      active.settleTimer = 0;
    }

    if (active.airborne > 14) {
      this.settleDisc();
      return;
    }

    if (horizontal < 0.5) {
      return;
    }

    const fullSpeed = COURSE.throwSpeed * (0.52 + active.disc.speed * 0.045);
    const pace = Math.min(horizontal / fullSpeed, 1);
    const spin = active.style.spinSign;

    // Sideways unit vector, to the right of travel.
    const rightX = -velocity.z / horizontal;
    const rightZ = velocity.x / horizontal;

    const turn = active.disc.turn * pace * pace * 0.9;
    const fade = active.disc.fade * (1 - pace) * (1 - pace) * 1.6;
    const lateral = (-turn + fade) * spin * dt;

    // Glide resists gravity while the disc still has pace.
    const lift = active.disc.glide * pace * 0.55 * dt;

    body.setLinvel(
      {
        x: velocity.x + rightX * lateral,
        y: velocity.y + lift,
        z: velocity.z + rightZ * lateral,
      },
      true
    );
  }

  private releaseDisc(direction: { x: number; y: number; z: number }, selection: ThrowSelection) {
    const { disc, style, angle, power } = selection;
    const discRadius = 0.28;
    // Drivers are thinner and sharper-edged than putters.
    const thickness = 0.085 - disc.speed * 0.003;

    this.golfer.getDiscWorldPosition(this.releasePoint);

    const entity = createDynamicDisc(
      { x: this.releasePoint.x, y: this.releasePoint.y, z: this.releasePoint.z },
      discRadius,
      thickness,
      0.6 + disc.speed * 0.02
    );

    addComponent(world, Bomb, entity);
    addMesh(entity, createDiscMesh(discRadius, thickness, disc.color));

    // Speed rating sets the launch velocity; glide trades drop for carry.
    const launch = COURSE.throwSpeed * (0.52 + disc.speed * 0.045) * style.powerScale * power;
    const loft = (COURSE.throwLoft * (0.75 + disc.glide * 0.07) + style.loftBias * launch) * power;

    const body = entityToRigidBody.get(entity);
    if (body) {
      body.setLinvel(
        {
          x: direction.x * launch + Math.sin(angle.bank) * launch * 0.12,
          y: direction.y * launch + loft,
          z: -launch,
        },
        true
      );

      // Spin direction decides which way the disc fades; faster discs are thrown harder.
      body.setAngvel({ x: 0, y: style.spinSign * (26 + disc.speed * 2.4) * power, z: 0 }, true);
      body.setRotation(
        { x: 0, y: 0, z: Math.sin(angle.bank / 2) * style.spinSign, w: Math.cos(angle.bank / 2) },
        true
      );
    }

    const playerIndex = this.hole.currentPlayerIndex;

    // Clear the marker disc this player left behind on their previous shot.
    const previous = this.lieDiscs.get(playerIndex);
    if (previous !== undefined) {
      this.removeEntity(previous);
      this.lieDiscs.delete(playerIndex);
    }

    this.activeDisc = {
      entity,
      disc,
      style,
      playerIndex,
      airborne: 0,
      settleTimer: 0,
    };
    this.entities.push(entity);
  }

  /** Records where the disc stopped, whether it holed out, and passes the honour on. */
  private settleDisc() {
    const active = this.activeDisc;
    if (!active) {
      return;
    }

    this.activeDisc = null;

    const lie = {
      x: Transform.x[active.entity],
      y: Transform.y[active.entity],
      z: Transform.z[active.entity],
    };
    const holed = this.isHoled(lie);

    if (holed) {
      this.removeEntity(active.entity);
    } else {
      this.lieDiscs.set(active.playerIndex, active.entity);
    }

    this.hole.recordResult(lie, holed);
    this.moveGolferToTurn();
    this.onHoleChange?.();
  }

  /** Inside the tray walls and below the rim counts as made. */
  private isHoled(position: { x: number; y: number; z: number }): boolean {
    const radial = Math.hypot(position.x, position.z - COURSE.basketZ);
    return (
      radial < BASKET.trayRadius * 0.95 &&
      position.y > BASKET.trayFloorY - 0.3 &&
      position.y < BASKET.rimY
    );
  }

  private moveGolferToTurn() {
    const state = this.hole.current;
    const pin = { x: 0, z: COURSE.basketZ };

    if (!state || !state.lie) {
      const tee = { x: 0, y: COURSE.teePadHeight + 0.165, z: COURSE.teeZ };
      this.golfer.setPosition(tee.x, tee.y, tee.z);
      getScene()?.frameShot(tee, pin);
      return;
    }

    this.golfer.setPosition(state.lie.x, 0, state.lie.z);
    getScene()?.frameShot({ x: state.lie.x, y: 0, z: state.lie.z }, pin);
  }

  private removeEntity(entity: number) {
    removeMesh(entity);

    const body = entityToRigidBody.get(entity);
    if (body) {
      const physicsWorld = getPhysicsWorld();
      // Guard against removing a handle the world already freed.
      if (physicsWorld.getRigidBody(body.handle)) {
        physicsWorld.removeRigidBody(body);
      }
      unregisterPhysicsBody(entity);
    }

    removeEntity(world, entity);
  }
}
