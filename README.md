# Discblocks

A 3D physics playground built with TypeScript, Three.js, Rapier3D, and bitECS.

Discblocks starts from the RepoBlocks block destruction game and provides a foundation for experimenting with 3D gameplay, physics, and future disc golf mechanics.

## Current Gameplay

Click anywhere on the screen to shoot balls at a block tower. Try to knock down as many blocks as possible, then reset the level to try again.

Disc golf mechanics are planned additions.

## Features

- **3D graphics:** Three.js rendering with lighting and shadows.
- **Physics simulation:** Rapier3D rigid bodies and collisions.
- **Entity Component System:** bitECS manages game entities and their data.
- **Interactive gameplay:** Click to launch projectiles at block towers.
- **TypeScript:** Type-safe game development.
- **Monorepo structure:** Organized with pnpm workspaces.

## Tech Stack

| Tool       | Purpose                       |
| ---------- | ----------------------------- |
| TypeScript | Application and game logic    |
| Three.js   | 3D graphics                   |
| Rapier3D   | Physics simulation            |
| bitECS     | Entity Component System       |
| Vite       | Development server and builds |
| Vitest     | Unit and integration testing  |
| pnpm       | Dependencies and workspaces   |

## Getting Started

### Prerequisites

- Node.js 18 or later
- pnpm

Install pnpm if needed:

```bash
npm install -g pnpm
```

### Run Locally

From the repository root:

```bash
pnpm install
pnpm dev
```

Open the address shown by Vite, typically:

```text
http://localhost:5173
```

In GitHub Codespaces, open the forwarded port for the development server.

## How to Play

1. Click anywhere on the screen to shoot a ball toward the tower.
2. Use physics collisions to knock down blocks.
3. Click **Reset Level** to rebuild the tower.

## Project Structure

```text
Discblocks/
├── packages/
│   └── client/
│       ├── src/
│       │   ├── core/       # ECS setup and components
│       │   ├── physics/    # Rapier3D integration
│       │   ├── rendering/  # Three.js rendering
│       │   ├── input/      # Input handling
│       │   ├── game/       # Game logic
│       │   └── main.ts     # Entry point
│       └── ...
├── pnpm-workspace.yaml
└── package.json
```

## Architecture

Discblocks uses an Entity Component System:

- **Entities** identify game objects such as blocks, projectiles, and the ground.
- **Components** store data such as position, rotation, velocity, and physics body references.
- **Systems** process that data to handle physics, rendering, input, and gameplay.

### Key Components

- **Transform:** Position and rotation data.
- **Velocity:** Linear velocity data.
- **PhysicsBody:** Reference to a Rapier rigid body.
- **Bomb/Block:** Tags identifying game entities.

### Physics

The starting physics configuration includes:

- Gravity of −9.81 m/s².
- A fixed simulation timestep of 60 updates per second.
- Continuous collision detection.

### Rendering

The Three.js scene includes:

- A perspective camera.
- Directional and ambient lighting.
- Shadow mapping.
- An antialiased WebGL renderer.

## Development Commands

```bash
pnpm dev          # Start the development server
pnpm build        # Build for production
pnpm test         # Run tests
pnpm test:ui      # Open the test UI
pnpm lint         # Run lint checks
pnpm format       # Format code with Prettier
pnpm typecheck    # Check TypeScript types
```

Run tests in watch mode:

```bash
pnpm test -- --watch
```

## Adding Features

1. Define component data in `packages/client/src/core/components/`.
2. Add systems in the appropriate source directories.
3. Use or extend entity factories in `packages/client/src/physics/factories.ts`.
4. Connect new behavior to the game loop and input handling.

## Planned Disc Golf Experiments

- Disc-shaped projectiles.
- Throw power and release angle controls.
- Hyzer, flat, and anhyzer releases.
- Disc spin and aerodynamic flight behavior.
- Baskets, obstacles, and practice targets.
- Camera views for aiming and following throws.

These are development goals, not currently implemented features. Disc flight will require additional aerodynamic logic beyond rigid-body physics.

## Credits

Discblocks is based on [RepoBlocks](https://github.com/provencher/repoblocks) by provencher.

Built with:

- [Three.js](https://threejs.org/)
- [Rapier](https://rapier.rs/)
- [bitECS](https://github.com/NateTheGreatt/bitECS)
- [Vite](https://vite.dev/)
- [Vitest](https://vitest.dev/)

## License

This project retains the upstream GNU General Public License v3.0. See [LICENSE](LICENSE) for the license text.
