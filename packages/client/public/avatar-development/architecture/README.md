# Architecture

## Conceptual pipeline

```
Avatar Appearance
        ↓
Procedural Geometry
        ↓
Anatomical Rig
        ↓
Pose
        ↓
Action
        ↓
Scene / Gameplay
```

These layers must remain separated.

## Rules

- **DO NOT bake gameplay poses into base geometry.** The base rig represents a
  mechanically correct golfer; poses are applied on top.
- Appearance changes (proportions, colors) operate on the base rig's
  dimensions, not on pose data.
- A Pose is pure data (joint state), independent of any specific mesh.
- An Action is an ordered list of poses + times, independent of rendering.
- The Rig/Controller translates semantic pose data into Three.js transforms.

## Why this matters

Keeping the layers separate means a saved pose survives geometry changes, an
action can be re-timed without re-authoring poses, and the same rig can drive
the Change Look preview, gameplay, and the future Pose Editor.

## Sample Copilot Prompt

> "Add a `PoseTarget`/`GolferRigController` interface under
> `src/rendering/avatar/` defining `applyPose(pose)`, `setJoint(name, transform)`,
> and `getJoint(name)`. Do NOT force Golfer.ts to implement it yet — define the
> boundary first. Run typecheck/build/tests."
