import * as THREE from 'three';
import { COURSE } from '@/game/course';
import {
  LOGO_URL,
  createScoreboardMesh,
  createFlagTexture,
  createBannerPlaneMesh,
} from './RenderSystem';

interface Aircraft {
  group: THREE.Group;
  /** Half the width of the run, in world units. */
  span: number;
  altitude: number;
  z: number;
  speed: number;
  dir: number;
  x: number;
  active: boolean;
  nextAt: number;
  interval: number;
}

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
  public windSpeedMph = 9;

  private windBaseHeading = -0.55;
  private windBaseSpeed = 9;
  private clouds: THREE.Group[] = [];
  private aircraft: Aircraft[] = [];

  private flags: Flag[] = [];
  private clock = new THREE.Clock();
  private lastTime = 0;

  private cameraGoal = new THREE.Vector3();
  private lookGoal = new THREE.Vector3();
  private lookNow = new THREE.Vector3();
  private flyover: { t: number; duration: number } | null = null;
  private beacon: THREE.Group | null = null;
  private beaconLamp: THREE.Mesh | null = null;
  private beaconHalo: THREE.Mesh | null = null;
  private beaconBeam: THREE.Mesh | null = null;
  private beaconVane: THREE.Group | null = null;
  private beaconWanted = false;
  private chase: {
    position: THREE.Vector3;
    heading: THREE.Vector3;
    holdT: number;
    settled: boolean;
  } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fc4e0);
    this.scene.fog = new THREE.Fog(0xd9c6a4, 430, 1700);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2400);
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
    directionalLight.shadow.camera.left = -110;
    directionalLight.shadow.camera.right = 110;
    directionalLight.shadow.camera.top = 300;
    directionalLight.shadow.camera.bottom = -300;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 620;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.bias = -0.0004;

    this.scene.add(directionalLight);
    this.scene.add(directionalLight.target);
  }

  private setupGround() {
    // Desert plain running out to the mountains, so the horizon is not empty sky.
    const plain = new THREE.Mesh(
      new THREE.PlaneGeometry(3200, 3200),
      new THREE.MeshStandardMaterial({ color: 0xbb9a6c, roughness: 1, metalness: 0 })
    );
    plain.rotation.x = -Math.PI / 2;
    plain.position.y = -0.08;
    this.scene.add(plain);

    const groundGeometry = new THREE.PlaneGeometry(COURSE.groundWidth, COURSE.groundLength);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xc6a878,
      roughness: 0.98,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const fairwayLength = COURSE.teeZ - COURSE.basketZ + 40;
    const fairwayGeometry = new THREE.PlaneGeometry(COURSE.fairwayWidth, fairwayLength);
    const fairwayMaterial = new THREE.MeshStandardMaterial({
      color: 0x9fae6a,
      roughness: 0.92,
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
    this.setupVipSeating();
    this.setupGrandstands();
    this.setupLogos();
    this.setupMountains();
    this.setupBeacon();
    this.setupClouds();
    this.setupAircraft();
  }

  private setupAircraft() {
    // Altitudes are picked to sit inside the camera's vertical view cone from the
    // tee; much higher and they fly past unseen above the top of the frame.
    const fleet = [
      {
        build: () => createBannerPlaneMesh(0, 0xf2b705),
        altitude: 48,
        z: -60,
        speed: 16,
        scale: 1.7,
        nextAt: 25,
        interval: 85,
      },
      {
        build: () => createBannerPlaneMesh(2, 0xd8232a),
        altitude: 72,
        z: -150,
        speed: 13,
        scale: 2.2,
        nextAt: 95,
        interval: 120,
      },
    ];

    for (const entry of fleet) {
      const group = entry.build();
      group.scale.setScalar(entry.scale);
      group.visible = false;
      this.scene.add(group);

      this.aircraft.push({
        group,
        span: 420,
        altitude: entry.altitude,
        z: entry.z,
        speed: entry.speed,
        dir: 1,
        x: 0,
        active: false,
        nextAt: entry.nextAt,
        interval: entry.interval,
      });
    }
  }

  private updateAircraft(time: number, dt: number) {
    for (const craft of this.aircraft) {
      if (!craft.active) {
        if (time < craft.nextAt) {
          continue;
        }
        craft.active = true;
        craft.dir = Math.random() < 0.5 ? 1 : -1;
        craft.x = -craft.dir * craft.span;
        craft.group.visible = true;
        // Local +X is the nose, so flip the whole craft when flying the other way.
        craft.group.rotation.y = craft.dir > 0 ? 0 : Math.PI;
      }

      craft.x += craft.dir * craft.speed * dt;
      craft.group.position.set(
        craft.x,
        craft.altitude + Math.sin(time * 0.6 + craft.z) * 1.2,
        craft.z
      );

      if (Math.abs(craft.x) > craft.span) {
        craft.active = false;
        craft.group.visible = false;
        craft.nextAt = time + craft.interval;
      }
    }
  }

  private setupClouds() {
    const material = new THREE.MeshLambertMaterial({
      color: 0xf1f5fb,
      transparent: true,
      opacity: 0.82,
      fog: false,
    });

    for (let i = 0; i < 16; i++) {
      const cloud = new THREE.Group();
      const puffs = 4 + Math.floor(Math.random() * 4);

      for (let p = 0; p < puffs; p++) {
        const radius = 26 + Math.random() * 30;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), material);
        puff.position.set(
          (p - puffs / 2) * 34 + (Math.random() - 0.5) * 18,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 30
        );
        puff.scale.y = 0.55;
        cloud.add(puff);
      }

      cloud.position.set(
        (Math.random() - 0.5) * 1900,
        170 + Math.random() * 90,
        (Math.random() - 0.5) * 1900
      );
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  private updateClouds(dt: number) {
    const driftX = Math.sin(this.windHeading) * this.windSpeedMph * 0.4;
    const driftZ = Math.cos(this.windHeading) * this.windSpeedMph * 0.4;
    const bound = 1100;

    for (const cloud of this.clouds) {
      cloud.position.x += driftX * dt;
      cloud.position.z += driftZ * dt;

      // Wrap to the far side so the sky never empties out.
      if (cloud.position.x > bound) cloud.position.x = -bound;
      if (cloud.position.x < -bound) cloud.position.x = bound;
      if (cloud.position.z > bound) cloud.position.z = -bound;
      if (cloud.position.z < -bound) cloud.position.z = bound;
    }
  }

  private updateWind(time: number) {
    // Slow shifts so the flags and readout are never completely static.
    this.windHeading = this.windBaseHeading + Math.sin(time * 0.06) * 0.3;
    this.windSpeedMph = this.windBaseSpeed + Math.sin(time * 0.11) * 2.5;
    this.windStrength = this.windSpeedMph / 9;
  }

  /** Pulsing marker above the basket, shown when the thrower is a long way out. */
  private setupBeacon() {
    const group = new THREE.Group();
    group.position.set(0, 11, COURSE.basketZ);

    this.beaconLamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffd54a })
    );
    group.add(this.beaconLamp);

    this.beaconHalo = new THREE.Mesh(
      new THREE.SphereGeometry(2, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffd54a,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      })
    );
    group.add(this.beaconHalo);

    this.beaconBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.5, 6.2, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffd54a,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    this.beaconBeam.position.y = -3.3;
    group.add(this.beaconBeam);

    this.beaconVane = this.buildWindVane();
    this.beaconVane.position.y = 2.6;
    group.add(this.beaconVane);

    group.visible = false;
    this.scene.add(group);
    this.beacon = group;
  }

  /** Horizontal arrow pointing the way the wind blows. Points along local +Z. */
  private buildWindVane(): THREE.Group {
    const vane = new THREE.Group();
    const head = new THREE.MeshBasicMaterial({ color: 0xe8705f, fog: false });
    const tail = new THREE.MeshBasicMaterial({ color: 0xf2f4f8, fog: false });

    const tip = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 4), head);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 2.4;
    vane.add(tip);

    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 3.4), tail);
    shaft.position.z = 0.2;
    vane.add(shaft);

    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 1.5), tail);
      fin.position.set(side * 0.5, 0, -1.7);
      fin.rotation.y = side * 0.5;
      vane.add(fin);
    }

    return vane;
  }

  setBeaconVisible(visible: boolean) {
    this.beaconWanted = visible;
  }

  private updateBeacon(time: number) {
    if (!this.beacon || !this.beaconLamp || !this.beaconHalo || !this.beaconBeam) {
      return;
    }

    // Always lit during the hole tour, so the wind vane can be read on the way past.
    this.beacon.visible = this.beaconWanted || this.flyover !== null;
    if (!this.beacon.visible) {
      return;
    }

    const pulse = 0.5 + 0.5 * Math.sin(time * 4.2);

    this.beaconLamp.scale.setScalar(0.85 + pulse * 0.35);
    (this.beaconHalo.material as THREE.MeshBasicMaterial).opacity = 0.1 + pulse * 0.3;
    this.beaconHalo.scale.setScalar(0.9 + pulse * 0.3);
    (this.beaconBeam.material as THREE.MeshBasicMaterial).opacity = 0.1 + pulse * 0.22;

    if (this.beaconVane) {
      // The vane points along local +Z, which a Y rotation of h maps straight
      // onto the wind vector (sin h, cos h).
      this.beaconVane.rotation.y = this.windHeading;
      this.beaconVane.position.y = 2.6 + Math.sin(time * 1.6) * 0.18;
    }
  }

  /** Shaded decks either side of the tee, close enough to see the drive. */
  private setupVipSeating() {
    const deckWidth = 11;
    const deckDepth = 16;
    const deckHeight = 1.3;
    const offset = COURSE.teePadWidth / 2 + deckWidth / 2 + 3;

    const timber = new THREE.MeshStandardMaterial({ color: 0xa8784a, roughness: 0.9 });
    const rail = new THREE.MeshStandardMaterial({
      color: 0x45505c,
      roughness: 0.5,
      metalness: 0.6,
    });
    const canopy = new THREE.MeshStandardMaterial({
      color: 0xf0ead8,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    const seat = new THREE.MeshStandardMaterial({ color: 0x1f3a5f, roughness: 0.8 });
    const table = new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.7 });

    const shirts = [0xe8e8ea, 0xd94f3d, 0xf2c14e, 0x2f6fb5, 0x3fa46a];

    for (const side of [-1, 1]) {
      const x = side * offset;

      const deck = new THREE.Mesh(new THREE.BoxGeometry(deckWidth, deckHeight, deckDepth), timber);
      deck.position.set(x, deckHeight / 2, COURSE.teeZ);
      deck.castShadow = true;
      deck.receiveShadow = true;
      this.scene.add(deck);

      const front = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, deckDepth), rail);
      front.position.set(x - side * (deckWidth / 2), deckHeight + 0.55, COURSE.teeZ);
      this.scene.add(front);

      for (const end of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.6, 8), rail);
        post.position.set(x, deckHeight + 2.3, COURSE.teeZ + (end * deckDepth) / 2.4);
        this.scene.add(post);
      }

      const shade = new THREE.Mesh(
        new THREE.BoxGeometry(deckWidth + 1.4, 0.22, deckDepth + 1.4),
        canopy
      );
      shade.position.set(x, deckHeight + 4.7, COURSE.teeZ);
      this.scene.add(shade);

      // Two rows of seats facing the tee, with a drinks table between them.
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 3; i++) {
          const sx = x + side * (row === 0 ? -2.4 : 1.6);
          const sz = COURSE.teeZ + (i - 1) * 4.2;

          const chair = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.1), seat);
          chair.position.set(sx, deckHeight + 0.45, sz);
          chair.castShadow = true;
          this.scene.add(chair);

          const body = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.34, 0.7, 3, 8),
            new THREE.MeshLambertMaterial({ color: shirts[(row * 3 + i) % shirts.length] })
          );
          body.position.set(sx, deckHeight + 1.5, sz);
          body.castShadow = true;
          this.scene.add(body);

          const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.26, 8, 6),
            new THREE.MeshLambertMaterial({ color: 0xd9a877 })
          );
          head.position.set(sx, deckHeight + 2.3, sz);
          this.scene.add(head);
        }
      }

      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.14, 16), table);
      top.position.set(x - side * 0.4, deckHeight + 1.2, COURSE.teeZ);
      this.scene.add(top);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.2, 8), rail);
      stem.position.set(x - side * 0.4, deckHeight + 0.6, COURSE.teeZ);
      this.scene.add(stem);
    }
  }

  /** Layered desert ridges and mesas well beyond the stadium. */
  private setupMountains() {
    // Each band further out is paler and bluer, which is what sells distance.
    const ranges = [
      { radius: 820, count: 34, height: 86, spread: 210, color: 0x8b715b, mesaChance: 0.45 },
      { radius: 1240, count: 38, height: 118, spread: 290, color: 0xa28b74, mesaChance: 0.35 },
      { radius: 1720, count: 40, height: 158, spread: 380, color: 0xc0b59d, mesaChance: 0.25 },
    ];

    for (const range of ranges) {
      const material = new THREE.MeshStandardMaterial({
        color: range.color,
        roughness: 1,
        metalness: 0,
        flatShading: true,
      });

      for (let i = 0; i < range.count; i++) {
        // Overlapping neighbours merge into a ridge line instead of separate cones.
        const angle = (i / range.count) * Math.PI * 2 + (Math.random() - 0.5) * 0.14;
        const distance = range.radius + (Math.random() - 0.5) * range.radius * 0.22;
        const height = range.height * (0.5 + Math.random() * 0.9);
        const base = range.spread * (0.7 + Math.random() * 0.8);

        // Flat-topped mesas alongside pointed peaks, and enough radial segments
        // that the silhouette stops reading as a pyramid.
        const isMesa = Math.random() < range.mesaChance;
        const topRadius = isMesa ? base * (0.3 + Math.random() * 0.25) : base * 0.04;

        const peak = new THREE.Mesh(
          new THREE.CylinderGeometry(topRadius, base, height, 9 + Math.floor(Math.random() * 4), 1),
          material
        );

        peak.position.set(Math.sin(angle) * distance, height / 2 - 14, Math.cos(angle) * distance);
        peak.rotation.y = Math.random() * Math.PI;
        // Squashed on one axis so no two read as the same symmetrical cone.
        peak.scale.set(0.8 + Math.random() * 0.7, 1, 0.8 + Math.random() * 0.7);

        this.scene.add(peak);
      }
    }
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

    // Crest sits just short of the first pillar gate, well clear of the tee so it
    // does not read behind the golfer at address.
    const firstGateZ = Math.max(...COURSE.pillars.map((p: { z: number }) => p.z));
    const decalSize = 22;
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(decalSize, decalSize), material);
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(0, 0.06, firstGateZ + decalSize / 2 + 3);
    decal.renderOrder = 1;
    this.scene.add(decal);

    // Sponsor decal centred on the run of pillars.
    const pillarsCenterZ =
      COURSE.pillars.reduce((sum: number, p: { z: number }) => sum + p.z, 0) /
      COURSE.pillars.length;
    const amWidth = 24;
    const amLogo = new THREE.Mesh(
      // 440 x 384 source, kept at its own aspect so it is not stretched.
      new THREE.PlaneGeometry(amWidth, amWidth * (384 / 440)),
      new THREE.MeshBasicMaterial({
        map: (() => {
          const tex = new THREE.TextureLoader().load('/am.jpg');
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 8;
          return tex;
        })(),
        depthWrite: false,
      })
    );
    amLogo.rotation.x = -Math.PI / 2;
    amLogo.position.set(0, 0.06, pillarsCenterZ);
    amLogo.renderOrder = 1;
    this.scene.add(amLogo);

    // Sponsor board inlaid at the back of the tee pad, behind where the golfer stands.
    const teeLogoWidth = COURSE.teePadWidth * 0.78;
    const teeLogo = new THREE.Mesh(
      new THREE.PlaneGeometry(teeLogoWidth, teeLogoWidth * (213 / 763)),
      new THREE.MeshBasicMaterial({
        map: (() => {
          const tex = new THREE.TextureLoader().load('/neology_logo.png');
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 8;
          return tex;
        })(),
        transparent: true,
        depthWrite: false,
      })
    );
    teeLogo.rotation.x = -Math.PI / 2;
    teeLogo.position.set(0, COURSE.teePadHeight + 0.175, COURSE.teeZ + COURSE.teePadDepth * 0.3);
    teeLogo.renderOrder = 1;
    this.scene.add(teeLogo);

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
    const flagCount = 8;

    for (let i = 1; i <= flagCount; i++) {
      const z = startZ + (length * i) / (flagCount + 1);

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
    const backDepth = tierDepth * backTiers + 3;
    const y = COURSE.backstopHeight + tierRise * backTiers + height / 2 + 10;
    const z = COURSE.arenaBackZ - backDepth - 3;

    const board = createScoreboardMesh(width, height);
    board.position.set(0, y, z);
    this.scene.add(board);

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
    this.updateWind(time);
    this.updateClouds(dt);
    this.updateAircraft(time, dt);
    this.updateFlags(time);
    this.updateBeacon(time);

    this.renderer.render(this.scene, this.camera);
  }

  /** Places the camera behind the thrower, looking down their line to the pin. */
  frameShot(from: { x: number; y: number; z: number }, pin: { x: number; z: number }) {
    const dx = from.x - pin.x;
    const dz = from.z - pin.z;
    const distance = Math.hypot(dx, dz) || 1;

    // Short shots pull the camera in tight; long drives sit further back.
    const back = THREE.MathUtils.clamp(distance * 0.46, 16, 38);
    const height = THREE.MathUtils.clamp(distance * 0.17, 6.2, 14);

    const limitX = COURSE.arenaHalfWidth - 3;
    const minZ = COURSE.arenaBackZ + 6;
    const maxZ = COURSE.arenaFrontZ - 4;
    const inside = (x: number, z: number) => Math.abs(x) <= limitX && z >= minZ && z <= maxZ;

    // Ideally straight behind the thrower. If that lands outside the arena, swing
    // around them at the same radius rather than closing in, which would leave the
    // golfer behind the camera.
    const ideal = Math.atan2(dx, dz);
    let angle = ideal;
    let found = inside(from.x + Math.sin(ideal) * back, from.z + Math.cos(ideal) * back);

    for (let step = 1; step <= 12 && !found; step++) {
      for (const sign of [1, -1]) {
        const candidate = ideal + (sign * step * Math.PI) / 12;
        if (inside(from.x + Math.sin(candidate) * back, from.z + Math.cos(candidate) * back)) {
          angle = candidate;
          found = true;
          break;
        }
      }
    }

    const x = from.x + Math.sin(angle) * back;
    const z = from.z + Math.cos(angle) * back;

    this.cameraGoal.set(
      found ? x : THREE.MathUtils.clamp(x, -limitX, limitX),
      found ? height : height + back * 0.5,
      found ? z : THREE.MathUtils.clamp(z, minZ, maxZ)
    );
    this.lookGoal.set(from.x * 0.3 + pin.x * 0.7, 3.2, from.z * 0.3 + pin.z * 0.7);
  }

  /** Quick run down the hole from tee to basket, then back to the shot view. */
  startFlyover(duration: number = 7) {
    this.flyover = { t: 0, duration };
  }

  get isFlyingOver() {
    return this.flyover !== null;
  }

  /** Starts following a disc that has just left the hand. */
  beginChase(position: { x: number; y: number; z: number }) {
    this.chase = {
      position: new THREE.Vector3(position.x, position.y, position.z),
      heading: new THREE.Vector3(0, 0, -1),
      holdT: 0,
      settled: false,
    };
  }

  /** Feeds the disc's live position to the chase camera. */
  updateChase(position: { x: number; y: number; z: number }) {
    const chase = this.chase;
    if (!chase || chase.settled) {
      return;
    }

    const step = new THREE.Vector3(position.x - chase.position.x, 0, position.z - chase.position.z);

    // Only re-aim once the disc has actually travelled, or the heading jitters.
    if (step.lengthSq() > 0.0004) {
      chase.heading.lerp(step.normalize(), 0.25).normalize();
    }

    chase.position.set(position.x, position.y, position.z);
  }

  /** Disc has come to rest; hold on the result, then hand back to the shot view. */
  endChase() {
    if (this.chase) {
      this.chase.settled = true;
      this.chase.holdT = 0;
    }
  }

  get isCinematic() {
    return this.flyover !== null || this.chase !== null;
  }

  private updateChaseCamera(dt: number): boolean {
    const chase = this.chase;
    if (!chase) {
      return false;
    }

    const hold = 1.5;
    if (chase.settled) {
      chase.holdT += dt;
    }
    const holdProgress = chase.settled ? Math.min(chase.holdT / hold, 1) : 0;

    // Once it lands, swing out to the side to present the result.
    const swing = holdProgress * Math.PI * 0.85;
    const back = THREE.MathUtils.lerp(15, 10, holdProgress);
    const side = Math.sin(swing) * 9;
    const lift = THREE.MathUtils.lerp(5, 3.4, holdProgress);

    const { position, heading } = chase;
    const limitX = COURSE.arenaHalfWidth - 3;

    const goalX = THREE.MathUtils.clamp(
      position.x - heading.x * back - heading.z * side,
      -limitX,
      limitX
    );
    const goalZ = THREE.MathUtils.clamp(
      position.z - heading.z * back + heading.x * side,
      COURSE.arenaBackZ + 6,
      COURSE.arenaFrontZ - 4
    );
    const goalY = Math.max(position.y + lift, 2.4);

    // Looser follow in flight so the camera trails the disc instead of locking to it.
    const k = 1 - Math.exp(-(chase.settled ? 3.4 : 6.5) * dt);
    this.camera.position.lerp(new THREE.Vector3(goalX, goalY, goalZ), k);
    this.lookNow.lerp(position, 1 - Math.exp(-9 * dt));
    this.camera.lookAt(this.lookNow);

    if (chase.settled && holdProgress >= 1) {
      this.chase = null;
    }

    return true;
  }

  private updateCamera(dt: number) {
    if (this.flyover) {
      this.flyover.t += dt;
      const p = Math.min(this.flyover.t / this.flyover.duration, 1);
      // Ease in and out so the run starts and finishes gently.
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

      const z = THREE.MathUtils.lerp(COURSE.teeZ + 26, COURSE.basketZ - 16, eased);
      const height = 34 - Math.sin(eased * Math.PI) * 13;
      const drift = Math.sin(eased * Math.PI * 2) * 9;

      this.camera.position.set(drift, height, z);
      this.lookNow.set(0, 3, Math.max(z - 70, COURSE.basketZ));
      this.camera.lookAt(this.lookNow);

      if (p >= 1) {
        this.flyover = null;
      }
      return;
    }

    if (this.updateChaseCamera(dt)) {
      return;
    }

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
    // The banner extends along the pivot's local +X, which a Y rotation of theta
    // maps to (cos theta, -sin theta). Subtracting 90deg lines that up with the
    // wind vector (sin h, cos h) so the flags stream the way the wind blows.
    const heading = this.windHeading - Math.PI / 2;

    for (const { pivot, flag, phase } of this.flags) {
      pivot.rotation.y = heading + Math.sin(time * 0.7 + phase) * 0.12;

      const position = flag.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const along = (position.getX(i) + 1.3) / 2.6;
        position.setZ(i, Math.sin(time * 6 + phase + along * 5) * 0.28 * along * this.windStrength);
      }
      position.needsUpdate = true;
    }
  }
}
