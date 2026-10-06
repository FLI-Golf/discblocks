import { World, EventQueue } from '@dimforge/rapier3d';

let physicsWorld: World | null = null;
let eventQueue: EventQueue | null = null;

export async function initPhysics() {
  const RAPIER = await import('@dimforge/rapier3d');

  physicsWorld = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
  // Jointed chains need more solver work than the default to settle instead of buzzing.
  physicsWorld.numSolverIterations = 8;
  physicsWorld.numInternalPgsIterations = 4;
  eventQueue = new RAPIER.EventQueue(true);

  return { physicsWorld, eventQueue, RAPIER };
}

export function getPhysicsWorld(): World {
  if (!physicsWorld) {
    throw new Error('Physics world not initialized. Call initPhysics first.');
  }
  return physicsWorld;
}

export function getEventQueue(): EventQueue {
  if (!eventQueue) {
    throw new Error('Event queue not initialized. Call initPhysics first.');
  }
  return eventQueue;
}
