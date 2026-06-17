import React, { useState, useEffect, useRef } from "react";
import { Track, Car, RaceOpponent, UserProfile } from "../types";
import { TRACKS, BOT_NAMES } from "../carPresets";
import { GameEngine } from "../gameEngine";
import { GameAudio } from "../sound";
import {
  Play, RotateCcw, Volume2, Shield, AlertTriangle, ChevronRight, Gauge, Zap,
  Activity, Radio, Compass, Sun, Eye, Sliders, Settings, BatteryCharging,
  Maximize2, Power, Music
} from "lucide-react";

interface RaceScreenProps {
  currentCar: Car;
  profile: UserProfile;
  onRaceFinishRewards: (coinsEarned: number, xpEarned: number, driftPoints: number) => void;
  isMuted: boolean;
}

export const RaceScreen: React.FC<RaceScreenProps> = ({
  currentCar,
  profile,
  onRaceFinishRewards,
  isMuted
}) => {
  // Lobbies & Selection states
  const [selectedTrack, setSelectedTrack] = useState<Track>(TRACKS[0]);
  const [isLobbyQueue, setIsLobbyQueue] = useState(false);
  const [isRaceStarted, setIsRaceStarted] = useState(false);

  // Matchmaking simulation parameters
  const [queueBots, setQueueBots] = useState<RaceOpponent[]>([]);
  const [matchingProgress, setMatchingProgress] = useState(0);

  // Active Race state
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [hudSpeed, setHudSpeed] = useState(0);
  const [hudNitro, setHudNitro] = useState(100);
  const [hudRank, setHudRank] = useState(20);
  const [hudLap, setHudLap] = useState(1);
  const [hudDriftScore, setHudDriftScore] = useState(0);
  const [hudDriftMult, setHudDriftMult] = useState(1.0);
  const [hudDriftAngle, setHudDriftAngle] = useState(0);
  const [collisionFlash, setCollisionFlash] = useState(false);
  const [activeCamera, setActiveCamera] = useState<"third_person" | "first_person" | "cockpit">("third_person");

  // Radio Console channels Simulation
  const [radioChannels, setRadioChannels] = useState([
    { name: "RETRONICS AMBIENT DETROIT 104.2", track: "Midnight Sunset Overdrive", bpm: "135 BPM" },
    { name: "APEX WAVE RIDER 98.8 FM", track: "Neon Blue Horizon Chords", bpm: "128 BPM" },
    { name: "PACIFIC COAST SHORE SYNTHS", track: "Suburban Outrun Overlap", bpm: "140 BPM" },
    { name: "CYBER DECAY ACID BEATS", track: "Chrome Sand Drifting Beat", bpm: "145 BPM" }
  ]);
  const [activeRadioIdx, setActiveRadioIdx] = useState(0);

  // Decorative Dashboard Dashboard Features
  const [currentGear, setCurrentGear] = useState<string>("1");
  const [isEngineStarted, setIsEngineStarted] = useState(true);
  const [isHazardActive, setIsHazardActive] = useState(false);
  const [isHighBeamsActive, setIsHighBeamsActive] = useState(true);

  // Real-time GPS Tracker state
  const [playerX, setPlayerX] = useState(0);
  const [playerZ, setPlayerZ] = useState(0);
  const [liveBots, setLiveBots] = useState<RaceOpponent[]>([]);

  // Chat/Audio Simulator text
  const [voiceMessages, setVoiceMessages] = useState<string[]>([
    "[Radio] Matchmaking complete. Prepare tires..."
  ]);

  // Race complete state
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalRank, setFinalRank] = useState(20);
  const [finalTime, setFinalTime] = useState("0:00.00");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Mobile/Steering state
  const [mobileSteering, setMobileSteering] = useState<"left" | "right" | null>(null);
  const [mobilePedal, setMobilePedal] = useState<"accel" | "brake" | null>(null);

  // Key tracking to feed engine
  const keysPressed = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
    nitro: false
  });

  // GPS Map Bounds Precomputation
  const checkpoints = selectedTrack.checkpoints;
  const xs = checkpoints.map(cp => cp.x);
  const zs = checkpoints.map(cp => cp.z);
  const minX = Math.min(...xs) - 80;
  const maxX = Math.max(...xs) + 80;
  const minZ = Math.min(...zs) - 80;
  const maxZ = Math.max(...zs) + 80;

  // Coordinate map to dynamic dimensions of 160x160 SVG viewport
  const mapX = (x: number) => {
    const range = maxX - minX || 1;
    return Math.max(10, Math.min(150, ((x - minX) / range) * 140 + 10));
  };
  const mapZ = (z: number) => {
    const range = maxZ - minZ || 1;
    return Math.max(10, Math.min(150, ((z - minZ) / range) * 140 + 10));
  };

  // Keyboard Event listeners binding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isRaceStarted || isCompleted) return;
      const key = e.key.toLowerCase();
      if (key === "w" || key === "arrowup") {
        keysPressed.current.forward = true;
        setMobilePedal("accel");
      }
      if (key === "s" || key === "arrowdown") {
        keysPressed.current.backward = true;
        setMobilePedal("brake");
      }
      if (key === "a" || key === "arrowleft") {
        keysPressed.current.left = true;
        setMobileSteering("left");
      }
      if (key === "d" || key === "arrowright") {
        keysPressed.current.right = true;
        setMobileSteering("right");
      }
      if (e.key === " ") keysPressed.current.drift = true;
      if (key === "shift") keysPressed.current.nitro = true;

      // Automatically engage gears based on speeds achieved
      if (hudSpeed > 210) setCurrentGear("6");
      else if (hudSpeed > 160) setCurrentGear("5");
      else if (hudSpeed > 110) setCurrentGear("4");
      else if (hudSpeed > 70) setCurrentGear("3");
      else if (hudSpeed > 30) setCurrentGear("2");
      else setCurrentGear("1");

      engineRef.current?.updateControls(
        keysPressed.current.forward,
        keysPressed.current.backward,
        keysPressed.current.left,
        keysPressed.current.right,
        keysPressed.current.drift,
        keysPressed.current.nitro
      );
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isRaceStarted || isCompleted) return;
      const key = e.key.toLowerCase();
      if (key === "w" || key === "arrowup") {
        keysPressed.current.forward = false;
        if (mobilePedal === "accel") setMobilePedal(null);
      }
      if (key === "s" || key === "arrowdown") {
        keysPressed.current.backward = false;
        if (mobilePedal === "brake") setMobilePedal(null);
      }
      if (key === "a" || key === "arrowleft") {
        keysPressed.current.left = false;
        if (mobileSteering === "left") setMobileSteering(null);
      }
      if (key === "d" || key === "arrowright") {
        keysPressed.current.right = false;
        if (mobileSteering === "right") setMobileSteering(null);
      }
      if (e.key === " ") keysPressed.current.drift = false;
      if (key === "shift") {
        keysPressed.current.nitro = false;
        engineRef.current?.stopNitro();
      }

      engineRef.current?.updateControls(
        keysPressed.current.forward,
        keysPressed.current.backward,
        keysPressed.current.left,
        keysPressed.current.right,
        keysPressed.current.drift,
        keysPressed.current.nitro
      );
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isRaceStarted, isCompleted, mobileSteering, mobilePedal, hudSpeed]);

  // Read telemetry metrics dynamically out of 3D frame cycles
  useEffect(() => {
    if (!isRaceStarted || isCompleted) return;

    const trackerInterval = setInterval(() => {
      if (engineRef.current) {
        setPlayerX(engineRef.current.getPlayerX());
        setPlayerZ(engineRef.current.getPlayerZ());
        setLiveBots(engineRef.current.getBotsState());
      }
    }, 150);

    return () => clearInterval(trackerInterval);
  }, [isRaceStarted, isCompleted]);

  // Queue up matchmaking for Solo Time Trial calibration
  const triggerMatchmaking = () => {
    setIsLobbyQueue(true);
    setMatchingProgress(0);

    // Empty array means no bot opponents (pure single-player solo trial)
    const opponents: RaceOpponent[] = [];
    setQueueBots(opponents);

    const interval = setInterval(() => {
      setMatchingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          startActiveRaceScene(opponents);
          return 100;
        }

        if (prev === 20) {
          addSystemLog(`Calibrating high-precision GPS connection... (Ping: 4ms)`);
        } else if (prev === 50) {
          addSystemLog(`Clearing loop lanes of all test traffic for solo attempt...`);
        } else if (prev === 85) {
          addSystemLog(`Supercharged Engine telemetry synchronized. Entering circuit.`);
        }

        return prev + 10;
      });
    }, 200);
  };

  const addSystemLog = (msg: string) => {
    setVoiceMessages(prev => [...prev.slice(-3), `[System] ${msg}`]);
  };

  const startActiveRaceScene = (opponents: RaceOpponent[]) => {
    setIsLobbyQueue(false);
    setIsRaceStarted(true);
    setIsCompleted(false);
    setHudRank(1); // Default solo rank is 1
    setHudLap(1);
    setHudDriftScore(0);
    setCurrentGear("1");

    addSystemLog(`Ignition active. Steering aligned. Turbo hyperdrive on standby.`);

    setTimeout(() => {
      if (!canvasRef.current) return;

      const engine = new GameEngine({
        canvas: canvasRef.current,
        track: selectedTrack,
        userCar: currentCar,
        opponentsList: opponents,
        onLapCompleted: (lapNum) => {
          setHudLap(lapNum);
          addSystemLog(`Lap ${lapNum} / ${selectedTrack.laps} started!`);
        },
        onCheckpointTriggered: () => {},
        onDriftScoreUpdate: (score, mult, angle) => {
          setHudDriftScore(score);
          setHudDriftMult(mult);
          setHudDriftAngle(angle);
        },
        onSpeedUpdate: (speed) => setHudSpeed(speed),
        onRankUpdate: (rank) => setHudRank(1), // Lock to rank 1 for time trials
        onNitroUpdate: (charge) => setHudNitro(charge),
        onCollisionOccurred: () => {
          setCollisionFlash(true);
          setTimeout(() => setCollisionFlash(false), 200);
        },
        onRaceFinished: (rank, time) => {
          setFinalRank(1); // Finished rank is always 1 for solo time trial
          setFinalTime(time);
          setIsCompleted(true);

          const placementBonusCoins = 3000; // Maximum grand podium bonus for 1st place!
          const pointsDrift = engine.getSessionDriftScore();
          const driftBonusCoins = Math.round(pointsDrift * 0.15);

          const totalEarnedCoins = placementBonusCoins + driftBonusCoins;
          const totalEarnedXp = 1500 + Math.round(pointsDrift * 0.05);

          onRaceFinishRewards(totalEarnedCoins, totalEarnedXp, pointsDrift);

          engine.cleanup();
          engineRef.current = null;
        }
      });

      engineRef.current = engine;
      setActiveCamera(engine.cameraView);

      let ticks = 3;
      setCountdown(ticks);
      GameAudio.triggerCountdownBeep(false);

      const countdownInt = setInterval(() => {
        ticks--;
        if (ticks > 0) {
          setCountdown(ticks);
          GameAudio.triggerCountdownBeep(false);
        } else if (ticks === 0) {
          setCountdown("GO!");
          GameAudio.triggerCountdownBeep(true);
          engine.startRaceCountdown();
        } else {
          setCountdown(null);
          clearInterval(countdownInt);
        }
      }, 1000);

    }, 100);
  };

  // Steer via click / tap zones on left/right side of interactive steering wheel
  const handleSteerStart = (steer: "left" | "right") => {
    if (!engineRef.current) return;
    setMobileSteering(steer);
    keysPressed.current.left = steer === "left";
    keysPressed.current.right = steer === "right";

    engineRef.current.updateControls(
      keysPressed.current.forward,
      keysPressed.current.backward,
      keysPressed.current.left,
      keysPressed.current.right,
      keysPressed.current.drift,
      keysPressed.current.nitro
    );
  };

  const handleSteerStop = () => {
    if (!engineRef.current) return;
    setMobileSteering(null);
    keysPressed.current.left = false;
    keysPressed.current.right = false;

    engineRef.current.updateControls(
      keysPressed.current.forward,
      keysPressed.current.backward,
      false,
      false,
      keysPressed.current.drift,
      keysPressed.current.nitro
    );
  };

  // Gas pedal pressed down
  const handlePedalStart = (pedal: "accel" | "brake") => {
    if (!engineRef.current) return;
    setMobilePedal(pedal);
    keysPressed.current.forward = pedal === "accel";
    keysPressed.current.backward = pedal === "brake";

    engineRef.current.updateControls(
      keysPressed.current.forward,
      keysPressed.current.backward,
      keysPressed.current.left,
      keysPressed.current.right,
      keysPressed.current.drift,
      keysPressed.current.nitro
    );
  };

  const handlePedalStop = () => {
    if (!engineRef.current) return;
    setMobilePedal(null);
    keysPressed.current.forward = false;
    keysPressed.current.backward = false;

    engineRef.current.updateControls(
      false,
      false,
      keysPressed.current.left,
      keysPressed.current.right,
      keysPressed.current.drift,
      keysPressed.current.nitro
    );
  };

  // Shift gears manually on the H-Pattern Gear stick gate
  const shiftManualGear = (gear: string) => {
    setCurrentGear(gear);
    GameAudio.triggerCountdownBeep(true);
  };

  // Radio Station Tuner click
  const tuneRadioRadio = (direction: "next" | "prev") => {
    GameAudio.triggerCountdownBeep(false);
    setActiveRadioIdx(prev => {
      let next = direction === "next" ? prev + 1 : prev - 1;
      if (next >= radioChannels.length) next = 0;
      if (next < 0) next = radioChannels.length - 1;
      return next;
    });
  };

  const switchCameraView = () => {
    if (engineRef.current) {
      engineRef.current.toggleCamera();
      setActiveCamera(engineRef.current.cameraView);
    }
  };

  const abandonRace = () => {
    engineRef.current?.cleanup();
    engineRef.current = null;
    setIsRaceStarted(false);
    setIsCompleted(false);
  };

  const activeRadio = radioChannels[activeRadioIdx];

  return (
    <div className={`w-full flex flex-col min-h-[calc(100vh-140px)] bg-slate-950 p-4 font-sans text-white transition-all duration-300 relative ${
      isHazardActive ? "ring-4 ring-rose-600/60 ring-inset" : ""
    }`}>

      {/* Decorative Warm Desert Sunset and copper overlays */}
      <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-amber-600/10 via-rose-500/5 to-transparent pointer-events-none" />

      {/* 1. Track Selection Screen */}
      {!isRaceStarted && (
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in relative z-10">

          {/* Left: Main Track Showcase card - styled with metallic copper hues */}
          <div className="lg:col-span-2 bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-600/30 rounded-xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-sm">
            
            {/* Glossy corner flare */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full filter blur-xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
                <span className="text-[11px] font-mono font-black tracking-widest text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                  APEX MULTIPLAYER CIRCUITS
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Total track laps: <strong className="text-white bg-slate-800 px-2 py-0.5 rounded-md font-sans text-xs">{selectedTrack.laps} Laps</strong>
                </span>
              </div>

              {/* Fake visual graphic representing chosen tracks */}
              <div className="h-64 rounded-xl bg-slate-950 mb-6 relative overflow-hidden flex flex-col items-center justify-center border border-slate-800 shadow-inner group">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.18),rgba(0,0,0,0))]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.05)_1px,transparent_1px)] bg-[size:15px_15px]" />

                {/* Road loop curved coordinate simulation path */}
                <svg className="w-48 h-48 animate-[spin_50s_linear_infinite] opacity-40 text-amber-500/50" viewBox="0 0 100 100">
                  <path
                    d="M50,15 C75,10 90,30 85,55 C80,80 65,95 45,85 C25,75 10,60 15,35 C20,10 25,20 50,15 Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="4,4"
                  />
                </svg>

                {/* Real-time map pins / records info wrapper */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-2 transform group-hover:scale-115 transition duration-300">
                    <Compass className="w-7 h-7 text-amber-400 animate-pulse" />
                  </div>
                  <span className="text-[10px] font-mono text-amber-500 tracking-widest font-black uppercase">
                    Stage Difficulty: {selectedTrack.difficulty}
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between bg-slate-900/90 backdrop-blur p-3 rounded-lg border border-slate-850">
                  <div>
                    <h3 className="text-base font-sans font-black uppercase text-amber-400 tracking-wider">
                      {selectedTrack.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Length: {selectedTrack.lengthMeters}m | Best Lap Record: {selectedTrack.bestTime}
                    </p>
                  </div>
                  {selectedTrack.hasPolice && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-950/80 text-rose-400 text-[9px] font-mono rounded border border-red-800 animate-pulse">
                      <Shield className="w-3 h-3 fill-rose-400/20" /> COPS ACTIVE
                    </div>
                  )}
                </div>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed mb-6 font-sans">
                {selectedTrack.description} Features deep red canyons, straight high-horsepower sprint zones, and extreme drift curves perfect for building point multipliers. Synchronized local server matchups supported.
              </p>
            </div>

            {/* Launch queue matchmaking button */}
            <button
              onClick={triggerMatchmaking}
              className="w-full bg-gradient-to-r from-amber-500 via-rose-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-sans font-black tracking-wider uppercase p-3.5 rounded-lg shadow-lg hover:shadow-orange-600/30 cursor-pointer flex items-center justify-center gap-2 transition duration-200 border-b-4 border-slate-950 text-xs"
            >
              <Play className="w-4 h-4 fill-white" />
              LOCK LOBBY MATCH & ENTER CAR STEERING PORT
            </button>
          </div>

          {/* Right: Available GP Stages deck */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-xs font-mono text-slate-300 font-extrabold uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-500" /> STAGE GP INDEX LIST
            </h3>

            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[300px] scrollbar-thin">
              {TRACKS.map((track) => {
                const isPicked = selectedTrack.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => setSelectedTrack(track)}
                    className={`p-3 rounded-lg border transition cursor-pointer flex flex-col gap-1 ${
                      isPicked
                        ? "bg-slate-950 border-amber-500 shadow-lg"
                        : "bg-slate-900/60 border-slate-850 hover:border-slate-800 hover:bg-slate-950/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-sans font-black tracking-wide ${isPicked ? "text-amber-400" : "text-white"}`}>
                        {track.name}
                      </span>
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                        track.difficulty === "Easy" ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/20" :
                        track.difficulty === "Medium" ? "bg-cyan-950/60 text-cyan-400 border border-cyan-800/20" :
                        track.difficulty === "Hard" ? "bg-amber-950/60 text-amber-400 border border-amber-800/20" : "bg-rose-950/60 text-rose-400 border border-rose-800/20"
                      }`}>
                        {track.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{track.lengthMeters} meters</span>
                      <span className="text-amber-500">Reward: C${Math.round(1500 * (track.difficulty === "Easy" ? 1 : track.difficulty === "Medium" ? 1.3 : 1.7))}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Configured Garage Spec card */}
            <div className="mt-auto bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
              <span className="text-[9px] text-amber-500 font-mono font-bold uppercase tracking-wider">ACTIVE SHOWROOM RIDE</span>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-sans font-black text-white">{currentCar.name}</h4>
                  <span className="text-[9px] text-slate-400 font-mono uppercase bg-slate-900 px-1.5 py-0.5 rounded tracking-widest mt-0.5 inline-block">
                    {currentCar.category}
                  </span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-400 font-mono">Index Score:</span>
                  <div className="font-bold text-amber-400 font-mono">
                    {currentCar.baseStats.speed + (currentCar.upgrades.speedLevel - 1) * 5}
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 2. Matchmaking Lobby queue animation */}
      {isLobbyQueue && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full p-8 bg-gradient-to-tr from-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl my-4 animate-scale-up shadow-2xl relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.06),transparent_80%)]" />
          
          {/* Animated speedometer spinning circle as matchmaking spinner */}
          <div className="w-20 h-20 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mb-6 flex items-center justify-center relative shadow-xl shadow-amber-500/10">
            <Gauge className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>

          <h2 className="text-lg font-sans font-black uppercase tracking-widest text-white text-center">
            GRID SERVER MATCHMAKING
          </h2>
          <p className="text-[10px] text-amber-500 font-mono mt-1 text-center mb-6 uppercase tracking-widest font-black">
            LATENCY SYNCING: 20 RACERS CONFIRMING
          </p>

          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-850 mb-6 relative">
            <div className="bg-gradient-to-r from-amber-500 via-rose-600 to-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${matchingProgress}%` }} />
          </div>

          <div className="w-full flex flex-col gap-2 bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-400 max-h-[130px] overflow-y-auto">
            {voiceMessages.map((msg, i) => <div key={i} className="leading-relaxed border-b border-slate-900/40 pb-1">{msg}</div>)}
          </div>
        </div>
      )}

      {/* 3. The Active 3D WebGL Canvas Racetrack & Immersive Console Overlays */}
      {isRaceStarted && !isCompleted && (
        <div className="flex-1 relative rounded-xl overflow-hidden border-2 border-amber-500/50 flex flex-col shadow-2xl bg-slate-950">

          {/* Main 3D WebGL Canvas element */}
          <canvas
            ref={canvasRef}
            className={`w-full h-[62vh] md:h-[72vh] block outline-none transition-all duration-100 ${
              collisionFlash ? "brightness-125 saturate-150 border-2 border-red-500 filter blur-xs" : ""
            }`}
          />

          {/* DYNAMIC GPS NAVIGATION MINIMAP (Top Right) */}
          <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur border-2 border-slate-800 p-2.5 rounded-lg shadow-xl w-44 pointer-events-none select-none z-30">
            <div className="flex items-center justify-between text-[8px] font-mono text-amber-500 font-bold uppercase tracking-wider mb-1.5 pb-1 border-b border-slate-800/70">
              <span className="flex items-center gap-1">📡 GPS GRID RADAR</span>
              <span className="text-slate-400 animate-pulse">LIVE</span>
            </div>
            
            {/* Renders the actual polyline tracks dynamically using precomputed coordinates bounds */}
            <div className="w-full h-32 bg-slate-950/90 rounded border border-slate-850 overflow-hidden relative">
              <svg className="w-full h-full p-2" viewBox="0 0 160 160">
                {/* Connecting checkpoints polyline trail */}
                <polyline
                  points={checkpoints.map(cp => `${mapX(cp.x)},${mapZ(cp.z)}`).join(" ")}
                  fill="none"
                  stroke="#fb923c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-70"
                />

                {/* Live bots blue dots */}
                {liveBots.map((bot) => (
                  <circle
                    key={bot.id}
                    cx={mapX(bot.x)}
                    cy={mapZ(bot.z)}
                    r="3.5"
                    fill="#38bdf8"
                    className="transition-all duration-150"
                  />
                ))}

                {/* User red blinking dot on coordinate */}
                <circle
                  cx={mapX(playerX)}
                  cy={mapZ(playerZ)}
                  r="5.5"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="animate-pulse"
                />
              </svg>

              {/* Minimal coordinate telemetry overlay */}
              <div className="absolute bottom-1 left-1 right-1 flex justify-between font-mono text-[6px] text-slate-500 bg-slate-950/90 px-1 py-0.5 rounded">
                <span>Lat: {Math.round(playerX)}</span>
                <span>Lng: {Math.round(playerZ)}</span>
              </div>
            </div>
          </div>

          {/* THREE-STAGE START TRAFFIC SIGNAL TOWER (Top Left) */}
          <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-800 p-2 rounded-md shadow-lg flex flex-col items-center gap-1.5 z-30 pointer-events-none select-none">
            <span className="text-[7px] font-mono text-slate-400 font-bold uppercase tracking-widest block border-b border-slate-800/60 pb-1 text-center w-full">GRID</span>
            
            {/* Traffic Signal Brackets */}
            <div className="w-6 py-2.5 px-1 bg-slate-950 rounded-full border border-slate-800 flex flex-col gap-2 items-center shadow-inner">
              
              {/* TOP RED LAMP (Stays solid if countdown is active or matching) */}
              <div className={`w-3.5 h-3.5 rounded-full transition duration-300 ${
                countdown === 3 || countdown === 2 || countdown === 1 || !countdown && !countdown
                  ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                  : "bg-red-950"
              }`} />

              {/* MIDDLE YELLOW LAMP (Flashes during active countdown stages) */}
              <div className={`w-3.5 h-3.5 rounded-full transition duration-300 ${
                countdown === 3 || countdown === 2 || countdown === 1
                  ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse"
                  : "bg-amber-950"
              }`} />

              {/* BOTTOM GREEN LAMP (Fully shining laser color when GO!/Active) */}
              <div className={`w-3.5 h-3.5 rounded-full transition duration-300 ${
                countdown === "GO!" || !countdown
                  ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]"
                  : "bg-emerald-950"
              }`} />

            </div>
          </div>

          {/* SPEEDOMETER & GEAR MULTIPLEX HUD (Top Center) */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border-2 border-slate-800 px-6 py-2 rounded-xl flex items-center justify-between gap-6 shadow-2xl z-25 min-w-[210px] pointer-events-none select-none">
            {/* Speed numbers block */}
            <div>
              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest font-bold">VELOCITY METERS</span>
              <div className="text-3xl font-mono font-black italic text-white flex items-baseline gap-1 mt-0.5 leading-none">
                {hudSpeed} <span className="text-xs text-amber-500 font-normal tracking-wide italic">KM/H</span>
              </div>
            </div>

            {/* Gear digit indicator block */}
            <div className="text-center bg-slate-950 border border-slate-800/80 px-2.5 py-1 rounded-md text-amber-400 flex flex-col items-center">
              <span className="text-[6px] font-mono text-slate-500 uppercase tracking-widest">DRIVE_GEAR</span>
              <span className="text-base font-mono font-black">{currentGear}</span>
            </div>

            {/* Best Target Lap Record score */}
            <div className="text-right">
              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest font-bold">RECORD TARGET</span>
              <div className="text-sm font-sans font-black text-amber-500 leading-none mt-1.5 uppercase">
                {selectedTrack.bestTime}
              </div>
            </div>
          </div>

          {/* ACTIVE LAP NUMBER BAR (Middle Left) */}
          <div className="absolute top-24 left-4 bg-slate-900/95 backdrop-blur border border-slate-800 p-2.5 rounded-lg shadow-lg max-w-[130px] z-20 pointer-events-none select-none">
            <span className="text-[8px] font-mono text-slate-400 uppercase font-bold block">CIRCUIT PROGRESS</span>
            <div className="text-sm font-sans font-black text-white mt-0.5">
              LAP {hudLap} <span className="text-slate-500 text-xs text-normal">/ {selectedTrack.laps}</span>
            </div>
          </div>

          {/* Central match Countdown text overlays */}
          {countdown && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none select-none z-40 animate-fade-in">
              <div className="text-7xl md:text-9xl font-mono font-black tracking-widest text-center text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-bounce">
                {countdown}
              </div>
            </div>
          )}

          {/* Drift bonus popups overlay */}
          {hudDriftScore > 30 && (
            <div className="absolute top-36 left-1/2 -translate-x-1/2 bg-slate-950 border-2 border-amber-500 px-4 py-2 rounded-lg text-center pointer-events-none animate-bounce font-mono z-30 shadow-2xl shadow-orange-500/20">
              <div className="text-[9px] text-amber-400 font-bold uppercase tracking-widest animate-pulse">✦ SIDEWAY DRIFT TRICK ✦</div>
              <div className="text-2xl font-black mt-0.5 text-white">+{hudDriftScore}</div>
              <div className="text-[10px] text-slate-405 mt-0.5 font-bold">Bonus Multiplier: <strong className="text-emerald-400">x{hudDriftMult}</strong></div>
            </div>
          )}

          {/* COP INBOUND WARNING GRID FLAG */}
          {selectedTrack.hasPolice && hudRank < 8 && (
            <div className="absolute top-28 left-4 flex items-center gap-2 bg-red-950/90 border-2 border-red-800 px-3 py-1.5 rounded-lg text-rose-400 animate-pulse pointer-events-none select-none max-w-xs font-mono text-[10px] z-20">
              <Shield className="w-3.5 h-3.5 text-rose-500 animate-[spin_4s_linear_infinite]" />
              <span className="font-extrabold tracking-tight">COP ROAD BARRICADE CONFIRMED INBOUND!</span>
            </div>
          )}

          {/* LEFT COLUMN: INTERACTIVE ROUND METALLIC OVERLAY BUTTONS (Console decor) */}
          <div className="absolute left-4 bottom-28 flex flex-col gap-2.5 z-35 bg-slate-900/60 p-2 rounded-xl border border-slate-800/50 backdrop-blur-sm">
            
            {/* SPARK IGNITION KEY PULSING ENGINE STARTER */}
            <button
              onClick={() => {
                setIsEngineStarted(!isEngineStarted);
                GameAudio.triggerCountdownBeep(isEngineStarted);
              }}
              className={`w-11 h-11 rounded-full border-2 flex items-center justify-center cursor-pointer shadow-lg transition active:scale-95 ${
                isEngineStarted
                  ? "bg-emerald-950 border-emerald-450 text-emerald-400 shadow-emerald-500/20 animate-pulse"
                  : "bg-red-950 border-red-800 text-rose-500"
              }`}
              title="Toggle Simulated High-Torque Spark Engine Ignition"
            >
              <Power className="w-5 h-5" />
            </button>

            {/* EMERGENCY HAZARD BLINKERS toggle */}
            <button
              onClick={() => {
                setIsHazardActive(!isHazardActive);
                GameAudio.triggerCountdownBeep(true);
              }}
              className={`w-11 h-11 rounded-full border-2 flex items-center justify-center cursor-pointer shadow-lg transition active:scale-95 ${
                isHazardActive
                  ? "bg-amber-950 border-amber-500 text-amber-400 animate-[bounce_1.5s_infinite]"
                  : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
              title="Activate High-Threat Emergency Hazard Lights"
            >
              <AlertTriangle className="w-5 h-5 fill-current" />
            </button>

            {/* DEVIANCE HEADLIGHTS HIGH BEAMS */}
            <button
              onClick={() => {
                setIsHighBeamsActive(!isHighBeamsActive);
                GameAudio.triggerCountdownBeep(false);
              }}
              className={`w-11 h-11 rounded-full border-2 flex items-center justify-center cursor-pointer shadow-lg transition active:scale-95 ${
                isHighBeamsActive
                  ? "bg-indigo-950 border-indigo-400 text-indigo-400"
                  : "bg-slate-950 border-slate-800 text-slate-500"
              }`}
              title="Toggle Chassis LED Beam Intensity"
            >
              <Sun className="w-5 h-5" />
            </button>
          </div>

          {/* HUD RADIO CONTROLLER (Bottom Left, above steering wheel) */}
          <div className="absolute left-4 bottom-[280px] bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-lg p-2 flex items-center gap-3 w-44 z-30 select-none shadow-xl">
            <button
              onClick={() => tuneRadioRadio("prev")}
              className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 text-xs rounded font-mono font-black"
              title="Scan prev frequency"
            >
              ◀
            </button>

            <div className="flex-1 min-w-0 filter">
              <span className="text-[7px] font-mono text-indigo-400 block tracking-widest font-black uppercase">
                {activeRadio.name}
              </span>
              <p className="text-[9px] font-sans font-extrabold text-white truncate my-0.5 flex items-center gap-1">
                <Music className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                {activeRadio.track}
              </p>
              <span className="text-[7px] font-mono text-slate-500 block">
                {activeRadio.bpm} Loop Synth
              </span>
            </div>

            <button
              onClick={() => tuneRadioRadio("next")}
              className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 text-xs rounded font-mono font-black"
              title="Scan next frequency"
            >
              ▶
            </button>
          </div>

          {/* NITRO BOOST SPEED GAUGE (Bottom Center Overlay) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none select-none flex flex-col gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-850 p-3 rounded-xl min-w-[200px] z-25 text-left shadow-2xl">
            <div className="flex items-center justify-between text-[10px] font-mono font-black">
              <span className="text-cyan-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-cyan-400/20" /> CYBER NITROUS SYSTEM
              </span>
              <span className="text-white">{Math.round(hudNitro)}%</span>
            </div>
            <div className="w-full bg-slate-950 border border-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full rounded-full transition-all duration-100"
                style={{ width: `${hudNitro}%` }}
              />
            </div>
            <span className="text-[7px] text-slate-500 font-mono uppercase tracking-wider block">
              Hold [SHIFT] key or click boost center pedal to inject octane
            </span>
          </div>

          {/* INTERACTIVE 3D STEERING WHEEL HUD (Bottom Left) */}
          <div className="absolute bottom-4 left-4 z-40 select-none flex flex-col items-center gap-1.5">
            <span className="text-[7px] font-mono font-bold tracking-widest text-slate-400 uppercase block">DRIVE STEER AXIS</span>
            
            <div 
              className="w-24 h-24 rounded-full border-4 border-slate-800 bg-slate-950 relative flex items-center justify-center shadow-2xl cursor-grab active:cursor-grabbing transform transition-transform duration-100"
              style={{
                transform: `rotate(${mobileSteering === "left" ? -40 : mobileSteering === "right" ? 40 : 0}deg)`,
                backgroundImage: "radial-gradient(circle, #1e293b 20%, #020617 80%)"
              }}
            >
              {/* Outer rubber grips */}
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-slate-800 opacity-40" />

              {/* Central metal spokes structure */}
              <div className="absolute w-full h-1.5 bg-slate-800" />
              <div className="absolute h-full w-1.5 bg-slate-800" />

              {/* Center shiny metallic cap with Apex brand */}
              <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-amber-500 flex items-center justify-center font-mono text-[7px] font-black text-amber-400 tracking-wider shadow-md">
                APEX
              </div>

              {/* Click-to-steer sectors: mouse zones */}
              <div
                onMouseDown={() => handleSteerStart("left")}
                onMouseUp={handleSteerStop}
                onMouseLeave={handleSteerStop}
                onTouchStart={() => handleSteerStart("left")}
                onTouchEnd={handleSteerStop}
                className="absolute left-0 top-0 bottom-0 w-1/2 cursor-pointer rounded-l-full"
                title="Steer sports car Left"
              />
              <div
                onMouseDown={() => handleSteerStart("right")}
                onMouseUp={handleSteerStop}
                onMouseLeave={handleSteerStop}
                onTouchStart={() => handleSteerStart("right")}
                onTouchEnd={handleSteerStop}
                className="absolute right-0 top-0 bottom-0 w-1/2 cursor-pointer rounded-r-full"
                title="Steer sports car Right"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onMouseDown={() => handleSteerStart("left")}
                onMouseUp={handleSteerStop}
                onTouchStart={() => handleSteerStart("left")}
                onTouchEnd={handleSteerStop}
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border transition ${
                  mobileSteering === "left" ? "bg-amber-500 border-white text-slate-950" : "bg-slate-950/80 border-slate-800 text-slate-400"
                }`}
              >
                ◀ LEFT (A)
              </button>
              <button
                onMouseDown={() => handleSteerStart("right")}
                onMouseUp={handleSteerStop}
                onTouchStart={() => handleSteerStart("right")}
                onTouchEnd={handleSteerStop}
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border transition ${
                  mobileSteering === "right" ? "bg-amber-500 border-white text-slate-950" : "bg-slate-950/80 border-slate-800 text-slate-400"
                }`}
              >
                RIGHT (D) ▶
              </button>
            </div>
          </div>

          {/* DUAL HIGH-FIDELITY PEDAL BOARD (Bottom Right) */}
          <div className="absolute bottom-4 right-4 z-40 select-none flex items-end gap-3.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
            
            {/* WIDE METAL BRAKE PEDAL */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[7px] font-mono text-slate-500 font-bold uppercase block">BRK_PDS</span>
              <button
                onMouseDown={() => handlePedalStart("brake")}
                onMouseUp={handlePedalStop}
                onMouseLeave={handlePedalStop}
                onTouchStart={() => handlePedalStart("brake")}
                onTouchEnd={handlePedalStop}
                className={`w-12 h-16 rounded-lg border-2 flex flex-col justify-between items-center py-2 transition shadow-xl cursor-pointer ${
                  mobilePedal === "brake"
                    ? "bg-rose-950 border-rose-500 text-rose-400 shadow-rose-600/30 -translate-y-1"
                    : "bg-slate-900 border-slate-750 text-slate-400 hover:border-slate-700"
                }`}
                style={{
                  backgroundImage: "linear-gradient(to bottom, #111827, #1f2937 40%, #111827)"
                }}
              >
                {/* Friction circles dots */}
                <div className="grid grid-cols-2 gap-1 opacity-70">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                </div>
                <span className="text-[8px] font-mono font-black select-none leading-none tracking-tight">BRAKE</span>
              </button>
            </div>

            {/* TALL STEEL ACCELERATOR/THROTTLE PEDAL */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[7px] font-mono text-slate-500 font-bold uppercase block">THR_ACCEL</span>
              <button
                onMouseDown={() => handlePedalStart("accel")}
                onMouseUp={handlePedalStop}
                onMouseLeave={handlePedalStop}
                onTouchStart={() => handlePedalStart("accel")}
                onTouchEnd={handlePedalStop}
                className={`w-10 h-20 rounded-lg border-2 flex flex-col justify-between items-center py-2 transition shadow-xl cursor-pointer ${
                  mobilePedal === "accel"
                    ? "bg-amber-950 border-amber-500 text-amber-400 shadow-orange-500/30 -translate-y-1"
                    : "bg-slate-900 border-slate-750 text-slate-400 hover:border-slate-700"
                }`}
                style={{
                  backgroundImage: "linear-gradient(to bottom, #111827, #1f2937 40%, #111827)"
                }}
              >
                {/* Ribbed lines */}
                <div className="flex flex-col gap-1 w-4 opacity-50">
                  <div className="h-0.5 w-full bg-slate-450" />
                  <div className="h-0.5 w-full bg-slate-450" />
                  <div className="h-0.5 w-full bg-slate-450" />
                  <div className="h-0.5 w-full bg-slate-450" />
                </div>
                <span className="text-[8px] font-mono font-black select-none leading-none tracking-tight">GAS</span>
              </button>
            </div>

          </div>

          {/* MANUAL H-PATTERN GEAR SHIFT STICK GATE (Bottom Right, next to pedals) */}
          <div className="absolute bottom-4 right-32 z-40 select-none bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 shadow-xl w-32 flex flex-col items-center">
            <span className="text-[7px] font-mono text-amber-500 tracking-wider font-bold uppercase block mb-1">H-GATE MANUAL SHIFT</span>
            
            {/* Standard 6-Gear H pattern gate paths visual */}
            <div className="grid grid-cols-3 gap-y-2.5 gap-x-1 font-mono text-[10px] text-center relative py-1">
              
              {/* Gears 1 - 3 - 5 top */}
              <button
                onClick={() => shiftManualGear("1")}
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold transition duration-150 border cursor-pointer ${
                  currentGear === "1" ? "bg-amber-500 border-white text-slate-950 font-black shadow-lg shadow-amber-500/20" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                1
              </button>
              <button
                onClick={() => shiftManualGear("3")}
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold transition duration-150 border cursor-pointer ${
                  currentGear === "3" ? "bg-amber-500 border-white text-slate-950 font-black shadow-lg shadow-amber-500/20" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                3
              </button>
              <button
                onClick={() => shiftManualGear("5")}
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold transition duration-150 border cursor-pointer ${
                  currentGear === "5" ? "bg-amber-500 border-white text-slate-950 font-black shadow-lg shadow-amber-500/20" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                5
              </button>

              {/* Neutral Center connectivity line */}
              <div className="col-span-3 h-1 bg-slate-800 rounded my-0.5 flex items-center justify-center">
                <span className="text-[6px] text-slate-500 px-1 bg-slate-900 border border-slate-800 rounded uppercase font-black tracking-widest scale-85">NEUTRAL</span>
              </div>

              {/* Gears 2 - 4 - Reverse bottom */}
              <button
                onClick={() => shiftManualGear("2")}
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold transition duration-150 border cursor-pointer ${
                  currentGear === "2" ? "bg-amber-500 border-white text-slate-950 font-black shadow-lg shadow-amber-500/20" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                2
              </button>
              <button
                onClick={() => shiftManualGear("4")}
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold transition duration-150 border cursor-pointer ${
                  currentGear === "4" ? "bg-amber-500 border-white text-slate-950 font-black shadow-lg shadow-amber-500/20" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                4
              </button>
              <button
                onClick={() => shiftManualGear("R")}
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold transition duration-150 border cursor-pointer ${
                  currentGear === "R" ? "bg-rose-600 border-white text-white font-black shadow-lg" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-750"
                }`}
              >
                R
              </button>

            </div>
          </div>

          {/* Floating Actions overlay bottom right */}
          <div className="absolute top-4 left-[140px] flex items-center gap-2 z-20">
            <button
              onClick={switchCameraView}
              className="px-2 py-1 bg-slate-900/90 backdrop-blur hover:bg-slate-800 border-2 border-slate-800 text-indigo-400 hover:text-white rounded font-mono text-[9px] cursor-pointer shadow-lg"
              title="Change camera view angle"
            >
              CAMERA: {activeCamera === "third_person" ? "REAR" : activeCamera === "first_person" ? "HOOD" : "COCKPIT"}
            </button>
            <button
              onClick={abandonRace}
              className="px-2 py-1 bg-red-950/90 backdrop-blur hover:bg-rose-950 border border-red-800 text-rose-450 rounded font-mono text-[9px] cursor-pointer shadow-lg"
            >
              ABANDON
            </button>
          </div>

          <div className="bg-slate-950 p-2 border-t border-slate-800 text-[10px] text-slate-400 font-mono mt-auto relative z-10">
            <span className="text-amber-500 font-extrabold mr-1 shadow-sm px-1.5 py-0.5 rounded uppercase bg-amber-500/10">PRO METHOD:</span>
            <span>Desktop setup: A/D and Arrow Keys. Spacebar is handbrake drift sideways. Shift triggers octane boosts while moving forward.</span>
          </div>
        </div>
      )}

      {/* 4. Post-Race Podium Game Over results scoreboard */}
      {isCompleted && (
        <div className="max-w-2xl mx-auto w-full p-8 bg-slate-900 border-2 border-amber-500/60 rounded-2xl flex flex-col items-center justify-center text-center animate-scale-up shadow-2xl relative z-10 backdrop-blur">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08),transparent_80%)]" />
          
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4 animate-bounce border-2 border-white uppercase tracking-wider">
            SOLO
          </div>

          <h2 className="text-xl font-sans font-black uppercase tracking-widest text-amber-400 mb-1">
            CIRCUIT TIME TRIAL COMPLETED!
          </h2>
          <p className="text-xs text-indigo-400 font-mono mb-6 uppercase tracking-wider">
            GPS RECORD TIME: <strong className="text-white bg-slate-950 px-2.5 py-1 rounded border border-slate-850 font-sans text-xs">{finalTime}</strong> in {selectedTrack.name}
          </p>

          <div className="w-full grid grid-cols-2 gap-4 bg-slate-950 p-5 rounded-xl border border-slate-850 text-left mb-6 font-mono">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Placement Rewards</span>
              <div className="text-lg font-bold text-yellow-400 mt-1 flex items-baseline gap-1">
                +C$ {Math.max(200, (21 - finalRank) * 150)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">XP Achievements</span>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                +{Math.max(100, (21 - finalRank) * 80)} XP
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setIsRaceStarted(false);
              setIsCompleted(false);
            }}
            className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-sans font-bold tracking-widest uppercase rounded-lg shadow-md cursor-pointer transition text-xs"
          >
            CONFIRM OUTCOMES & RE-ENTER LOBBIES
          </button>
        </div>
      )}

    </div>
  );
};
