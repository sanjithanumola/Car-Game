import { useState, useEffect } from "react";
import { UserProfile, Car, DailyChallenge, Achievement } from "./types";
import { CAR_PRESETS, TRACKS, ACHIEVEMENTS_PRESETS, PRESET_CHALLENGES } from "./carPresets";
import { Navigation } from "./components/Navigation";
import { RaceScreen } from "./components/RaceScreen";
import { GarageScreen } from "./components/GarageScreen";
import { LeaderboardScreen } from "./components/LeaderboardScreen";
import { ChallengesScreen } from "./components/ChallengesScreen";
import { FriendsScreen } from "./components/FriendsScreen";
import { GameAudio } from "./sound";
import { Play, Sparkles } from "lucide-react";

export default function App() {
  // 1. Core Persistent Profile State
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("apex_racing_profile");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return {
      username: "ProSpectre",
      level: 1,
      xp: 0,
      coins: 8500, // starting funds to buy tweaks and check upgrade system instantly
      diamonds: 15,
      currentCarId: "gt_eclipse",
      unlockedCarIds: ["gt_eclipse"],
      currentLeague: "Beginner",
      winsCount: 0,
      podiumsCount: 0,
      totalDriftsCount: 0,
      highestDriftScore: 0,
      dailyStreak: 1,
      lastDailyClaim: ""
    };
  });

  // 2. Core Persistent Cars customized statistics
  const [cars, setCars] = useState<Car[]>(() => {
    const saved = localStorage.getItem("apex_racing_cars");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return CAR_PRESETS;
  });

  // 3. Core Persistent Daily Challenges
  const [challenges, setChallenges] = useState<DailyChallenge[]>(() => {
    const saved = localStorage.getItem("apex_racing_challenges");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return PRESET_CHALLENGES;
  });

  // 4. Core Career Achievements list
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem("apex_racing_achievements");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return ACHIEVEMENTS_PRESETS;
  });

  const [activeTab, setActiveTab] = useState<string>("race");
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioInited, setIsAudioInited] = useState(false);

  // Synchronize overall state collections to LocalStorage
  useEffect(() => {
    localStorage.setItem("apex_racing_profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("apex_racing_cars", JSON.stringify(cars));
  }, [cars]);

  useEffect(() => {
    localStorage.setItem("apex_racing_challenges", JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    localStorage.setItem("apex_racing_achievements", JSON.stringify(achievements));
  }, [achievements]);

  // Handle Mute actions
  useEffect(() => {
    GameAudio.setMute(isMuted);
  }, [isMuted]);

  // Audio prompt loader to capture browser gesture limitations
  const ensureAudioIsStarted = () => {
    if (!isAudioInited) {
      GameAudio.init();
      setIsAudioInited(true);
    }
  };

  // Callback to selectequipped vehicle
  const handleSelectCar = (carId: string) => {
    ensureAudioIsStarted();
    setProfile(prev => ({
      ...prev,
      currentCarId: carId
    }));
  };

  // Callback to purchase car from showroom
  const handleUnlockCar = (carId: string, price: number) => {
    ensureAudioIsStarted();
    if (profile.coins >= price) {
      setProfile(prev => ({
        ...prev,
        coins: prev.coins - price,
        unlockedCarIds: [...prev.unlockedCarIds, carId]
      }));
      setCars(prev => prev.map(c => c.id === carId ? { ...c, isUnlocked: true } : c));
      GameAudio.triggerLevelUp(); // flash celebrate chime
    }
  };

  // Callback to apply performance modifications inside garage
  const handleUpgradeStat = (
    carId: string,
    statKey: "speed" | "acceleration" | "handling" | "brakes",
    cost: number
  ) => {
    ensureAudioIsStarted();
    if (profile.coins >= cost) {
      setProfile(prev => ({
        ...prev,
        coins: prev.coins - cost
      }));

      setCars(prev => prev.map(c => {
        if (c.id === carId) {
          const upgrades = { ...c.upgrades };
          if (statKey === "speed") upgrades.speedLevel = Math.min(10, upgrades.speedLevel + 1);
          if (statKey === "acceleration") upgrades.accelerationLevel = Math.min(10, upgrades.accelerationLevel + 1);
          if (statKey === "handling") upgrades.handlingLevel = Math.min(10, upgrades.handlingLevel + 1);
          if (statKey === "brakes") upgrades.brakesLevel = Math.min(10, upgrades.brakesLevel + 1);
          return { ...c, upgrades };
        }
        return c;
      }));
    }
  };

  // Callback to save metallic colors, spoiler, neon wrap adjustments
  const handleCustomizeCar = (carId: string, customConfig: Car["customization"]) => {
    setCars(prev => prev.map(c => c.id === carId ? { ...c, customization: customConfig } : c));
  };

  // Callback after successful match races completion payouts
  const handleRaceFinishRewards = (coinsEarned: number, xpEarned: number, driftPoints: number) => {
    ensureAudioIsStarted();

    // Calculate level ups up to Level 100
    let nextLevel = profile.level;
    let nextXp = profile.xp + xpEarned;
    let nextLevelXpThreshold = nextLevel * 1000;

    let leveledUp = false;
    while (nextXp >= nextLevelXpThreshold && nextLevel < 100) {
      nextXp -= nextLevelXpThreshold;
      nextLevel += 1;
      nextLevelXpThreshold = nextLevel * 1000;
      leveledUp = true;
    }

    if (leveledUp) {
      GameAudio.triggerLevelUp(); // Level Up melody Synthwave play
    }

    // Determine League Tiers based on level progression
    let league = profile.currentLeague;
    if (nextLevel >= 30) league = "Elite";
    else if (nextLevel >= 15) league = "Professional";
    else if (nextLevel >= 6) league = "Intermediate";

    // Track active objectives challenges updates
    setChallenges(prev => prev.map((ch) => {
      let updatedCount = ch.current;
      if (ch.id === "dc1") {
        // Drift points multiplier accumulator
        updatedCount = Math.min(ch.target, updatedCount + driftPoints);
      } else if (ch.id === "dc2") {
        // Completing Metropolis Grid matches
        updatedCount = Math.min(ch.target, updatedCount + 1);
      } else if (ch.id === "dc3") {
        // Boost triggers
        updatedCount = Math.min(ch.target, updatedCount + 2);
      }

      const isCompletedNow = updatedCount >= ch.target;
      return {
        ...ch,
        current: updatedCount,
        isCompleted: isCompletedNow
      };
    }));

    setProfile(prev => {
      const winsCountUpdate = prev.winsCount + (driftPoints > 100 ? 1 : 0); // simulated metrics
      const driftsCountUpdate = prev.totalDriftsCount + (driftPoints > 0 ? 1 : 0);
      const highDriftUpdated = Math.max(prev.highestDriftScore, driftPoints);

      return {
        ...prev,
        coins: prev.coins + coinsEarned,
        xp: nextXp,
        level: nextLevel,
        currentLeague: league,
        winsCount: winsCountUpdate,
        podiumsCount: prev.podiumsCount + 1,
        totalDriftsCount: driftsCountUpdate,
        highestDriftScore: highDriftUpdated
      };
    });

    // Check achievement completions
    setAchievements(prev => prev.map((ac) => {
      let unlocked = ac.unlocked;
      if (!unlocked) {
        if (ac.id === "first_win" && nextLevel >= 2) unlocked = true;
        if (ac.id === "drift_pro" && driftPoints >= 3000) unlocked = true;
        if (ac.id === "speed_demon" && driftPoints > 1000) unlocked = true; // proxy speeds target
        if (ac.id === "max_upgrade") {
          const carUpgradedMax = cars.some(c => 
            c.upgrades.speedLevel === 10 || 
            c.upgrades.accelerationLevel === 10 || 
            c.upgrades.handlingLevel === 10
          );
          if (carUpgradedMax) unlocked = true;
        }
        if (ac.id === "level_50" && nextLevel >= 30) unlocked = true;
      }
      return { ...ac, unlocked };
    }));
  };

  // Claim Daily quest reward coins
  const handleClaimReward = (challengeId: string, coins: number, xp: number) => {
    ensureAudioIsStarted();
    setChallenges(prev => prev.map(ch => ch.id === challengeId ? { ...ch, isClaimed: true } : ch));
    setProfile(prev => {
      let nextLevel = prev.level;
      let nextXp = prev.xp + xp;
      let nextThreshold = nextLevel * 1000;
      if (nextXp >= nextThreshold && nextLevel < 100) {
        nextXp -= nextThreshold;
        nextLevel += 1;
      }
      return {
        ...prev,
        coins: prev.coins + coins,
        xp: nextXp,
        level: nextLevel
      };
    });
    GameAudio.triggerCountdownBeep(true);
  };

  // Claim diamond achiever bonuses
  const handleClaimAchievement = (achId: string, diamonds: number) => {
    // claim markers
  };

  const equippedCar = cars.find(c => c.id === profile.currentCarId) || cars[0];

  return (
    <div className="w-full min-h-screen bg-slate-950 font-sans text-white flex flex-col selection:bg-rose-500 selection:text-white" onClick={ensureAudioIsStarted}>
      
      {/* Visual background ambient grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none select-none" />

      {/* Main Stats Header */}
      <Navigation
        profile={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
      />

      {/* Main Tabs dynamic Router body segment */}
      <main className="flex-1 relative z-10">
        
        {activeTab === "race" && (
          <RaceScreen
            currentCar={equippedCar}
            profile={profile}
            onRaceFinishRewards={handleRaceFinishRewards}
            isMuted={isMuted}
          />
        )}

        {activeTab === "garage" && (
          <GarageScreen
            carsList={cars}
            profile={profile}
            currentCarId={profile.currentCarId}
            onSelectCar={handleSelectCar}
            onUnlockCar={handleUnlockCar}
            onUpgradeStat={handleUpgradeStat}
            onCustomizeCar={handleCustomizeCar}
          />
        )}

        {activeTab === "leaderboard" && (
          <LeaderboardScreen
            profile={profile}
          />
        )}

        {activeTab === "challenges" && (
          <ChallengesScreen
            challengesList={challenges}
            achievementsList={achievements}
            profile={profile}
            onClaimReward={handleClaimReward}
            onClaimAchievement={handleClaimAchievement}
          />
        )}

        {activeTab === "friends" && (
          <FriendsScreen
            profile={profile}
          />
        )}

      </main>

      {/* Global minimal footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/70 p-4 shrink-0 text-center text-[10px] text-slate-500 font-mono">
        Apex Racing 3D | Proc-mesh engine | Optimized for React 19 and Three.js 60FPS
      </footer>
    </div>
  );
}
