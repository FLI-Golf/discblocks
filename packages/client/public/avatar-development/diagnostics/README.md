# Diagnostics

Development helpers for rig/pose work.

## Helpers

- joint markers
- AxesHelper (per-joint local axes)
- anatomical-forward arrow
- joint labels
- skeleton hierarchy print
- local/world transform display
- pose name / action stage readout
- disc attachment point
- foot direction
- hand attachment point

## FRONT + BACK + SIDE VALIDATION

> A rig change must NOT be approved from only one camera view.
> Always validate Front, Back, AND Side.

## Testing rig controls directly

Rig controls may be tested directly with **temporary semantic values** — no
saved pose required. Example:

**Shoulder Abduction Test** — apply `shoulder.abduction` ad hoc:

- Left: 0°, 45°, 90°
- Right: 0°, 45°, 90°

Validate from Front, Back, Left, Right:

- arm moves laterally away from torso
- left/right behavior is mirrored anatomically
- arm remains near the shoulder plane
- arm does not travel behind the torso

These values are **not** saved to PoseLibrary.

## Sample Copilot Prompt

> "Temporarily set shoulder abduction to 90° for mechanical validation. Report
> the elbow/wrist world positions and validate Front/Back/Side. Do not save this
> as a pose and do not change geometry. Run typecheck/build/tests."
