# Authoring Modes

The `/master` workspace has two explicit authoring modes:

```ts
type AuthoringMode = 'default' | 'pose';
```

Authoring mode is **explicit application state** — never inferred from which
accordion or panel is open.

## DEFAULT CREATION

Builds the **canonical neutral avatar baseline** (currently: Male Baseline).

Changes made here belong to the baseline avatar configuration: neutral joint
baselines, body geometry/proportions, neutral orientation. These are **not**
PoseLibrary entries.

## POSE CREATION

Builds **semantic pose offsets** from a FINALIZED baseline. A pose session
starts from a finalized baseline and can never duplicate or mutate it.

## SAVE vs FINAL

| Action | Meaning                                      |
| ------ | -------------------------------------------- |
| SAVE   | Working checkpoint. Never implies approval.  |
| FINAL  | Approved canonical baseline or pose version. |

FINAL requires intentional confirmation and never destroys draft/saved data,
so baseline versioning remains possible.

## POSE REVISION

A checkpoint of **one** pose. Revisions are a history list on a pose draft
(1..10 max), not ten separate poses:

```ts
interface PoseRevision {
  revision: number;
  createdAt: string;
  pose: GolferPose;
}
```

## DOMAIN SEPARATION RULE

> **DEFAULT DATA, POSE DATA, AND ACTION DATA ARE SEPARATE DOMAIN OBJECTS.**

- **BASELINE** — what the neutral golfer _is_. Saved by Default Creation.
- **POSE** — semantic anatomical offsets relative to baseline. Saved by Pose
  Creation.
- **ACTION** — ordered sequence/timing of poses. Later.

## FACTORY RULE

> **FACTORIES CREATE AUTHORING SESSIONS. THEY DO NOT DIRECTLY CONTROL
> THREE.JS.**

```text
                    MASTER AVATAR
                         |
              +----------+----------+
              |                     |
       DEFAULT CREATION        POSE CREATION
              |                     |
     DefaultAvatarFactory        PoseFactory
              |                     |
       Baseline Draft            Pose Draft
              |                     |
            SAVE                 SAVE POSE
              |                     |
      Working Baseline          Revision 1..10
              |                     |
            FINAL                  FINAL
              |                     |
     Canonical Baseline            |
              +----------+----------+
                         |
                    PoseLibrary   (poses only, never baseline data)
                         |
                       later
                         |
                       Actions
```

## PERSISTENCE

Persistence is isolated behind repository interfaces
(`BaselineRepository`, later `PoseRepository`). The current implementation is
localStorage; no backend is involved. UI components never call localStorage
directly.

## RELOAD SEMANTICS

Only an explicit **SAVE** survives reload. Unsaved edits are discarded on
reload — the draft re-hydrates from the last saved checkpoint (or the neutral
defaults if nothing was ever saved).

## MODE SAFETY

| Control          | Default Creation | Pose Creation |
| ---------------- | ---------------- | ------------- |
| SAVE (baseline)  | enabled          | disabled      |
| FINAL (baseline) | enabled          | disabled      |
| SAVE POSE        | disabled         | enabled       |

This prevents accidentally overwriting the canonical baseline while authoring
a pose.

## Code

Runtime TypeScript lives in
`packages/client/src/rendering/avatar/authoring/`:

- `types.ts` — `AuthoringMode`, `MaleBaselineDraft`, `SavedBaseline`,
  `FinalizedBaseline`, `PoseRevision`, `AuthoringSession`
- `BaselineRepository.ts` — persistence interface + localStorage/in-memory
  implementations
- `sessions.ts` — `DefaultCreationSession`, `PoseCreationSession`
- `factories.ts` — `DefaultAvatarFactory`, `PoseFactory`
