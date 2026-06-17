export enum CarCategory {
  SPORTS = "Sports",
  SUPERCAR = "Supercar",
  HYPERCAR = "Hypercar",
  MUSCLE = "Muscle",
  OFF_ROAD = "Off-Road"
}

export interface CarStats {
  speed: number;       // 1 - 100 base
  acceleration: number;// 1 - 100 base
  handling: number;    // 1 - 100 base
  brakes: number;      // 1 - 100 base
}

export interface CarUpgrades {
  speedLevel: number;       // 1 to 10
  accelerationLevel: number;// 1 to 10
  handlingLevel: number;    // 1 to 10
  brakesLevel: number;      // 1 to 10
}

export interface CarCustomization {
  paintColor: string; // hex
  wheelStyle: "classic" | "sport" | "carbon" | "chrome";
  wheelColor: string; // hex
  spoilerStyle: "none" | "low" | "wing" | "gt";
  decalStyle: "none" | "stripes" | "flames" | "neon_lines" | "tribal";
  decalColor: string; // hex
  neonUnderglow: "none" | "blue" | "red" | "green" | "pink" | "gold";
}

export interface Car {
  id: string;
  name: string;
  category: CarCategory;
  price: number;
  baseStats: CarStats;
  upgrades: CarUpgrades;
  customization: CarCustomization;
  isUnlocked: boolean;
  imageSeed: string; // used for visual generation/representation
}

export interface TrackCheckPoint {
  x: number;
  z: number;
}

export interface Track {
  id: string;
  name: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  lengthMeters: number;
  laps: number;
  bestTime: string;
  imageSeed: string;
  surfaceFriction: number; // 0.5 (snow) to 1.0 (highway/dry)
  hasTraffic: boolean;
  hasPolice: boolean;
  checkpoints: TrackCheckPoint[];
  width: number;
}

export interface RaceOpponent {
  id: string;
  name: string;
  carName: string;
  carColor: string;
  skill: number; // 0.1 to 1.0
  isBot: boolean;
  speedMultiplier: number;
  avatarSeed: string;
  // Dynamic race state tracking
  lap: number;
  checkpointIndex: number;
  distanceAlongTrack: number; // calculated for positioning
  currentSpeed: number;
  driftAngle: number;
  x: number;
  z: number;
  finished: boolean;
  finishTime?: string;
}

export interface UserProfile {
  username: string;
  level: number; // 1 - 100
  xp: number;
  coins: number;
  diamonds: number;
  currentCarId: string;
  unlockedCarIds: string[];
  currentLeague: "Beginner" | "Intermediate" | "Professional" | "Elite";
  winsCount: number;
  podiumsCount: number;
  totalDriftsCount: number;
  highestDriftScore: number;
  dailyStreak: number;
  lastDailyClaim: string; // ISO string
}

export interface DailyChallenge {
  id: string;
  description: string;
  target: number;
  current: number;
  rewardCoins: number;
  rewardXP: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface Friend {
  id: string;
  name: string;
  avatarSeed: string;
  level: number;
  status: "online" | "racing" | "offline";
  isVoiceMuted: boolean;
  chatHistory: { sender: "user" | "friend"; text: string; timestamp: string }[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  rewardDiamonds: number;
  category: "drifts" | "speed" | "wins" | "levels" | "garage";
}
