# Poses

## Definition

A **Pose** is a named snapshot of anatomical joint state at one moment.

## Conceptual type

```ts
interface GolferPose {
  id: string;
  name: string;

  torso?: {
    rotation?: number;
    lean?: number;
  };

  leftShoulder?: {
    abduction?: number;
    flexion?: number;
    rotation?: number;
  };

  leftElbow?: {
    flexion?: number;
  };

  rightShoulder?: {
    abduction?: number;
    flexion?: number;
    rotation?: number;
  };

  rightElbow?: {
    flexion?: number;
  };
}
```

Conceptual documentation only — the actual implementation may use stronger
types. Pose data is **semantic anatomy** (`leftShoulder.abduction`), never
mesh-specific (`mesh_17.rotation.z`), so poses survive geometry changes.

> **POSE DATA IS STORED FROM THE GOLFER'S PERSPECTIVE.** `leftShoulder` /
> `rightElbow` / etc. always mean the golfer's anatomical left/right, regardless
> of which camera view is showing. Camera orientation never changes anatomical
> left/right.

## Pose library concept

Examples of pose IDs we intend to author:

```
neutral/standing

backhand/ready
backhand/x-step-1
backhand/x-step-2
backhand/plant
backhand/reach-back
backhand/power-pocket
backhand/release
backhand/follow-through
backhand/finish

forehand/ready
forehand/load
forehand/plant
forehand/release
forehand/follow-through

putt/address
putt/backswing
putt/release
putt/follow-through

overhand/setup
overhand/load
overhand/release
overhand/follow-through

roller/setup
roller/release
roller/follow-through
```

## Sample Copilot Prompt

> "Create the `backhand/reach-back` pose using the existing semantic joint
> controls and register it in the PoseLibrary. Validate Front/Side/Back
> screenshots. Do not change base geometry. Run typecheck/build/tests."
