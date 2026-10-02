import { COURSE, FEET_PER_UNIT } from '@/game/course';
import type { Hole, PlayerState } from '@/game/hole';

const WIDTH = 420;
const HEIGHT = 86;
const PAD = 14;

export class HoleCard {
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private hole: Hole;

  constructor(container: HTMLElement, hole: Hole, onFlyover: () => void) {
    this.hole = hole;

    this.root = document.createElement('div');
    this.root.id = 'hole-card';

    const header = document.createElement('div');
    header.className = 'hole-card-header';

    const title = document.createElement('span');
    title.textContent = `${Math.round((COURSE.teeZ - COURSE.basketZ) * FEET_PER_UNIT)} ft · Par ${hole.par}`;

    const flyButton = document.createElement('button');
    flyButton.className = 'fli-over';
    flyButton.innerHTML = '<strong>FLI</strong> Over';
    flyButton.title = 'Fly the hole to scout the obstacles';
    flyButton.addEventListener('click', onFlyover);

    header.append(title, flyButton);

    this.canvas = document.createElement('canvas');
    this.canvas.width = WIDTH * 2;
    this.canvas.height = HEIGHT * 2;
    this.canvas.className = 'hole-map';

    this.root.append(header, this.canvas);
    container.appendChild(this.root);

    this.draw();
  }

  setHole(hole: Hole) {
    this.hole = hole;
    this.draw();
  }

  /** Tee on the left, basket on the right, so the hole fits a wide card. */
  private project(x: number, z: number): [number, number] {
    const zStart = COURSE.teeZ + 14;
    const zEnd = COURSE.basketZ - 14;
    const px = PAD + ((zStart - z) / (zStart - zEnd)) * (WIDTH - PAD * 2);
    const py = HEIGHT / 2 + (x / COURSE.arenaHalfWidth) * (HEIGHT / 2 - 4);
    return [px, py];
  }

  private draw() {
    const ctx = this.canvas.getContext('2d')!;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#c6a878';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Fairway corridor.
    const [fx1, fy1] = this.project(-COURSE.fairwayWidth / 2, COURSE.teeZ + 14);
    const [fx2, fy2] = this.project(COURSE.fairwayWidth / 2, COURSE.basketZ - 14);
    ctx.fillStyle = '#9fae6a';
    ctx.fillRect(fx1, fy1, fx2 - fx1, fy2 - fy1);

    // Arena boundary.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, WIDTH - 2, HEIGHT - 2);

    for (const cactus of COURSE.cacti) {
      const [cx, cy] = this.project(cactus.x, cactus.z);
      ctx.fillStyle = '#4f7a43';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const pillar of COURSE.pillars) {
      const [px, py] = this.project(pillar.x, pillar.z);
      if (pillar.cap) {
        ctx.fillStyle = 'rgba(238, 241, 245, 0.55)';
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#eef1f5';
      ctx.strokeStyle = '#1f3a5f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const [tx, ty] = this.project(0, COURSE.teeZ);
    ctx.fillStyle = '#3f9b42';
    ctx.strokeStyle = '#2b2b30';
    ctx.lineWidth = 1;
    ctx.fillRect(tx - 5, ty - 7, 10, 14);
    ctx.strokeRect(tx - 5, ty - 7, 10, 14);

    const [bx, by] = this.project(0, COURSE.basketZ);
    ctx.strokeStyle = '#ffd54a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.arc(bx, by, 2.4, 0, Math.PI * 2);
    ctx.fill();

    this.hole.states.forEach((state: PlayerState, i: number) => {
      if (!state.lie || state.holed) {
        return;
      }
      const [lx, ly] = this.project(state.lie.x, state.lie.z);
      ctx.fillStyle = i === this.hole.currentPlayerIndex ? '#ffd54a' : '#e8402f';
      ctx.strokeStyle = '#0b1726';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }
}
