import { vi } from 'vitest';

export enum RigidBodyType {
  Dynamic = 0,
  Fixed = 1,
  KinematicPositionBased = 2,
  KinematicVelocityBased = 3,
}

const bodies = new Map();
let bodyIdCounter = 0;

export class World {
  constructor() {}

  createRigidBody(_desc: any) {
    const id = bodyIdCounter++;
    const body = {
      handle: id,
      translation: () => ({ x: 0, y: 0, z: 0 }),
      rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }),
      setLinvel: vi.fn(),
      linvel: () => ({ x: 0, y: 0, z: 0 }),
      isDynamic: () => true,
      bodyType: () => RigidBodyType.Dynamic,
      setNextKinematicTranslation: vi.fn(),
      setNextKinematicRotation: vi.fn(),
    };
    bodies.set(id, body);
    return body;
  }

  createCollider(_desc: any, body: any) {
    return { handle: body.handle };
  }

  getRigidBody(handle: number) {
    return bodies.get(handle);
  }

  removeRigidBody(body: any) {
    bodies.delete(body.handle);
  }

  step(eventQueue: any) {
    if (eventQueue && eventQueue.drainCollisionEvents) {
      eventQueue.drainCollisionEvents(() => {});
    }
  }
}

export class EventQueue {
  constructor(_autoDrain: boolean) {}

  drainCollisionEvents(_callback: (...args: unknown[]) => void) {
    // Mock implementation
  }
}

export const RigidBodyDesc = {
  dynamic: () => ({
    setTranslation: function () {
      return this;
    },
  }),
  fixed: () => ({
    setTranslation: function () {
      return this;
    },
  }),
};

export const ColliderDesc = {
  cuboid: (_x: number, _y: number, _z: number) => ({
    setMass: function () {
      return this;
    },
  }),
  ball: (_radius: number) => ({
    setMass: function () {
      return this;
    },
  }),
};
