# Rig

## Terminology

**Shoulder abduction** raises the arm laterally away from the side of the body.
Increasing abduction should move the arm outward and upward in the golfer's
anatomical shoulder plane. It must not rotate the arm behind the torso.

### Control vs test value vs pose vs action

- **ANATOMICAL CONTROL** — `shoulder.abduction`: a semantic joint control.
- **TEST VALUE** — `shoulder.abduction = <some temporary angle>`: a mechanical
  diagnostic value applied ad hoc, never saved.
- **POSE** — a meaningful saved golfer body configuration (in PoseLibrary).
- **ACTION** — an ordered sequence of meaningful poses/stages.

A temporary joint test is NOT automatically a pose.

## Anatomical joint concepts

Conceptual controls (do NOT implement all of them at once):

- **Shoulder** — abduction/adduction, flexion/extension, internal/external rotation
- **Elbow** — flexion/extension
- **Forearm** — pronation/supination (later)
- **Wrist** — flexion/extension, deviation, rotation
- **Hip** — flexion/extension, abduction/adduction, rotation
- **Knee** — flexion/extension
- **Ankle** — foot orientation / flexion
- **Torso** — rotation, lean, bend
- **Head** — yaw, pitch, roll

## JOINT vs MESH rule

> **JOINT** = rotation / articulation point.
> **MESH** = visible geometry between joints.

```
ShoulderJoint
    ↓
UpperArmMesh
    ↓
ElbowJoint
    ↓
ForearmMesh
    ↓
WristJoint
    ↓
HandMesh
```

A cylinder/capsule **center** is NOT automatically the anatomical joint. Our arm
debugging exposed exactly this problem — the mesh was centered on its origin
while the joint sat elsewhere. Always attach geometry so its segment runs from
one joint to the next.

## CURRENT CALIBRATION

The procedural shoulder rig is being calibrated so shoulder **abduction** moves:

```
DOWN → OUTWARD → OVERHEAD   (lateral raise in the shoulder plane)
```

It must **NOT** move:

```
DOWN → BEHIND BACK
```

This is the first anatomical articulation we will use to validate the new rig
architecture.

## Sample Copilot Prompt

> "Inspect the left shoulder joint and determine which local axis produces
> anatomical abduction. Test X/Y/Z rotations and report the elbow's world-space
> delta for each. Do not change positions/widths/lengths. Validate with
> Front/Back/Side views and run typecheck/build/tests."
