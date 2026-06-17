import * as THREE from "three";
import { Car, Track, RaceOpponent, CarCategory } from "./types";
import { GameAudio } from "./sound";

export interface GameEngineConfig {
  canvas: HTMLCanvasElement;
  track: Track;
  userCar: Car;
  opponentsList: RaceOpponent[];
  onLapCompleted: (lapNum: number) => void;
  onRaceFinished: (rank: number, finalTime: string) => void;
  onCheckpointTriggered: (index: number) => void;
  onDriftScoreUpdate: (score: number, multiplier: number, driftAngle: number) => void;
  onSpeedUpdate: (speedKmh: number) => void;
  onNitroUpdate: (nitroCharge: number) => void;
  onRankUpdate: (rank: number) => void;
  onCollisionOccurred: () => void;
}

export class GameEngine {
  private config: GameEngineConfig;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;

  // Key visual objects
  private roadGroup!: THREE.Group;
  private buildingsGroup!: THREE.Group;
  private skyMesh!: THREE.Mesh;
  private userCarMesh!: THREE.Group;
  private userCarLight!: THREE.SpotLight;
  private opponentMeshes: Map<string, THREE.Group> = new Map();
  private trafficMeshes: Map<string, THREE.Mesh> = new Map();
  private policeMeshes: Map<string, THREE.Group> = new Map();

  // Weather and Environmental Systems
  private weatherParticles!: THREE.Points;
  private weatherGeometry!: THREE.BufferGeometry;
  private particlePositions: Float32Array = new Float32Array();
  private particlesCount = 800;

  // Sound trackers
  private activeDriftIntensity = 0;

  // Camera Settings
  public cameraView: "third_person" | "first_person" | "cockpit" = "third_person";

  // Light cycles
  private dirLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;

  // Key Player Physics Parameters
  private carX = 0;
  private carY = 0.4;
  private carZ = 20; // Coordinates on racetrack
  private carRotationY = 0;
  private carSpeed = 0; // units/sec
  private carMaxSpeed = 48; // based on car stats
  private baseHandling = 2.4; // steering modifier
  private carVelocityX = 0;
  private carVelocityZ = 0;

  // Drifting Trackers
  private isDrifting = false;
  private driftAngle = 0;
  private driftScore = 0;
  private driftMultiplier = 1.0;
  private totalDriftScoreSession = 0;

  // Nitro Trackers
  private nitroCharge = 100.0;
  private isNitroBoosting = false;
  private nitroCapacity = 100.0;

  // Track coordinates
  private roadCurve!: THREE.CatmullRomCurve3;

  // Match Status
  private raceActive = false;
  private userLap = 1;
  private userCheckpointIndex = 0;
  private userFinished = false;
  private userRank = 1;

  // Bot & Environment tracking
  private botsState: RaceOpponent[] = [];
  private trafficState: { id: string; spawnCheckpoint: number; progress: number; lane: number; zOffset: number; xOffset: number; isPolice: boolean }[] = [];

  // Key Input state
  private inputs = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
    nitro: false
  };

  private frameId: number | null = null;
  private isDestroyed = false;

  constructor(config: GameEngineConfig) {
    this.config = config;
    this.clock = new THREE.Clock();

    // 1. Setup Three.js WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: config.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(config.canvas.clientWidth, config.canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // 2. Setup Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#0c0f1d"); // Cyber-aesthetic black
    this.scene.fog = new THREE.FogExp2("#0c0f1d", 0.005);

    // 3. Setup Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      config.canvas.clientWidth / config.canvas.clientHeight,
      0.1,
      1000
    );

    // Initialize state
    this.botsState = JSON.parse(JSON.stringify(config.opponentsList));

    // Calculate maximum speed and multipliers based on userCar's statistics
    const speedStat = config.userCar.baseStats.speed + (config.userCar.upgrades.speedLevel - 1) * 5;
    this.carMaxSpeed = 40 + (speedStat / 100) * 35; // Maximum speed caps between 40 to 75 units/s

    const accStat = config.userCar.baseStats.acceleration + (config.userCar.upgrades.accelerationLevel - 1) * 5;
    // Grip levels modify drifting potential and sliding friction
    const handStat = config.userCar.baseStats.handling + (config.userCar.upgrades.handlingLevel - 1) * 5;
    this.baseHandling = 1.8 + (handStat / 100) * 1.5;

    // Initialize audio instance
    GameAudio.init();

    // 4. Build Environment & Components
    this.buildTrackAndLights();
    this.buildUserCarMesh();
    this.buildOpponentMeshes();
    this.buildTrafficAndPolice();
    this.buildWeatherSystem();

    // Start rendering frame loop
    this.raceActive = false; // Wait for core countdown to toggle raceActive
    this.animate();
  }

  private buildTrackAndLights() {
    // A. Lighting Setup
    this.ambientLight = new THREE.AmbientLight("#1e2240", 0.8);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight("#a78bfa", 1.2);
    this.dirLight.position.set(50, 200, 50);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.scene.add(this.dirLight);

    // B. Create CatmullRom Curve around the track coordinates for procedural modeling
    const points = this.config.track.checkpoints.map(cp => new THREE.Vector3(cp.x, 0, cp.z));
    // Close the loop
    points.push(points[0].clone());
    this.roadCurve = new THREE.CatmullRomCurve3(points);

    // Build the road visual structures
    this.roadGroup = new THREE.Group();
    this.scene.add(this.roadGroup);

    // Procedural Road Mesh using Extrude or Tube Geometry
    const roadGeom = new THREE.TubeGeometry(this.roadCurve, 120, this.config.track.width / 2, 8, true);
    
    // Choose track colors based on theme
    let roadColor = "#1e1e2f";
    let neonLineColor = "#00ffff"; // Glowing cyans, pinks

    if (this.config.track.id === "neon_expressway") {
      roadColor = "#0e0d16";
      neonLineColor = "#f43f5e"; // hot rose
    } else if (this.config.track.id === "glacier_pass") {
      roadColor = "#e2e8f0";
      neonLineColor = "#38bdf8"; // cold glacier cyan
    } else if (this.config.track.id === "sahara_sands") {
      roadColor = "#3f3f31";
      neonLineColor = "#eab308"; // warm sand gold
    }

    const roadMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(roadColor),
      roughness: 0.82,
      metalness: 0.1,
      flatShading: true
    });
    const roadMesh = new THREE.Mesh(roadGeom, roadMat);
    roadMesh.receiveShadow = true;
    this.roadGroup.add(roadMesh);

    // Add glowing sideline markers to make the paths highly navigable
    const sidelineGeomOuter = new THREE.TubeGeometry(this.roadCurve, 120, this.config.track.width / 2 + 0.3, 4, true);
    const sidelineMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(neonLineColor),
      wireframe: true
    });
    const sidelineMesh = new THREE.Mesh(sidelineGeomOuter, sidelineMat);
    this.roadGroup.add(sidelineMesh);

    // Add decorative structures based on environment
    this.buildingsGroup = new THREE.Group();
    this.scene.add(this.buildingsGroup);

    // Spawning scenery along track checkpoints
    this.config.track.checkpoints.forEach((cp, idx) => {
      // Alternate left/right placements
      const side = idx % 2 === 0 ? 1 : -1;
      const angle = Math.atan2(cp.z, cp.x);
      const dist = this.config.track.width + 10 + Math.random() * 15;
      const objX = cp.x + Math.cos(angle + Math.PI/2) * dist * side;
      const objZ = cp.z + Math.sin(angle + Math.PI/2) * dist * side;

      if (this.config.track.id === "neon_expressway" || this.config.track.id === "metropolis_drift") {
        // Futuristic skyscrapers
        const bHeight = 40 + Math.random() * 60;
        const bGeom = new THREE.BoxGeometry(10 + Math.random() * 10, bHeight, 10 + Math.random() * 10);
        const bMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(idx % 3 === 0 ? "#111827" : idx % 3 === 1 ? "#1e1e38" : "#030712"),
          roughness: 0.4,
          metalness: 0.8
        });
        const bMesh = new THREE.Mesh(bGeom, bMat);
        bMesh.position.set(objX, bHeight / 2 - 1, objZ);
        bMesh.castShadow = true;
        this.buildingsGroup.add(bMesh);

        // Add small glowing window meshes or stripes
        const stripeGeom = new THREE.BoxGeometry(1.2, bHeight - 10, 1.2);
        const stripeMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(idx % 2 === 0 ? "#38bdf8" : "#ec4899")
        });
        const stripe = new THREE.Mesh(stripeGeom, stripeMat);
        stripe.position.set(objX + side * 5, bHeight / 2, objZ);
        this.buildingsGroup.add(stripe);
      } else if (this.config.track.id === "sahara_sands") {
        // Giant desert rock arches and pyramids
        const pyramidGeom = new THREE.ConeGeometry(12, 18, 4);
        const pyramidMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color("#d97706"),
          roughness: 0.9
        });
        const pyramid = new THREE.Mesh(pyramidGeom, pyramidMat);
        pyramid.rotation.y = Math.random() * Math.PI;
        pyramid.position.set(objX, 9, objZ);
        this.buildingsGroup.add(pyramid);
      } else {
        // Alpine or Glacier snowy pine trees Procedural elements
        const coneGeom = new THREE.ConeGeometry(5, 12, 5);
        const trunkGeom = new THREE.CylinderGeometry(0.8, 0.8, 4, 4);

        const pineMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(this.config.track.id === "glacier_pass" ? "#cbd5e1" : "#15803d"),
          roughness: 0.95
        });
        const trunkMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#78350f") });

        const treeGroup = new THREE.Group();
        const foliage = new THREE.Mesh(coneGeom, pineMat);
        foliage.position.y = 8;
        foliage.castShadow = true;
        const trunk = new THREE.Mesh(trunkGeom, trunkMat);
        trunk.position.y = 2;

        treeGroup.add(foliage, trunk);
        treeGroup.position.set(objX, 0, objZ);
        this.buildingsGroup.add(treeGroup);
      }
    });

    // C. Finish Line Mesh
    const startCP = this.config.track.checkpoints[0];
    const finishGeom = new THREE.BoxGeometry(this.config.track.width, 0.2, 4);
    const finishMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#ffffff"),
      roughness: 0.2,
      metalness: 0.8,
      flatShading: true
    });
    const finishMesh = new THREE.Mesh(finishGeom, finishMat);
    finishMesh.position.set(startCP.x, 0.1, startCP.z);
    this.scene.add(finishMesh);

    // Finish Arch
    const pillarGeom = new THREE.CylinderGeometry(0.8, 0.8, 8, 8);
    const metalMat = new THREE.MeshStandardMaterial({ color: "#2d3748", metalness: 0.9 });
    const rightPillar = new THREE.Mesh(pillarGeom, metalMat);
    rightPillar.position.set(startCP.x + this.config.track.width / 2, 4, startCP.z);
    const leftPillar = leftPillarClone(rightPillar, startCP, this.config.track.width);
    this.scene.add(rightPillar, leftPillar);

    const bannerGeom = new THREE.BoxGeometry(this.config.track.width, 1.8, 1.0);
    const bannerMat = new THREE.MeshBasicMaterial({ color: "#e11d48" }); // Rose header banner
    const banner = new THREE.Mesh(bannerGeom, bannerMat);
    banner.position.set(startCP.x, 8, startCP.z);
    this.scene.add(banner);
  }

  private buildUserCarMesh() {
    this.userCarMesh = new THREE.Group();
    
    // Procedural sports model composition depending on selected category
    const paintColor = new THREE.Color(this.config.userCar.customization.paintColor);
    const carGroup = new THREE.Group();

    // 1. Chassis/Body Block
    const bodyGeom = new THREE.BoxGeometry(1.6, 0.6, 3.8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: paintColor,
      roughness: 0.18,
      metalness: 0.62
    });
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    bodyMesh.position.y = 0.44;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    carGroup.add(bodyMesh);

    // 2. Cabin Block
    const cabGeom = new THREE.BoxGeometry(1.2, 0.5, 1.8);
    const cabMat = new THREE.MeshStandardMaterial({
      color: "#111827", // tinted glass window cockpit
      roughness: 0.05,
      metalness: 0.9
    });
    const cabMesh = new THREE.Mesh(cabGeom, cabMat);
    cabMesh.position.set(0, 0.9, -0.2);
    cabMesh.castShadow = true;
    carGroup.add(cabMesh);

    // 3. Spoilers styling configurations
    if (this.config.userCar.customization.spoilerStyle !== "none") {
      const spoilerGroup = new THREE.Group();
      
      const wingGeom = new THREE.BoxGeometry(1.8, 0.1, 0.5);
      const wingMat = new THREE.MeshStandardMaterial({ color: "#111827", metalness: 0.9 });
      const wing = new THREE.Mesh(wingGeom, wingMat);
      wing.position.set(0, 0.9, -2.0); // Mounted at the trunk end
      spoilerGroup.add(wing);

      const standGeom = new THREE.BoxGeometry(0.15, 0.4, 0.15);
      const leftStand = new THREE.Mesh(standGeom, wingMat);
      leftStand.position.set(-0.6, 0.7, -1.9);
      const rightStand = leftStand.clone();
      rightStand.position.x = 0.6;

      spoilerGroup.add(leftStand, rightStand);
      carGroup.add(spoilerGroup);
    }

    // 4. Decals lines on top
    if (this.config.userCar.customization.decalStyle !== "none") {
      const stripeGeom = new THREE.BoxGeometry(0.3, 0.02, 3.9);
      const decalCol = new THREE.Color(this.config.userCar.customization.decalColor);
      const stripeMat = new THREE.MeshBasicMaterial({ color: decalCol });
      
      const leftStripe = new THREE.Mesh(stripeGeom, stripeMat);
      leftStripe.position.set(-0.35, 0.75, 0);
      const rightStripe = leftStripe.clone();
      rightStripe.position.x = 0.35;

      carGroup.add(leftStripe, rightStripe);
    }

    // 5. Underglow Neons
    if (this.config.userCar.customization.neonUnderglow !== "none") {
      let neonColStr = "#00ffff"; // Default Cyan blue
      if (this.config.userCar.customization.neonUnderglow === "red") neonColStr = "#ef4444";
      if (this.config.userCar.customization.neonUnderglow === "green") neonColStr = "#22c55e";
      if (this.config.userCar.customization.neonUnderglow === "pink") neonColStr = "#ec4899";
      if (this.config.userCar.customization.neonUnderglow === "gold") neonColStr = "#eab308";

      const glowColor = new THREE.Color(neonColStr);
      const neonLight = new THREE.PointLight(glowColor, 4, 3);
      neonLight.position.set(0, 0.1, 0);
      carGroup.add(neonLight);
    }

    // 6. Realistic Wheels Cylinder Geometry
    const wheelGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.36, 12);
    wheelGeom.rotateZ(Math.PI / 2);
    const rimColor = new THREE.Color(this.config.userCar.customization.wheelColor);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: "#0f172a", // Dark tire composite
      roughness: 0.6
    });

    const rearLeftW = new THREE.Mesh(wheelGeom, wheelMat);
    rearLeftW.position.set(-0.84, 0.42, -1.1);
    rearLeftW.castShadow = true;

    const rearRightW = rearLeftW.clone();
    rearRightW.position.x = 0.84;

    const frontLeftW = rearLeftW.clone();
    frontLeftW.position.z = 1.1;

    const frontRightW = rearRightW.clone();
    frontRightW.position.z = 1.1;

    carGroup.add(rearLeftW, rearRightW, frontLeftW, frontRightW);

    // Front headlights spotlights for dark tunnels/cycles
    this.userCarLight = new THREE.SpotLight("#ffffff", 8, 45, Math.PI / 6, 0.5, 1);
    this.userCarLight.position.set(0, 0.5, 1.8);
    this.userCarLight.target.position.set(0, 0, 10);
    carGroup.add(this.userCarLight);
    carGroup.add(this.userCarLight.target);

    this.userCarMesh.add(carGroup);
    this.scene.add(this.userCarMesh);

    // Position player slightly behind starting grid
    const spawnP = this.roadCurve.getPointAt(0.99); // loop coordinate
    this.carX = spawnP.x;
    this.carZ = spawnP.z;
    this.userCarMesh.position.set(this.carX, this.carY, this.carZ);
    
    // Look along tangent
    const tangent = this.roadCurve.getTangentAt(0.99);
    this.carRotationY = Math.atan2(tangent.x, tangent.z);
    this.userCarMesh.rotation.y = this.carRotationY;
  }

  private buildOpponentMeshes() {
    this.config.opponentsList.forEach(bot => {
      const botGroup = new THREE.Group();
      
      const paintColor = new THREE.Color(bot.carColor);
      const bodyGeom = new THREE.BoxGeometry(1.6, 0.6, 3.8);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: paintColor,
        roughness: 0.25,
        metalness: 0.5
      });
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 0.44;
      body.castShadow = true;
      botGroup.add(body);

      const cabGeom = new THREE.BoxGeometry(1.2, 0.5, 1.8);
      const cabMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.1 });
      const cab = new THREE.Mesh(cabGeom, cabMat);
      cab.position.set(0, 0.9, -0.2);
      botGroup.add(cab);

      // Low cost procedural wheels
      const wheelGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.36, 8);
      wheelGeom.rotateZ(Math.PI / 2);
      const wheelMat = new THREE.MeshBasicMaterial({ color: "#111827" });
      
      const wl = new THREE.Mesh(wheelGeom, wheelMat);
      wl.position.set(-0.84, 0.42, -1.1);
      const wr = wl.clone();
      wr.position.x = 0.84;
      const wfl = wl.clone();
      wfl.position.z = 1.1;
      const wfr = wr.clone();
      wfr.position.z = 1.1;

      botGroup.add(wl, wr, wfl, wfr);

      // Position along spawning index offsets
      const initialPercent = Math.max(0, 0.99 - (bot.skill * 0.05));
      const pos = this.roadCurve.getPointAt(initialPercent);
      // Give offset lanes so they aren't stacked
      const laneOffset = ((parseInt(bot.id.replace(/\D/g, "")) || 0) % 3 - 1) * 3;
      const t = this.roadCurve.getTangentAt(initialPercent);
      const normal = new THREE.Vector3(-t.z, 0, t.x).normalize();

      bot.x = pos.x + normal.x * laneOffset;
      bot.z = pos.z + normal.z * laneOffset;
      bot.distanceAlongTrack = initialPercent;

      botGroup.position.set(bot.x, 0.4, bot.z);
      botGroup.rotation.y = Math.atan2(t.x, t.z);

      this.scene.add(botGroup);
      this.opponentMeshes.set(bot.id, botGroup);
    });
  }

  private buildTrafficAndPolice() {
    this.trafficState = [];
    if (!this.config.track.hasTraffic) return;

    // Spawn 8 slow-moving trucks/passenger cars around checkpoints
    for (let i = 0; i < 8; i++) {
      const id = "traffic_" + i;
      const cpIndex = Math.floor(1 + Math.random() * (this.config.track.checkpoints.length - 2));
      const spawnCp = this.config.track.checkpoints[cpIndex];
      const nextCp = this.config.track.checkpoints[cpIndex + 1];

      const progress = Math.random();
      const lane = i % 2 === 0 ? -1.5 : 1.5; // Left vs Right road lanes

      const geom = new THREE.BoxGeometry(1.8, 1.2, 4.2);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(i % 3 === 0 ? "#facc15" : i % 3 === 1 ? "#ef4444" : "#64748b"),
        roughness: 0.5
      });
      const truck = new THREE.Mesh(geom, mat);
      truck.position.y = 0.7;
      truck.castShadow = true;

      // Position calculation
      const x = spawnCp.x + (nextCp.x - spawnCp.x) * progress;
      const z = spawnCp.z + (nextCp.z - spawnCp.z) * progress;
      truck.position.set(x, 0.7, z);

      this.scene.add(truck);
      this.trafficMeshes.set(id, truck);

      this.trafficState.push({
        id,
        spawnCheckpoint: cpIndex,
        progress,
        lane,
        zOffset: 0,
        xOffset: 0,
        isPolice: false
      });
    }

    // Set up police car patrols
    if (this.config.track.hasPolice) {
      const polGeom = new THREE.BoxGeometry(1.7, 0.8, 3.8);
      const polMat = new THREE.MeshStandardMaterial({ color: "#1e293b", metalness: 0.9 });
      const police = new THREE.Mesh(polGeom, polMat);
      police.position.y = 0.5;

      // Add emergency blue-red flashing flasher sirens
      const sirenLGeom = new THREE.BoxGeometry(0.8, 0.15, 0.3);
      const sirenLMat = new THREE.MeshBasicMaterial({ color: "#ef4444" }); // Red flashing default
      const siren = new THREE.Mesh(sirenLGeom, sirenLMat);
      siren.position.set(0, 0.9, -0.1);
      police.add(siren);

      const polGroup = new THREE.Group();
      polGroup.add(police);
      polGroup.position.set(0, 0.5, -400); // Deploy deeper in sandbox
      this.scene.add(polGroup);
      this.policeMeshes.set("cop_1", polGroup);

      this.trafficState.push({
        id: "cop_1",
        spawnCheckpoint: 3,
        progress: 0.1,
        lane: 0,
        zOffset: 0,
        xOffset: 0,
        isPolice: true
      });
    }
  }

  private buildWeatherSystem() {
    this.weatherGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particlesCount * 3);

    for (let i = 0; i < this.particlesCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 180; // random range X relative
      positions[i * 3 + 1] = Math.random() * 80;      // high altitude Y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 180; // random range Z
    }

    this.particlePositions = positions;
    this.weatherGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Choose visual particle colors (blue for rain, white for snow)
    let colStr = "#3af0ff"; 
    let pSize = 0.2;
    if (this.config.track.id === "glacier_pass") {
      colStr = "#ffffff"; // flakes of snow
      pSize = 0.5;
    }

    const pMat = new THREE.PointsMaterial({
      color: new THREE.Color(colStr),
      size: pSize,
      transparent: true,
      opacity: 0.72
    });

    this.weatherParticles = new THREE.Points(this.weatherGeometry, pMat);
    this.scene.add(this.weatherParticles);
  }

  // Handle core control signals from frame view
  public updateControls(forward: boolean, backward: boolean, left: boolean, right: boolean, drift: boolean, nitro: boolean) {
    this.inputs.forward = forward;
    this.inputs.backward = backward;
    this.inputs.left = left;
    this.inputs.right = right;
    this.inputs.drift = drift;
    this.inputs.nitro = nitro;
  }

  public triggerNitro() {
    if (this.nitroCharge > 10) {
      this.isNitroBoosting = true;
      GameAudio.setNitroIntensity(true);
    }
  }

  public stopNitro() {
    this.isNitroBoosting = false;
    GameAudio.setNitroIntensity(false);
  }

  public startRaceCountdown() {
    this.raceActive = true;
  }

  private animate = () => {
    if (this.isDestroyed) return;
    this.frameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1); // cap latency lag spikes

    if (this.raceActive) {
      this.updatePlayerPhysics(delta);
      this.updateBotsPhysics(delta);
      this.updateEnvironmentTraffic(delta);
      this.checkRaceLobbiesCollisions();
    }

    this.updateCameras(delta);
    this.updateEnvironmentalWeather(delta);

    // Dynamic renderer render invocation
    this.renderer.render(this.scene, this.camera);
  };

  private updatePlayerPhysics(delta: number) {
    // 1. Friction & Grip mapped to surfaceFriction multiplier
    const friction = 1.6 * this.config.track.surfaceFriction;
    const grip = this.inputs.drift || this.inputs.left && this.inputs.right ? 0.35 : 1.05;

    // Apply inputs to accelerate or brake
    const accPower = 18.0 + (this.config.userCar.baseStats.acceleration / 100) * 12;
    const brakePower = 28.0 + (this.config.userCar.baseStats.brakes / 100) * 15;
    
    let targetMax = this.carMaxSpeed;

    // Boost acceleration if Nitro triggered
    if (this.inputs.nitro && this.nitroCharge > 0 && this.inputs.forward) {
      targetMax *= 1.35;
      this.carSpeed += accPower * 2.2 * delta;
      this.nitroCharge = Math.max(0, this.nitroCharge - 40.0 * delta);
      this.config.onNitroUpdate(this.nitroCharge);
    } else {
      if (this.inputs.forward) {
        this.carSpeed += accPower * delta;
      } else if (this.inputs.backward) {
        this.carSpeed -= brakePower * delta;
      } else {
        // Natural engine drag deceleration
        this.carSpeed -= (this.carSpeed * 0.7) * delta;
      }
    }

    // Limit extreme velocities
    this.carSpeed = Math.min(Math.max(-15, this.carSpeed), targetMax);

    // 2. Turning with physical rotations
    if (Math.abs(this.carSpeed) > 1.5) {
      const directionModifier = this.carSpeed > 0 ? 1 : -1;
      const turnRadius = this.baseHandling * (1.2 - Math.abs(this.carSpeed) / (targetMax * 2));
      
      if (this.inputs.left) {
        this.carRotationY += turnRadius * directionModifier * delta;
      }
      if (this.inputs.right) {
        this.carRotationY -= turnRadius * directionModifier * delta;
      }
    }

    // 3. Calculating Drift states
    const sharpTurning = (this.inputs.left || this.inputs.right) && Math.abs(this.carSpeed) > 20;
    this.isDrifting = sharpTurning && (this.inputs.drift || this.config.track.surfaceFriction < 0.7);

    if (this.isDrifting) {
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, this.inputs.left ? 0.45 : -0.45, 6 * delta);
      
      // Points accumulation ticker
      const driftPoints = Math.round(Math.abs(this.carSpeed) * 3 * delta);
      this.driftScore += driftPoints;
      this.driftMultiplier = THREE.MathUtils.lerp(this.driftMultiplier, 3.5, 0.4 * delta);
      this.activeDriftIntensity = THREE.MathUtils.lerp(this.activeDriftIntensity, 1.0, 5 * delta);

      // Squeal sounds intensity ticker
      GameAudio.setDriftIntensity(this.activeDriftIntensity);
      this.config.onDriftScoreUpdate(this.driftScore, Number(this.driftMultiplier.toFixed(1)), this.driftAngle);
    } else {
      // Return steering wheels back to grid
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, 0, 8 * delta);
      this.activeDriftIntensity = THREE.MathUtils.lerp(this.activeDriftIntensity, 0, 4 * delta);
      GameAudio.setDriftIntensity(0);

      if (this.driftScore > 20) {
        // Save drift session score and reset
        this.totalDriftScoreSession += Math.round(this.driftScore * this.driftMultiplier);
        this.driftScore = 0;
        this.driftMultiplier = 1.0;
        this.config.onDriftScoreUpdate(0, 1.0, 0);
      }
    }

    // 4. Update Vectors
    const forwardX = Math.sin(this.carRotationY);
    const forwardZ = Math.cos(this.carRotationY);

    const driftSlipX = Math.sin(this.carRotationY + this.driftAngle);
    const driftSlipZ = Math.cos(this.carRotationY + this.driftAngle);

    // Speed vector mixtures
    this.carVelocityX = THREE.MathUtils.lerp(forwardX * this.carSpeed, driftSlipX * this.carSpeed, 0.22 * grip);
    this.carVelocityZ = THREE.MathUtils.lerp(forwardZ * this.carSpeed, driftSlipZ * this.carSpeed, 0.22 * grip);

    this.carX += this.carVelocityX * delta;
    this.carZ += this.carVelocityZ * delta;

    this.userCarMesh.position.set(this.carX, this.carY, this.carZ);
    this.userCarMesh.rotation.y = this.carRotationY + (this.driftAngle * 0.45);

    // Notify interface elements of telemetry speeds
    const speedKmh = Math.abs(Math.round(this.carSpeed * 5));
    this.config.onSpeedUpdate(speedKmh);

    // Adjust synthesized engine sound frequency pitch based on RPMs
    const rpmRatio = Math.abs(this.carSpeed) / this.carMaxSpeed;
    GameAudio.setEngineRPM(rpmRatio, this.inputs.forward);

    // Regenerate nitro slowly if not boosting
    if (!this.inputs.nitro && this.nitroCharge < this.nitroCapacity) {
      this.nitroCharge = Math.min(this.nitroCapacity, this.nitroCharge + 5 * delta);
      this.config.onNitroUpdate(this.nitroCharge);
    }

    // Checking Checkpoints & Laps Completed
    this.evaluateCheckpoints();
  }

  private evaluateCheckpoints() {
    if (this.userFinished) return;

    // Check distance to next expected track checkpoint coordinates
    const checkpoints = this.config.track.checkpoints;
    const currentTarget = checkpoints[this.userCheckpointIndex];

    const dx = this.carX - currentTarget.x;
    const dz = this.carZ - currentTarget.z;
    const distanceSq = dx * dx + dz * dz;

    // Trigger within radius of 28 meters
    if (distanceSq < 784) {
      this.config.onCheckpointTriggered(this.userCheckpointIndex);
      
      // Advance checkpoints
      this.userCheckpointIndex++;
      if (this.userCheckpointIndex >= checkpoints.length) {
        this.userCheckpointIndex = 0;
        
        // Lap Completed loop
        this.userLap++;
        this.config.onLapCompleted(this.userLap);

        if (this.userLap > this.config.track.laps) {
          this.userFinished = true;
          this.carSpeed = 0;
          
          // Generate realistic clock time for user rank
          const time = new Date(this.clock.getElapsedTime() * 1000).toISOString().substr(14, 5) + "." + Math.floor(Math.random() * 99).toString().padStart(2, '0');
          this.config.onRaceFinished(this.userRank, time);
        }
      }
    }
  }

  private updateBotsPhysics(delta: number) {
    // Progress each bot slightly along roadCurve depending on their customized skills
    this.botsState.forEach((bot) => {
      if (bot.finished) return;

      // Accelerate them based on skill factor and rubber banding to keep it tightly competitive
      let progressionBoost = 0.0055 + (bot.skill * 0.003);
      
      // Rubber banding: if users are far ahead, speed up bots. If behind, slow down bots slightly!
      const playerProgress = (this.userLap - 1) + (this.userCheckpointIndex / this.config.track.checkpoints.length);
      const botProgress = bot.distanceAlongTrack + (bot.lap - 1);

      if (playerProgress > botProgress + 0.15) {
        progressionBoost *= 1.35; // Bot accelerates
      } else if (playerProgress < botProgress - 0.1) {
        progressionBoost *= 0.85; // Bot slows down so player can catch up
      }

      bot.distanceAlongTrack += progressionBoost * delta;

      if (bot.distanceAlongTrack >= 1.0) {
        bot.distanceAlongTrack = 0;
        bot.lap++;
        if (bot.lap > this.config.track.laps) {
          bot.finished = true;
          bot.finishTime = new Date((this.clock.getElapsedTime() - Math.random() * 3) * 1000).toISOString().substr(14, 5);
        }
      }

      // Compute actual position from curve
      const pos = this.roadCurve.getPointAt(bot.distanceAlongTrack);
      const t = this.roadCurve.getTangentAt(bot.distanceAlongTrack);

      const normal = new THREE.Vector3(-t.z, 0, t.x).normalize();
      
      // Stagger Bot Lane coordinate offsets
      const laneIndex = (parseInt(bot.id.replace(/\D/g, "")) || 0) % 3 - 1;
      const spacingLine = laneIndex * 2.8;

      bot.x = pos.x + normal.x * spacingLine;
      bot.z = pos.z + normal.z * spacingLine;

      // Sync Visual Meshes
      const mesh = this.opponentMeshes.get(bot.id);
      if (mesh) {
        mesh.position.set(bot.x, 0.4, bot.z);
        // Turn mesh along curve tangent direction
        const angle = Math.atan2(t.x, t.z);
        mesh.rotation.y = angle;
      }
    });

    // Re-evaluate real-time ranking ladder
    this.calculateRanks();
  }

  private calculateRanks() {
    // Sort all vehicles by total track progression
    const scores = this.botsState.map(bot => ({
      id: bot.id,
      isPlayer: false,
      prog: (bot.lap - 1) + bot.distanceAlongTrack
    }));

    // Add Player state
    const playerProgress = (this.userLap - 1) + (this.userCheckpointIndex / this.config.track.checkpoints.length);
    scores.push({
      id: "player",
      isPlayer: true,
      prog: playerProgress
    });

    scores.sort((a, b) => b.prog - a.prog);

    const rank = scores.findIndex(s => s.isPlayer) + 1;
    if (rank !== this.userRank && rank > 0 && rank <= 20) {
      if (rank < this.userRank) {
        GameAudio.triggerOvertake(); // sound effect for ranking upgrade
      }
      this.userRank = rank;
      this.config.onRankUpdate(this.userRank);
    }
  }

  private updateEnvironmentTraffic(delta: number) {
    this.trafficState.forEach((t) => {
      // Progress obstacles or police cars
      const speedCoeff = t.isPolice ? 0.05 : 0.015;
      t.progress += speedCoeff * delta;

      if (t.progress >= 1.0) {
        t.progress = 0;
        // Bump checkpoints
        t.spawnCheckpoint = (t.spawnCheckpoint + 1) % (this.config.track.checkpoints.length - 1);
      }

      const currentCP = this.config.track.checkpoints[t.spawnCheckpoint];
      const nextCP = this.config.track.checkpoints[t.spawnCheckpoint + 1];

      // Coordinate placement
      const x = currentCP.x + (nextCP.x - currentCP.x) * t.progress + (t.lane * 2);
      const z = currentCP.z + (nextCP.z - currentCP.z) * t.progress + (t.lane * 1);

      t.xOffset = x;
      t.zOffset = z;

      // Sync mesh
      if (t.isPolice) {
        const mesh = this.policeMeshes.get(t.id);
        if (mesh) {
          mesh.position.set(x, 0.5, z);
          const angle = Math.atan2(nextCP.x - currentCP.x, nextCP.z - currentCP.z);
          mesh.rotation.y = angle;

          // Flash police sirens
          const siren = mesh.children[0].children[1] as THREE.Mesh;
          if (siren && siren.material) {
            const mat = siren.material as THREE.MeshBasicMaterial;
            mat.color.setHex(Math.floor(this.clock.getElapsedTime() * 12) % 2 === 0 ? 0xef4444 : 0x3b82f6);
          }
        }
      } else {
        const mesh = this.trafficMeshes.get(t.id);
        if (mesh) {
          mesh.position.set(x, 0.7, z);
          const angle = Math.atan2(nextCP.x - currentCP.x, nextCP.z - currentCP.z);
          mesh.rotation.y = angle;
        }
      }
    });
  }

  private checkRaceLobbiesCollisions() {
    // 1. Check collisions with opponents (AIs) the user is racing
    this.opponentMeshes.forEach((mesh, botId) => {
      const dist = mesh.position.distanceTo(this.userCarMesh.position);
      if (dist < 1.9) {
        // Slam feedback bounce
        this.carSpeed *= -0.4;
        GameAudio.triggerCrash();
        this.config.onCollisionOccurred();
      }
    });

    // 2. Check collision with traffic or cop structures
    this.trafficState.forEach((t) => {
      const dx = this.carX - t.xOffset;
      const dz = this.carZ - t.zOffset;
      const distSq = dx * dx + dz * dz;

      // Within radius of 2.2 meters is a hard crash
      if (distSq < 5.2) {
        this.carSpeed = -4; // Stop speed reverse bounce!
        GameAudio.triggerCrash();
        this.config.onCollisionOccurred();
      }
    });
  }

  private updateCameras(delta: number) {
    if (!this.userCarMesh) return;

    // Vector calculations around user car position and direction
    const theta = this.carRotationY + (this.driftAngle * 0.42);
    const trigX = Math.sin(theta);
    const trigZ = Math.cos(theta);

    if (this.cameraView === "third_person") {
      // Lagging chase camera
      const targetCamX = this.carX - trigX * 9;
      const targetCamZ = this.carZ - trigZ * 9;
      const targetCamY = this.carY + 3.8;

      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, 6 * delta);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, 6 * delta);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, 6 * delta);

      // Target to point slightly ahead of the car hood
      const targetLook = new THREE.Vector3(this.carX + trigX * 4, this.carY + 0.6, this.carZ + trigZ * 4);
      this.camera.lookAt(targetLook);
    } else if (this.cameraView === "first_person") {
      // Mounted right at front engine grill (high speed feel)
      this.camera.position.set(this.carX + trigX * 1.5, this.carY + 0.6, this.carZ + trigZ * 1.5);
      this.camera.lookAt(new THREE.Vector3(this.carX + trigX * 18, this.carY + 0.5, this.carZ + trigZ * 18));
    } else if (this.cameraView === "cockpit") {
      // Cockpit steering-wheel view
      this.camera.position.set(this.carX - trigX * 0.4, this.carY + 1.1, this.carZ - trigZ * 0.4);
      this.camera.lookAt(new THREE.Vector3(this.carX + trigX * 15, this.carY + 0.9, this.carZ + trigZ * 15));
    }
  }

  private updateEnvironmentalWeather(delta: number) {
    if (!this.weatherParticles) return;

    // Slide weather layers downwards (rain falling / snow drifting)
    const posAttr = this.weatherGeometry.getAttribute("position") as THREE.BufferAttribute;
    
    for (let i = 0; i < this.particlesCount; i++) {
      let y = posAttr.getY(i);
      
      // Slide downwards relative to speed
      y -= (this.config.track.id === "glacier_pass" ? 4 : 15) * delta;

      // Bring particle back high if hitting flat road
      if (y < 0) {
        y = 50 + Math.random() * 30;
      }

      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;

    // Follow player coordinates so bounds never run empty
    this.weatherParticles.position.set(this.carX, 0, this.carZ);
  }

  public handleSizeUpdate(width: number, height: number) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public toggleCamera() {
    if (this.cameraView === "third_person") {
      this.cameraView = "first_person";
    } else if (this.cameraView === "first_person") {
      this.cameraView = "cockpit";
    } else {
      this.cameraView = "third_person";
    }
  }

  public getSessionDriftScore(): number {
    return this.totalDriftScoreSession;
  }

  public getPlayerX(): number {
    return this.carX;
  }

  public getPlayerZ(): number {
    return this.carZ;
  }

  public getBotsState(): RaceOpponent[] {
    return this.botsState;
  }

  public setMute(muted: boolean) {
    GameAudio.setMute(muted);
  }

  public cleanup() {
    this.isDestroyed = true;
    if (this.frameId) cancelAnimationFrame(this.frameId);
    
    // Dispose WebGL resources beautifully to avoid GPU leaks
    try {
      this.renderer.dispose();
      this.roadGroup?.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      this.buildingsGroup?.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          obj.material.dispose();
        }
      });
    } catch (e) {
      console.warn("Disposal warn:", e);
    }

    GameAudio.destroy();
  }
}

function leftPillarClone(rightPillar: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial, THREE.Object3DEventMap>, startCP: { x: number; z: number; }, spacing: number) {
  const cloned = rightPillar.clone();
  cloned.position.set(startCP.x - spacing / 2, 4, startCP.z);
  return cloned;
}
