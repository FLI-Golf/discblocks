# Pose Editor

The development tool we eventually want for authoring poses.

## Conceptual UI

```
POSE EDITOR

Action
[ Backhand ]

Stage
[ Reach Back ]

VIEW
Front
Left
Right
Back

TORSO
Rotation
Lean
Twist

LEFT SHOULDER
Abduction
Flexion
Rotation

LEFT ELBOW
Flexion

LEFT WRIST
...

RIGHT SHOULDER
...

HIPS
...

LEGS
...

[ Reset Pose ]
[ Save Pose ]
[ Duplicate Pose ]
[ Previous Stage ]
[ Next Stage ]
[ Preview Action ]
```

## Important distinction

The **Pose Editor** is NOT the same thing as **Change Look**.

- **Change Look** → appearance (face, body proportions, colors)
- **Pose Editor** → body articulation / animation authoring

They may share the same Three.js preview infrastructure later.

## Save Pose workflow

1. Select golfer.
2. Select action.
3. Select stage.
4. Manipulate anatomical controls.
5. Inspect Front.
6. Inspect Side.
7. Inspect Back.
8. Save Pose.
9. Move to next stage.
10. Save Pose.
11. Preview interpolation between stages.

This is exactly how we want to build actions incrementally.

## Sample Copilot Prompt

> "Add a development-only slider for left shoulder abduction in the Pose Editor
> preview without modifying appearance state. Use the semantic joint control,
> not a mesh name. Run typecheck/build/tests."
