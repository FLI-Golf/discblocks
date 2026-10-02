import { addEntity, addComponent } from 'bitecs';
import { Transform, PhysicsBody, Velocity } from '@/core/components';
import { world } from '@/core/ecs';
import { getPhysicsWorld } from './init';
import { registerPhysicsBody, entityToRigidBody } from './PhysicsSystem';
import { RigidBodyDesc, ColliderDesc, JointData } from '@dimforge/rapier3d';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export function yawQuaternion(yaw: number): Quat {
  return { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) };
}

const GROUP_DEFAULT = 0x0001;
const GROUP_CHAIN = 0x0002;

/** Rapier interaction groups: high 16 bits are membership, low 16 bits are the filter. */
export const CollisionGroups = {
  default: (GROUP_DEFAULT << 16) | 0xffff,
  /** Chain links collide with everything except other chain links. */
  chain: (GROUP_CHAIN << 16) | (0xffff & ~GROUP_CHAIN),
};

export function createDynamicBox(position: Vec3, size: Vec3, mass: number = 1.0): number {
  const physicsWorld = getPhysicsWorld();
  const entity = addEntity(world);

  addComponent(world, Transform, entity);
  addComponent(world, PhysicsBody, entity);
  addComponent(world, Velocity, entity);

  Transform.x[entity] = position.x;
  Transform.y[entity] = position.y;
  Transform.z[entity] = position.z;
  Transform.qx[entity] = 0;
  Transform.qy[entity] = 0;
  Transform.qz[entity] = 0;
  Transform.qw[entity] = 1;

  Velocity.x[entity] = 0;
  Velocity.y[entity] = 0;
  Velocity.z[entity] = 0;

  const bodyDesc = RigidBodyDesc.dynamic().setTranslation(position.x, position.y, position.z);

  const body = physicsWorld.createRigidBody(bodyDesc);

  const colliderDesc = ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2).setMass(mass);

  physicsWorld.createCollider(colliderDesc, body);

  registerPhysicsBody(entity, body);

  return entity;
}

export function createStaticBox(position: Vec3, size: Vec3): number {
  const physicsWorld = getPhysicsWorld();
  const entity = addEntity(world);

  addComponent(world, Transform, entity);
  addComponent(world, PhysicsBody, entity);

  Transform.x[entity] = position.x;
  Transform.y[entity] = position.y;
  Transform.z[entity] = position.z;
  Transform.qx[entity] = 0;
  Transform.qy[entity] = 0;
  Transform.qz[entity] = 0;
  Transform.qw[entity] = 1;

  const bodyDesc = RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);

  const body = physicsWorld.createRigidBody(bodyDesc);

  const colliderDesc = ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);

  physicsWorld.createCollider(colliderDesc, body);

  registerPhysicsBody(entity, body);

  return entity;
}

export function createSphere(position: Vec3, radius: number, mass: number = 1.0): number {
  const physicsWorld = getPhysicsWorld();
  const entity = addEntity(world);

  addComponent(world, Transform, entity);
  addComponent(world, PhysicsBody, entity);
  addComponent(world, Velocity, entity);

  Transform.x[entity] = position.x;
  Transform.y[entity] = position.y;
  Transform.z[entity] = position.z;
  Transform.qx[entity] = 0;
  Transform.qy[entity] = 0;
  Transform.qz[entity] = 0;
  Transform.qw[entity] = 1;

  Velocity.x[entity] = 0;
  Velocity.y[entity] = 0;
  Velocity.z[entity] = 0;

  const bodyDesc = RigidBodyDesc.dynamic().setTranslation(position.x, position.y, position.z);

  const body = physicsWorld.createRigidBody(bodyDesc);

  const colliderDesc = ColliderDesc.ball(radius).setMass(mass);

  physicsWorld.createCollider(colliderDesc, body);

  registerPhysicsBody(entity, body);

  return entity;
}

export function createStaticCylinder(position: Vec3, radius: number, height: number): number {
  const physicsWorld = getPhysicsWorld();
  const entity = addEntity(world);

  addComponent(world, Transform, entity);
  addComponent(world, PhysicsBody, entity);

  Transform.x[entity] = position.x;
  Transform.y[entity] = position.y;
  Transform.z[entity] = position.z;
  Transform.qx[entity] = 0;
  Transform.qy[entity] = 0;
  Transform.qz[entity] = 0;
  Transform.qw[entity] = 1;

  const bodyDesc = RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);

  const body = physicsWorld.createRigidBody(bodyDesc);

  physicsWorld.createCollider(ColliderDesc.cylinder(height / 2, radius), body);

  registerPhysicsBody(entity, body);

  return entity;
}

/** A single fixed body carrying several colliders, for shapes Rapier has no primitive for. */
export function createStaticCompound(position: Vec3, colliders: ColliderDesc[]): number {
  const physicsWorld = getPhysicsWorld();
  const entity = addEntity(world);

  addComponent(world, Transform, entity);
  addComponent(world, PhysicsBody, entity);

  Transform.x[entity] = position.x;
  Transform.y[entity] = position.y;
  Transform.z[entity] = position.z;
  Transform.qx[entity] = 0;
  Transform.qy[entity] = 0;
  Transform.qz[entity] = 0;
  Transform.qw[entity] = 1;

  const bodyDesc = RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);

  const body = physicsWorld.createRigidBody(bodyDesc);

  for (const colliderDesc of colliders) {
    physicsWorld.createCollider(colliderDesc, body);
  }

  registerPhysicsBody(entity, body);

  return entity;
}

/** Flat spinning disc. Keeps its own velocity so PhysicsSystem never overwrites the spin. */
export function createDynamicDisc(
  position: Vec3,
  radius: number,
  thickness: number,
  mass: number = 0.8
): number {
  const physicsWorld = getPhysicsWorld();
  const entity = addEntity(world);

  addComponent(world, Transform, entity);
  addComponent(world, PhysicsBody, entity);

  Transform.x[entity] = position.x;
  Transform.y[entity] = position.y;
  Transform.z[entity] = position.z;
  Transform.qx[entity] = 0;
  Transform.qy[entity] = 0;
  Transform.qz[entity] = 0;
  Transform.qw[entity] = 1;

  const bodyDesc = RigidBodyDesc.dynamic()
    .setTranslation(position.x, position.y, position.z)
    .setLinearDamping(0.06)
    .setAngularDamping(0.12);

  const body = physicsWorld.createRigidBody(bodyDesc);

  const colliderDesc = ColliderDesc.cylinder(thickness / 2, radius)
    .setMass(mass)
    .setRestitution(0.1)
    .setFriction(0.6);

  physicsWorld.createCollider(colliderDesc, body);

  registerPhysicsBody(entity, body);

  return entity;
}

export function createDynamicCapsule(
  position: Vec3,
  radius: number,
  height: number,
  mass: number = 1.0,
  collisionGroups: number = CollisionGroups.default
): number {
  const physicsWorld = getPhysicsWorld();
  const entity = addEntity(world);

  addComponent(world, Transform, entity);
  addComponent(world, PhysicsBody, entity);

  Transform.x[entity] = position.x;
  Transform.y[entity] = position.y;
  Transform.z[entity] = position.z;
  Transform.qx[entity] = 0;
  Transform.qy[entity] = 0;
  Transform.qz[entity] = 0;
  Transform.qw[entity] = 1;

  const bodyDesc = RigidBodyDesc.dynamic()
    .setTranslation(position.x, position.y, position.z)
    .setLinearDamping(1.2)
    .setAngularDamping(1.5);

  const body = physicsWorld.createRigidBody(bodyDesc);

  const colliderDesc = ColliderDesc.capsule(height / 2, radius)
    .setMass(mass)
    .setRestitution(0)
    .setFriction(0.4)
    .setCollisionGroups(collisionGroups);

  physicsWorld.createCollider(colliderDesc, body);

  registerPhysicsBody(entity, body);

  return entity;
}

export function linkWithBallJoint(
  parentEntity: number,
  childEntity: number,
  anchorOnParent: Vec3,
  anchorOnChild: Vec3
) {
  const parent = entityToRigidBody.get(parentEntity);
  const child = entityToRigidBody.get(childEntity);
  if (!parent || !child) {
    return;
  }

  const physicsWorld = getPhysicsWorld();
  physicsWorld.createImpulseJoint(
    JointData.spherical(anchorOnParent, anchorOnChild),
    parent,
    child,
    true
  );
}
