# Local avatar model assets

This directory contains the runtime avatar files used by the game.

## Current active files

- `male_avatar.glb` — approved Khronos glTF sample asset: `CesiumMan.glb` from the official `KhronosGroup/glTF-Sample-Assets` repo. License: CC BY 4.0. Source provenance: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CesiumMan
- `female_avatar.glb` — approved Khronos glTF sample asset: `RiggedFigure.glb` from the same repo. License: CC BY 4.0. Source provenance: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/RiggedFigure
- `facecap.glb` — legacy face asset retained only for the older procedural/diagnostic pipeline; it is not the active gameplay avatar.

## Usage

The runtime uses the male/female full-body models for the active golfer selection. These files are loaded directly as GLTF assets via Three.js; no external avatar service or runtime dependency is required.

## Licensing and attribution

The active runtime models are redistributed locally under the original asset licenses and are not generated substitutes. They are open sample assets from the Khronos glTF sample set and are suitable for local development and redistribution within this project under the original CC BY 4.0 terms.

The previous generated placeholder script is no longer used for the active golfer assets.
