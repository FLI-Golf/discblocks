import * as THREE from 'three';
import { COURSE } from '@/game/course';
import {
  LOGO_URL,
  createScoreboardMesh,
  createFlagTexture,
  createTickerMesh,
} from './RenderSystem';

interface Flag {
  pivot: THREE.Group;
  flag: THREE.Mesh;
  phase: number;
}

export class Scene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  /** Heading the wind blows toward, in radians about Y. */
  public windHeading = -0.55;
  public windStrength = 1;

  private flags: Flag[] = [];
  private tickerTexture: THREE.Texture | null = null;
  private clock = new THREE.Clock();
  private lastTime = 0;

  private cameraGoal = new THREE.Vector3();
  private lookGoal = new THREE.Vector3();
  private lookNow = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x9fc6e8, 240, 820);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 900);
    this.frameShot({ x: 0, y: 0, z: COURSE.teeZ }, { x: 0, z: COURSE.basketZ });

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.setupLights();
    this.setupGround();

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    const sky = new THREE.HemisphereLight(0xbcd8f0, 0x5d7044, 0.55);
    this.scene.add(sky);

    // Shadowless fill from the sunless side, so the left stand's inner face
    // is not left in a flat dark band.
    const fill = new THREE.DirectionalLight(0xdce9f7, 0.35);
    fill.position.set(80, 45, 20);
    this.scene.add(fill);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    // Sun off the left shoulder: shadows fall to the right and down-range, keeping the
    // left of the fairway clear, and low enough that the tee pad and pillars throw real ones.
    directionalLight.position.set(-70, 80, 50);
    directionalLight.target.position.set(0, 0, -30);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -95;
    directionalLight.shadow.camera.right = 95;
    directionalLight.shadow.camera.top = 150;
    directionalLight.shadow.camera.bottom = -150;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 340;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.bias = -0.0004;

    this.scene.add(directionalLight);
    this.scene.add(directionalLight.target);
  }

  private setupGround() {
    const groundGeometry = new THREE.PlaneGeometry(COURSE.groundWidth, COURSE.groundLength);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x4f7f42,
      roughness: 0.95,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const fairwayLength = COURSE.teeZ - COURSE.basketZ + 40;
    const fairwayGeometry = new THREE.PlaneGeometry(COURSE.fairwayWidth, fairwayLength);
    const fairwayMaterial = new THREE.MeshStandardMaterial({
      color: 0x8fce6b,
      roughness: 0.9,
      metalness: 0,
    });
    const fairway = new THREE.Mesh(fairwayGeometry, fairwayMaterial);
    fairway.rotation.x = -Math.PI / 2;
    fairway.position.set(0, 0.02, (COURSE.teeZ + COURSE.basketZ) / 2 - 10);
    fairway.receiveShadow = true;
    this.scene.add(fairway);

    const teeGeometry = new THREE.PlaneGeometry(COURSE.teePadWidth + 6, COURSE.teePadDepth + 8);
    const teeMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b6258,
      roughness: 0.95,
      metalness: 0,
    });
    const tee = new THREE.Mesh(teeGeometry, teeMaterial);
    tee.rotation.x = -Math.PI / 2;
    tee.position.set(0, 0.03, COURSE.teeZ);
    tee.receiveShadow = true;
    this.scene.add(tee);

    this.setupTeePad();
    this.setupGrandstands();
    this.setupLogos();
  }

  private setupTeePad() {
    const { teePadWidth: w, teePadDepth: d, teePadHeight: h, teeZ } = COURSE;

    const timber = new THREE.MeshStandardMaterial({
      color: 0xb5894f,
      roughness: 0.85,
      metalness: 0.02,
    });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, h, d + 1.2), timber);
    frame.position.set(0, h / 2, teeZ);
    frame.castShadow = true;
    frame.receiveShadow = true;
    this.scene.add(frame);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.45, 0.18, d + 0.45),
      new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.6, metalness: 0.4 })
    );
    trim.position.set(0, h + 0.03, teeZ);
    trim.castShadow = true;
    trim.receiveShadow = true;
    this.scene.add(trim);

    const turf = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.15, d),
      new THREE.MeshStandardMaterial({ color: 0x3f9b42, roughness: 0.95, metalness: 0 })
    );
    turf.position.set(0, h + 0.09, teeZ);
    turf.castShadow = true;
    turf.receiveShadow = true;
    this.scene.add(turf);

    // Timber curb behind the pad, as in the reference photo.
    const curb = new THREE.Mesh(new THREE.BoxGeometry(w + 7.5, 0.82, 2.1), timber);
    curb.position.set(0, 0.42, teeZ + d / 2 + 3.3);
    curb.castShadow = true;
    curb.receiveShadow = true;
    this.scene.add(curb);

    const step = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.52, 1.65), timber);
    step.position.set(0, 0.26, teeZ + d / 2 + 1.65);
    step.castShadow = true;
    step.receiveShadow = true;
    this.scene.add(step);
  }

  private setupLogos() {
    const texture = new THREE.TextureLoader().load(LOGO_URL);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });

    const decalSize = 22;
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(decalSize, decalSize), material);
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(0, 0.06, (COURSE.teeZ + COURSE.basketZ) / 2);
    decal.renderOrder = 1;
    this.scene.add(decal);

    // Sits above the basket so it dresses the backstop without eating its contrast.
    const crestSize = 6;
    const crest = new THREE.Mesh(new THREE.PlaneGeometry(crestSize, crestSize), material);
    crest.position.set(0, COURSE.backstopHeight - crestSize / 2 - 0.4, COURSE.arenaBackZ + 0.4);
    crest.renderOrder = 1;
    this.scene.add(crest);
  }

  private setupGrandstands() {
    const tiers = 7;
    const tierDepth = 2.4;
    const tierRise = 1.6;
    const length = COURSE.arenaFrontZ - COURSE.arenaBackZ;
    const centerZ = (COURSE.arenaFrontZ + COURSE.arenaBackZ) / 2;
    const seatColors = [0x2d4d7a, 0xc2452d];
    const seats: THREE.Vector3[] = [];

    for (let i = 0; i < tiers; i++) {
      const height = COURSE.wallHeight + tierRise * (i + 1);
      const offset = COURSE.arenaHalfWidth + 1.5 + tierDepth * i;

      const geometry = new THREE.BoxGeometry(tierDepth, height, length);
      const material = new THREE.MeshStandardMaterial({
        color: seatColors[i % seatColors.length],
        roughness: 0.85,
        metalness: 0.05,
      });

      for (const side of [-1, 1]) {
        const tier = new THREE.Mesh(geometry, material);
        tier.position.set(side * offset, height / 2, centerZ);
        tier.castShadow = false;
        tier.receiveShadow = true;
        this.scene.add(tier);

        this.collectSeats(seats, {
          axis: 'z',
          across: side * offset,
          from: COURSE.arenaBackZ + 2,
          to: COURSE.arenaFrontZ - 2,
          y: height,
        });
      }
    }

    // Back stand starts above the backstop so the crowd never masks the basket.
    const backTiers = 5;
    const backWidth = COURSE.arenaHalfWidth * 2 + 12;

    for (let i = 0; i < backTiers; i++) {
      const height = COURSE.backstopHeight + tierRise * (i + 1);
      const offset = COURSE.arenaBackZ - 1.5 - tierDepth * i;

      const geometry = new THREE.BoxGeometry(backWidth, height, tierDepth);
      const material = new THREE.MeshStandardMaterial({
        color: seatColors[i % seatColors.length],
        roughness: 0.85,
        metalness: 0.05,
      });

      const tier = new THREE.Mesh(geometry, material);
      tier.position.set(0, height / 2, offset);
      tier.castShadow = false;
      tier.receiveShadow = true;
      this.scene.add(tier);

      this.collectSeats(seats, {
        axis: 'x',
        across: offset,
        from: -backWidth / 2 + 2,
        to: backWidth / 2 - 2,
        y: height,
      });
    }

    this.setupCrowd(seats);
    this.setupRoof(tiers, tierDepth, tierRise, backTiers, backWidth);
    this.setupScoreboard(backTiers, tierDepth, tierRise);
  }

  private setupRoof(
    tiers: number,
    tierDepth: number,
    tierRise: number,
    backTiers: number,
    backWidth: number
  ) {
    const length = COURSE.arenaFrontZ - COURSE.arenaBackZ;
    const centerZ = (COURSE.arenaFrontZ + COURSE.arenaBackZ) / 2;
    const standDepth = tierDepth * tiers + 3;
    const innerEdge = COURSE.arenaHalfWidth + 1;
    const roofY = COURSE.wallHeight + tierRise * tiers + 4.5;

    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0xdbe2ea,
      roughness: 0.6,
      metalness: 0.25,
      side: THREE.DoubleSide,
    });
    const strutMaterial = new THREE.MeshStandardMaterial({
      color: 0x8d97a3,
      roughness: 0.5,
      metalness: 0.6,
    });

    for (const side of [-1, 1]) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(standDepth, 0.5, length), roofMaterial);
      roof.position.set(side * (innerEdge + standDepth / 2), roofY, centerZ);
      roof.rotation.z = side * -0.1;
      roof.receiveShadow = true;
      this.scene.add(roof);

      const fascia = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, length), roofMaterial);
      fascia.position.set(side * innerEdge, roofY - 0.9, centerZ);
      this.scene.add(fascia);

      for (let i = 0; i <= 10; i++) {
        const z = COURSE.arenaBackZ + (length * i) / 10;
        const strut = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.22, roofY, 8),
          strutMaterial
        );
        strut.position.set(side * (innerEdge + standDepth - 1), roofY / 2, z);
        this.scene.add(strut);
      }

      this.addFlags(side * (innerEdge + 2), roofY + 0.3, COURSE.arenaBackZ, length);
    }

    const backDepth = tierDepth * backTiers + 3;
    const backRoofY = COURSE.backstopHeight + tierRise * backTiers + 4.5;
    const backRoof = new THREE.Mesh(
      new THREE.BoxGeometry(backWidth + 4, 0.5, backDepth),
      roofMaterial
    );
    backRoof.position.set(0, backRoofY, COURSE.arenaBackZ - backDepth / 2);
    this.scene.add(backRoof);
  }

  private addFlags(x: number, y: number, startZ: number, length: number) {
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0xb9c2cc,
      roughness: 0.4,
      metalness: 0.7,
    });

    for (let i = 1; i < 6; i++) {
      const z = startZ + (length * i) / 6;

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6, 8), poleMaterial);
      pole.position.set(x, y + 3, z);
      this.scene.add(pole);

      // Pivot at the pole so the banner swings to point downwind.
      const pivot = new THREE.Group();
      pivot.position.set(x, y + 5.2, z);
      this.scene.add(pivot);

      const geometry = new THREE.PlaneGeometry(2.6, 1.4, 12, 1);
      const flag = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          map: createFlagTexture(i % 2 === 0 ? '#f2f4f8' : '#12305c'),
          roughness: 0.85,
          side: THREE.DoubleSide,
        })
      );
      flag.position.set(1.3, -0.1, 0);
      pivot.add(flag);

      this.flags.push({ pivot, flag, phase: i * 0.7 });
    }
  }

  private setupScoreboard(backTiers: number, tierDepth: number, tierRise: number) {
    const width = 78;
    const height = 39;
    const tickerHeight = 6.5;
    const backDepth = tierDepth * backTiers + 3;
    const y = COURSE.backstopHeight + tierRise * backTiers + height / 2 + 10;
    const z = COURSE.arenaBackZ - backDepth - 3;

    const board = createScoreboardMesh(width, height);
    board.position.set(0, y, z);
    this.scene.add(board);

    const ticker = createTickerMesh(width, tickerHeight);
    ticker.position.set(0, y + height / 2 + tickerHeight / 2 + 0.4, z);
    this.scene.add(ticker);
    this.tickerTexture = ticker.userData.scrollTexture as THREE.Texture;

    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x6f7681,
      roughness: 0.5,
      metalness: 0.6,
    });

    const legHeight = y - height / 2;

    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(2.2, legHeight, 2.2), legMaterial);
      leg.position.set(side * (width / 2 - 5), legHeight / 2, z);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.scene.add(leg);
    }
  }

  private collectSeats(
    seats: THREE.Vector3[],
    row: { axis: 'x' | 'z'; across: number; from: number; to: number; y: number }
  ) {
    const spacing = 1.3;

    for (let p = row.from; p <= row.to; p += spacing) {
      // Leave gaps so the stands do not look uniformly packed.
      if (Math.random() < 0.12) {
        continue;
      }

      const jitter = (Math.random() - 0.5) * 0.35;
      seats.push(
        row.axis === 'z'
          ? new THREE.Vector3(row.across + jitter, row.y, p)
          : new THREE.Vector3(p, row.y, row.across + jitter)
      );
    }
  }

  private setupCrowd(seats: THREE.Vector3[]) {
    const shirtPalette = [0xe8e8ea, 0x2f6fb5, 0xd94f3d, 0xf2c14e, 0x3fa46a, 0x7a4fb5];
    const skinPalette = [0xf0c8a0, 0xd9a877, 0xa97049, 0x7a4f31, 0x5a3823];

    const bodyGeometry = new THREE.CapsuleGeometry(0.26, 0.45, 3, 6);
    const headGeometry = new THREE.SphereGeometry(0.18, 6, 5);
    const bodyMaterial = new THREE.MeshLambertMaterial();
    const headMaterial = new THREE.MeshLambertMaterial();

    const bodies = new THREE.InstancedMesh(bodyGeometry, bodyMaterial, seats.length);
    const heads = new THREE.InstancedMesh(headGeometry, headMaterial, seats.length);

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();

    for (let i = 0; i < seats.length; i++) {
      const seat = seats[i];
      const size = (0.85 + Math.random() * 0.3) * 1.5;

      scale.set(size, size, size);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);

      position.set(seat.x, seat.y + 0.45 * size, seat.z);
      matrix.compose(position, quaternion, scale);
      bodies.setMatrixAt(i, matrix);
      bodies.setColorAt(i, color.setHex(shirtPalette[i % shirtPalette.length]));

      position.set(seat.x, seat.y + 1.05 * size, seat.z);
      matrix.compose(position, quaternion, scale);
      heads.setMatrixAt(i, matrix);
      heads.setColorAt(i, color.setHex(skinPalette[i % skinPalette.length]));
    }

    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;

    this.scene.add(bodies);
    this.scene.add(heads);
  }

  private handleResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    const time = this.clock.getElapsedTime();
    const dt = Math.min(time - this.lastTime, 0.1);
    this.lastTime = time;

    this.updateCamera(dt);
    this.updateFlags(time);

    if (this.tickerTexture) {
      this.tickerTexture.offset.x = (time * 0.06) % 1;
    }

    this.renderer.render(this.scene, this.camera);
  }

  /** Places the camera behind the thrower, looking down their line to the pin. */
  frameShot(from: { x: number; y: number; z: number }, pin: { x: number; z: number }) {
    const dx = from.x - pin.x;
    const dz = from.z - pin.z;
    const distance = Math.hypot(dx, dz) || 1;
    const ux = dx / distance;
    const uz = dz / distance;

    // Short shots pull the camera in tight; long drives sit further back.
    const back = THREE.MathUtils.clamp(distance * 0.42, 13, 34);
    const height = THREE.MathUtils.clamp(distance * 0.16, 5.5, 13);

    // Keep the camera inside the arena; outside it the walls and stands block everything.
    const limitX = COURSE.arenaHalfWidth - 3;
    const x = THREE.MathUtils.clamp(from.x + ux * back, -limitX, limitX);
    const z = THREE.MathUtils.clamp(
      from.z + uz * back,
      COURSE.arenaBackZ + 8,
      COURSE.arenaFrontZ - 4
    );

    // If clamping pulled the camera in close, lift it so the shot still reads.
    const planar = Math.hypot(x - from.x, z - from.z);
    const lift = planar < back ? (back - planar) * 0.6 : 0;

    this.cameraGoal.set(x, height + lift, z);
    this.lookGoal.set(from.x * 0.2 + pin.x * 0.8, 4, from.z * 0.2 + pin.z * 0.8);
  }

  private updateCamera(dt: number) {
    if (this.lookNow.lengthSq() === 0) {
      this.camera.position.copy(this.cameraGoal);
      this.lookNow.copy(this.lookGoal);
    } else {
      // Frame-rate independent smoothing.
      const k = 1 - Math.exp(-2.6 * dt);
      this.camera.position.lerp(this.cameraGoal, k);
      this.lookNow.lerp(this.lookGoal, k);
    }

    this.camera.lookAt(this.lookNow);
  }

  private updateFlags(time: number) {
    for (const { pivot, flag, phase } of this.flags) {
      pivot.rotation.y = this.windHeading + Math.sin(time * 0.7 + phase) * 0.12;

      const position = flag.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const along = (position.getX(i) + 1.3) / 2.6;
        position.setZ(i, Math.sin(time * 6 + phase + along * 5) * 0.28 * along * this.windStrength);
      }
      position.needsUpdate = true;
    }
  }
}
