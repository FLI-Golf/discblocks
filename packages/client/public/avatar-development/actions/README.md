# Actions

## Definition

An **ACTION** is an ordered timeline of pose stages.

## Conceptual types

```ts
interface GolferAction {
  id: string;
  stages: ActionStage[];
}

interface ActionStage {
  pose: string; // PoseId
  time: number; // normalized 0..1 along the action
}
```

## Example — backhand

```
0.00 ready
0.15 x-step-1
0.30 x-step-2
0.45 plant
0.55 reach-back
0.67 power-pocket
0.74 release
0.86 follow-through
1.00 finish
```

> These times are examples only, not final biomechanics.

## Sample Copilot Prompt

> "Create an ActionLibrary scaffold under `src/rendering/avatar/` with
> register/get/has/list. Define a `backhand` action referencing saved pose IDs
> with normalized stage times. Do NOT build the animation player yet. Run
> typecheck/build/tests."
