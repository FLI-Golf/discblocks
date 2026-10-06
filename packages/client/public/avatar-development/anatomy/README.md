# Anatomy

## TARGET anatomical hierarchy

This is the target model. Do NOT force the existing implementation to match it
yet — this documents the direction.

```
GolferRoot

Pelvis
├── Torso
│   ├── Neck
│   │   └── Head
│   │
│   ├── LeftShoulder
│   │   └── LeftUpperArm
│   │       └── LeftElbow
│   │           └── LeftForearm
│   │               └── LeftWrist
│   │                   └── LeftHand
│   │
│   └── RightShoulder
│       └── RightUpperArm
│           └── RightElbow
│               └── RightForearm
│                   └── RightWrist
│                       └── RightHand
│
├── LeftHip
│   └── LeftThigh
│       └── LeftKnee
│           └── LeftShin
│               └── LeftAnkle
│                   └── LeftFoot
│
└── RightHip
    └── RightThigh
        └── RightKnee
            └── RightShin
                └── RightAnkle
                    └── RightFoot
```

## SEMANTIC anatomy model

This is the semantic anatomical hierarchy used by pose data. The exact Three.js
hierarchy may differ — do NOT restructure the rig merely to match this diagram.

```
Head
    ↓
Torso
    ↓
Pelvis / Hips
   ↙       ↘
Left Hip   Right Hip
   ↓          ↓
Left Knee  Right Knee
   ↓          ↓
Left Foot  Right Foot
```

Upper body:

```
Torso
   ↙              ↘
Left Shoulder    Right Shoulder
   ↓                 ↓
Left Elbow       Right Elbow
   ↓                 ↓
Left Wrist       Right Wrist
   ↓                 ↓
Left Hand        Right Hand
```

The full disc-golf kinetic chain the rig must represent:

```
feet → legs → hips/pelvis → torso → shoulder → elbow → wrist → hand → disc
```

## CANONICAL LOCAL COORDINATE SYSTEM

Inspected from the current golfer/face (face is the authority for forward):

| Axis   | Meaning                                                |
| ------ | ------------------------------------------------------ |
| **+Y** | UP                                                     |
| **−Y** | DOWN                                                   |
| **+X** | golfer's anatomical **RIGHT**                          |
| **−X** | golfer's anatomical **LEFT**                           |
| **+Z** | **ANATOMICAL FORWARD** (face/nose/chest/toes point +Z) |
| **−Z** | backward (behind the back)                             |

> **Critical rule:** GAMEPLAY may rotate `GolferRoot` to face the basket.
> Individual anatomy must NOT reverse itself because the gameplay camera
> normally views the golfer from behind. Anatomical forward is a golfer-local
> property, always +Z, regardless of world rotation.

## Anatomical left/right are camera-independent

> **CAMERA ORIENTATION NEVER CHANGES ANATOMICAL LEFT/RIGHT.**
> **POSE DATA IS STORED FROM THE GOLFER'S PERSPECTIVE.**

`left` = golfer's anatomical left. `right` = golfer's anatomical right. This is
permanent and applies to shoulders, elbows, wrists, hands, hips, knees, ankles,
and feet.

When viewing the golfer from the **front**, the golfer's anatomical LEFT appears
on the viewer's RIGHT, and the golfer's anatomical RIGHT appears on the viewer's
LEFT. This is expected — the camera is only an observer and must never affect
semantic joint identity. Do NOT swap labels or pose data to compensate.

Validated by the rig test: `leftShoulder.abduction` moves the golfer's
anatomical-left arm (hand x `0.09 → -1.48`, toward golfer's left = −X world).

## Sample Copilot Prompt

> "Validate the canonical golfer-local axes using the face as the forward
> authority. Report which axis is anatomical forward, left/right, and up/down.
> Do not change any geometry. Run the rig tests to confirm."
