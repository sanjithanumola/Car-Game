import { CarCategory, Car, Track, Achievement } from "./types";

export const CAR_PRESETS: Car[] = [
  {
    id: "gt_eclipse",
    name: "GT Eclipse",
    category: CarCategory.SPORTS,
    price: 0, // Starter car
    baseStats: { speed: 45, acceleration: 40, handling: 55, brakes: 50 },
    upgrades: { speedLevel: 1, accelerationLevel: 1, handlingLevel: 1, brakesLevel: 1 },
    customization: {
      paintColor: "#3b82f6", // Vibrant Blue
      wheelStyle: "sport",
      wheelColor: "#ffffff",
      spoilerStyle: "none",
      decalStyle: "none",
      decalColor: "#ffffff",
      neonUnderglow: "none"
    },
    isUnlocked: true,
    imageSeed: "car_sports_starter"
  },
  {
    id: "v8_charger",
    name: "V8 Charger",
    category: CarCategory.MUSCLE,
    price: 15000,
    baseStats: { speed: 55, acceleration: 65, handling: 35, brakes: 40 },
    upgrades: { speedLevel: 1, accelerationLevel: 1, handlingLevel: 1, brakesLevel: 1 },
    customization: {
      paintColor: "#f97316", // Muscle Orange
      wheelStyle: "classic",
      wheelColor: "#000000",
      spoilerStyle: "low",
      decalStyle: "stripes",
      decalColor: "#000000",
      neonUnderglow: "none"
    },
    isUnlocked: false,
    imageSeed: "car_muscle_charger"
  },
  {
    id: "dune_raider",
    name: "Dune Raider 4x4",
    category: CarCategory.OFF_ROAD,
    price: 32000,
    baseStats: { speed: 40, acceleration: 60, handling: 50, brakes: 65 },
    upgrades: { speedLevel: 1, accelerationLevel: 1, handlingLevel: 1, brakesLevel: 1 },
    customization: {
      paintColor: "#22c55e", // Mud Green
      wheelStyle: "classic",
      wheelColor: "#f3f4f6",
      spoilerStyle: "none",
      decalStyle: "tribal",
      decalColor: "#1e293b",
      neonUnderglow: "green"
    },
    isUnlocked: false,
    imageSeed: "car_offroad_raider"
  },
  {
    id: "interceptor",
    name: "Viper Interceptor",
    category: CarCategory.SUPERCAR,
    price: 68000,
    baseStats: { speed: 75, acceleration: 72, handling: 68, brakes: 70 },
    upgrades: { speedLevel: 1, accelerationLevel: 1, handlingLevel: 1, brakesLevel: 1 },
    customization: {
      paintColor: "#dc2626", // Racing Red
      wheelStyle: "carbon",
      wheelColor: "#27272a",
      spoilerStyle: "wing",
      decalStyle: "flames",
      decalColor: "#facc15",
      neonUnderglow: "red"
    },
    isUnlocked: false,
    imageSeed: "car_supercar_interceptor"
  },
  {
    id: "vortex_hyper",
    name: "Apex Vortex-X",
    category: CarCategory.HYPERCAR,
    price: 145000,
    baseStats: { speed: 95, acceleration: 96, handling: 88, brakes: 90 },
    upgrades: { speedLevel: 1, accelerationLevel: 1, handlingLevel: 1, brakesLevel: 1 },
    customization: {
      paintColor: "#a855f7", // Techno Purple
      wheelStyle: "chrome",
      wheelColor: "#a1a1aa",
      spoilerStyle: "gt",
      decalStyle: "neon_lines",
      decalColor: "#22d3ee",
      neonUnderglow: "blue"
    },
    isUnlocked: false,
    imageSeed: "car_hypercar_vortex"
  }
];

export const TRACKS: Track[] = [
  {
    id: "neon_expressway",
    name: "Neon Expressway",
    description: "A cyberpunk virtual grid filled with neon-streaked speed corridors.",
    difficulty: "Easy",
    lengthMeters: 2400,
    laps: 2,
    bestTime: "1:35.00",
    imageSeed: "neon_express",
    surfaceFriction: 1.0,
    hasTraffic: false,
    hasPolice: false,
    width: 25,
    checkpoints: [
      { x: 0, z: -100 },
      { x: 100, z: -250 },
      { x: 300, z: -350 },
      { x: 500, z: -300 },
      { x: 600, z: -100 },
      { x: 500, z: 150 },
      { x: 250, z: 250 },
      { x: 50, z: 100 },
      { x: 0, z: 0 }
    ]
  },
  {
    id: "metropolis_drift",
    name: "Metropolis Grid",
    description: "Winding downtown streets with tight corners, active traffic and skyscrapers.",
    difficulty: "Medium",
    lengthMeters: 3100,
    laps: 3,
    bestTime: "2:10.50",
    imageSeed: "metro_drift",
    surfaceFriction: 0.9,
    hasTraffic: true,
    hasPolice: false,
    width: 22,
    checkpoints: [
      { x: 0, z: -120 },
      { x: -100, z: -280 },
      { x: -300, z: -280 },
      { x: -400, z: -100 },
      { x: -250, z: 100 },
      { x: -100, z: 120 },
      { x: 100, z: 100 },
      { x: 150, z: -20 },
      { x: 0, z: 0 }
    ]
  },
  {
    id: "sahara_sands",
    name: "Sahara Speeds",
    description: "Sun-drenched desert straightaways with occasional police blockades.",
    difficulty: "Medium",
    lengthMeters: 4000,
    laps: 2,
    bestTime: "2:15.00",
    imageSeed: "sahara_sands",
    surfaceFriction: 0.8,
    hasTraffic: false,
    hasPolice: true,
    width: 28,
    checkpoints: [
      { x: 0, z: -150 },
      { x: 150, z: -350 },
      { x: 400, z: -550 },
      { x: 650, z: -400 },
      { x: 750, z: -100 },
      { x: 550, z: 200 },
      { x: 300, z: 250 },
      { x: 100, z: 400 },
      { x: 0, z: 0 }
    ]
  },
  {
    id: "alpine_ridge",
    name: "Alpine Ridge Pass",
    description: "Steep mountain ranges, sweeping downhill cliffs, and razor-sharp S-turns.",
    difficulty: "Hard",
    lengthMeters: 4800,
    laps: 3,
    bestTime: "3:02.10",
    imageSeed: "alpine_ridge",
    surfaceFriction: 0.85,
    hasTraffic: true,
    hasPolice: true,
    width: 18,
    checkpoints: [
      { x: 0, z: -150 },
      { x: -200, z: -300 },
      { x: -450, z: -250 },
      { x: -600, z: -50 },
      { x: -500, z: 150 },
      { x: -300, z: 280 },
      { x: -100, z: 350 },
      { x: 100, z: 250 },
      { x: 0, z: 0 }
    ]
  },
  {
    id: "glacier_pass",
    name: "Frozen Glacier Pass",
    description: "Ultra-slippery, icy highways bordered by dangerous, massive snowdrifts.",
    difficulty: "Expert",
    lengthMeters: 3600,
    laps: 3,
    bestTime: "2:45.30",
    imageSeed: "glacier_pass",
    surfaceFriction: 0.5, // Low traction drift sliding surface
    hasTraffic: false,
    hasPolice: false,
    width: 20,
    checkpoints: [
      { x: 0, z: -100 },
      { x: 80, z: -220 },
      { x: 220, z: -300 },
      { x: 380, z: -200 },
      { x: 400, z: 10 },
      { x: 280, z: 160 },
      { x: 100, z: 180 },
      { x: 0, z: 0 }
    ]
  }
];

export const UPGRADE_PRICES = {
  speed: [1500, 3000, 4800, 7000, 9500, 12500, 16000, 20000, 25000],
  acceleration: [1200, 2400, 4000, 6000, 8200, 11000, 14000, 18000, 22000],
  handling: [1000, 2000, 3500, 5200, 7500, 10000, 13000, 16500, 21000],
  brakes: [800, 1600, 2800, 4400, 6200, 8500, 11000, 14500, 18500]
};

export const PAINT_COLORS = [
  { name: "Apex Indigo", hex: "#3b82f6" },
  { name: "Viper Red", hex: "#dc2626" },
  { name: "Hyper Purple", hex: "#a855f7" },
  { name: "Dune Green", hex: "#22c55e" },
  { name: "Tropic Yellow", hex: "#eab308" },
  { name: "Carbon Grey", hex: "#27272a" },
  { name: "Sunset Gold", hex: "#f97316" },
  { name: "Platinum Silver", hex: "#f3f4f6" },
  { name: "Cyber Pink", hex: "#ec4899" },
  { name: "Neon Cyan", hex: "#06b6d4" }
];

export const WHEEL_COLORS = [
  "#ffffff", // Chrome White
  "#000000", // Gloss Black
  "#d4af37", // Metallic Gold
  "#dc2626", // Racing Red
  "#06b6d4", // Sky Blue
  "#27272a"  // Gunmetal Gray
];

export const BOT_NAMES = [
  "SpeedDemon", "DriftKing", "TurboViper", "ShiftXER", "NitrousGhost",
  "AsphaltAngel", "ApexHunter", "GripMonster", "SlideMaster", "BurnoutBlitz",
  "VectorFlyer", "DuneReaper", "V8Lightning", "ChronoGlider", "Overdrive",
  "RedLineRider", "SkidRow", "NeonVortex", "CanyonCruiser", "MeteorMatch"
];

export const BOT_AVATAR_COLORS = [
  "bg-blue-600", "bg-red-600", "bg-purple-600", "bg-green-600",
  "bg-yellow-600", "bg-pink-600", "bg-teal-600", "bg-orange-500", "bg-indigo-600"
];

export const ACHIEVEMENTS_PRESETS: Achievement[] = [
  {
    id: "first_win",
    title: "Podium Champion",
    description: "Finish first place in any race.",
    unlocked: false,
    rewardDiamonds: 10,
    category: "wins"
  },
  {
    id: "drift_pro",
    title: "Sideways Pro",
    description: "Accumulate 3,000 drift points in a single race.",
    unlocked: false,
    rewardDiamonds: 15,
    category: "drifts"
  },
  {
    id: "speed_demon",
    title: "Sonic Speedster",
    description: "Reach a speed over 260 km/h.",
    unlocked: false,
    rewardDiamonds: 20,
    category: "speed"
  },
  {
    id: "max_upgrade",
    title: "Elite Mechanic",
    description: "Upgrade any car attribute to Level 10.",
    unlocked: false,
    rewardDiamonds: 25,
    category: "garage"
  },
  {
    id: "level_50",
    title: "Vanguard Driver",
    description: "Reach Player Level 30.",
    unlocked: false,
    rewardDiamonds: 40,
    category: "levels"
  }
];

export const PRESET_CHALLENGES = [
  { id: "dc1", description: "Earn 1,500 total drift points across any track.", target: 1500, current: 0, rewardCoins: 800, rewardXP: 150, isCompleted: false, isClaimed: false },
  { id: "dc2", description: "Compete and finish a race in Metropolis Grid.", target: 1, current: 0, rewardCoins: 1000, rewardXP: 200, isCompleted: false, isClaimed: false },
  { id: "dc3", description: "Accumulate 3 nitro boosts in Sahara Speeds.", target: 3, current: 0, rewardCoins: 1200, rewardXP: 250, isCompleted: false, isClaimed: false }
];
