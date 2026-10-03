# Avatar Development Playbook

This directory is the development playbook for the procedural FLI disc-golf golfer.

## PURPOSE

We are building **one reusable procedural golfer rig** that supports:

- avatar appearance (face, body, colors)
- body proportions
- anatomical articulation
- static poses
- disc-golf actions
- interpolated animation
- scene staging
- gameplay animation

This folder contains **documentation, conventions, architecture notes, and
sample Copilot prompts** — not runtime code. Actual TypeScript lives under
`packages/client/src/rendering/avatar/`.

## LAYER SEPARATION

| Layer      | Meaning                                                           |
| ---------- | ----------------------------------------------------------------- |
| **AVATAR** | What the golfer _looks like_ (appearance, materials, proportions) |
| **RIG**    | How the golfer is _mechanically connected_ (joints + meshes)      |
| **POSE**   | Joint state at _one instant_                                      |
| **ACTION** | Ordered sequence of poses/stages over time                        |
| **SCENE**  | avatar + pose/action + environment + camera                       |

> **DO NOT bake gameplay poses into base geometry.**
> The base rig should represent a mechanically correct golfer.

## Target usage

```ts
golfer.setPose('backhand/reach-back');
golfer.setPose('backhand/power-pocket');
golfer.playAction('backhand');
```

Conceptually, an action like **BACKHAND** is an ordered sequence:

Neutral → Ready → X-Step → Plant → Reach Back → Power Pocket → Release →
Follow Through → Finish

Each stage is saveable/editable. We can freeze at any stage for a scene, and
interpolate between stages to animate.

## Folders

- [architecture/](architecture/README.md) — layer pipeline + rules
- [anatomy/](anatomy/README.md) — target anatomical hierarchy + canonical axes
- [rig/](rig/README.md) — joint concepts, joint-vs-mesh rule, current calibration
- [poses/](poses/README.md) — pose data model + library concept
- [actions/](actions/README.md) — action/timeline model
- [backhand/](backhand/README.md) · [forehand/](forehand/README.md) ·
  [putting/](putting/README.md) · [overhand/](overhand/README.md) ·
  [roller/](roller/README.md) — per-throw stage docs
- [locomotion/](locomotion/README.md) — reusable movement actions
- [reactions/](reactions/README.md) — celebration/reaction actions
- [pose-editor/](pose-editor/README.md) — the authoring tool we want
- [diagnostics/](diagnostics/README.md) — markers, axes helpers, validation rules
- [references/](references/README.md) — screenshots/reference images conventions
- [prompts/](prompts/README.md) — copy/paste Copilot prompts

## Milestones

1. **Milestone 1 — Shoulder Abduction Diagnostic** — validate the shoulder
   abduction axis with temporary test values (0°/45°/90°/135°/180°). These are
   mechanical test values, NOT saved poses.
2. **Milestone 2 — Neutral Pose** (first reusable saved pose)
3. **Milestone 3 — Backhand Reach Back** (first disc-golf pose via Pose Editor)

> **Rule:** DIAGNOSTIC JOINT VALUES ARE NOT POSES. A pose becomes part of
> PoseLibrary only when we intentionally save a meaningful golfer position for
> reuse. Temporary shoulder-abduction test angles are never registered as poses.

## Sample Copilot Prompt

> "Inspect the current Golfer rig and scaffold a `PoseLibrary` under
> `packages/client/src/rendering/avatar/`. Do not change Golfer.ts behavior.
> Keep pose data semantic (leftShoulder.abduction), not mesh-specific. Run
> typecheck, build, and tests before finishing."
