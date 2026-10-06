# Sample Copilot Prompts

Reusable, copy/paste-ready prompts. Every prompt carries guardrails: inspect
before changing, don't touch unrelated geometry, report local/world transforms,
validate Front/Back/Side, run typecheck/build/tests, and never declare success
from math alone — visually inspect the result.

> **Note:** shoulder-abduction diagnostics are mechanical tests, not content.
> Say "Temporarily set shoulder abduction to 90° for mechanical validation" —
> NOT "Load the T-pose", "Play the jumping-jack pose", or "Create an arms-up
> pose". Diagnostic joint values are never saved to PoseLibrary.

---

## PROMPT 1 — Inspect a Joint

> "Inspect the `<joint>` on the procedural golfer. Report its parent, local
> position/rotation/scale, world position, and which meshes are attached. Do not
> change anything. Validate with Front/Back/Side views and run
> typecheck/build/tests."

## PROMPT 2 — Fix Joint Axis

> "Determine which `<joint>` local axis produces `<anatomical motion>`. Test
> X/Y/Z rotations empirically and report the resulting world-space deltas. Then
> map the motion to the correct axis/sign with a named helper. Do not change
> positions/widths/lengths. Validate Front/Back/Side and run
> typecheck/build/tests."

## PROMPT 3 — Create a Pose Stage

> "Create the `<action>/<stage>` pose using semantic joint controls (e.g.
> `leftShoulder.abduction`). Register it in the PoseLibrary. Do not change base
> geometry. Validate Front/Side/Back screenshots and run typecheck/build/tests."

## PROMPT 4 — Calibrate a Pose from Screenshots

> "Using `<reference-front.png>`, `<reference-side.png>`, and
> `<reference-back.png>`, adjust the `<action>/<stage>` pose's semantic joint
> values until all three views match. Change only pose data, not geometry.
> Report the final joint values and run typecheck/build/tests."

## PROMPT 5 — Add Pose to Pose Library

> "Register pose `<id>` in the PoseLibrary with these joint values: `<...>`.
> Add a unit test asserting it registers and retrieves correctly. Keep pose data
> semantic. Run typecheck/build/tests."

## PROMPT 6 — Create an Action from Saved Poses

> "Create the `<action>` GolferAction referencing saved pose IDs with normalized
> stage times (0..1). Register it in the ActionLibrary. Do not build the
> animation player. Run typecheck/build/tests."

## PROMPT 7 — Debug Mesh vs Joint Alignment

> "For `<segment>`, report whether the mesh origin is centered or joint-aligned.
> Show the mesh's local Y range relative to its parent joint. If the segment
> doesn't span joint→joint, offset the geometry so it does. Validate
> Front/Back/Side and run typecheck/build/tests."

## PROMPT 8 — Debug Disc Attachment

> "Inspect the held disc: its parent chain, local transform, and visibility.
> Confirm exactly one disc exists, parented to the throwing hand. Do not change
> disc flight physics. Report the scene-graph path. Run typecheck/build/tests."

## PROMPT 9 — Validate Anatomical Forward

> "Using the face as the authority, confirm the golfer's anatomical forward axis
> and that feet/chest/toes agree. Report any part whose front/back orientation
> disagrees. Do not change geometry. Run typecheck/build/tests."

## PROMPT 10 — Add a New Anatomical Control

> "Add a semantic `<joint>.<motion>` control (e.g. `leftElbow.flexion`) with a
> friendly 0..1 range, wired to the correct local axis with mirrored left/right
> signs. Do not change base geometry. Validate Front/Back/Side and run
> typecheck/build/tests."
