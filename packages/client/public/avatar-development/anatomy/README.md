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

## Sample Copilot Prompt

> "Validate the canonical golfer-local axes using the face as the forward
> authority. Report which axis is anatomical forward, left/right, and up/down.
> Do not change any geometry. Run the rig tests to confirm."
