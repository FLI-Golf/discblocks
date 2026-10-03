# Locomotion

Future reusable movement actions, independent from throwing where practical.

## Actions

- idle
- walk
- run
- x-step
- shuffle
- plant
- turn
- pick-up-disc

## Rule

Locomotion should be reusable across throws and scenes — a walk cycle or x-step
should not be tied to a specific throw action.

## Sample Copilot Prompt

> "Scaffold a reusable `idle` locomotion action (subtle breathing/weight shift)
> as a PoseLibrary pose + ActionLibrary action. Keep it independent of throwing
> actions. Run typecheck/build/tests."
