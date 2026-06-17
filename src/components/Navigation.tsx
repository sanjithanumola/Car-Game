import React from "react";
import { UserProfile } from "../types";
import { Trophy, Wrench, Play, Award, Users, Volume2, VolumeX, Sparkles, ShieldAlert } from "lucide-react";

interface NavigationProps {
  profile: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  profile,
  activeTab,
  setActiveTab,
  isMuted,
  setIsMuted
}) => {
  // Simple experience percentage calculation
  const nextLevelXp = profile.level * 1000;
  const xpPercentage = Math.min(100, Math.round((profile.xp / nextLevelXp) * 100));

  const getLeagueColor = (league: string) => {
    switch (league) {
      case "Elite": return "text-rose-500 from-rose-500/20 to-red-500/10 border-rose-500/50";
      case "Professional": return "text-amber-400 from-amber-500/20 to-yellow-500/10 border-amber-500/50";
      case "Intermediate": return "text-cyan-400 from-cyan-500/20 to-blue-500/10 border-cyan-500/50";
      default: return "text-slate-300 from-slate-500/20 to-slate-400/10 border-slate-500/50";
    }
  };

  const menuItems = [
    { id: "race", label: "Race Lobbies", icon: Play },
    { id: "garage", label: "The Garage", icon: Wrench },
    { id: "leaderboard", label: "Rankings", icon: Trophy },
    { id: "challenges", label: "Challenges", icon: Award },
    { id: "friends", label: "Crew & Voice", icon: Users }
  ];

  return (
    <header className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b-2 border-amber-500/30 p-4 sticky top-0 z-50 shadow-2xl relative">
      {/* Decorative top ambient glowing line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />
      
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand visual & title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-rose-600 rounded-lg shadow-lg shadow-rose-600/20 border border-white/10 animate-[pulse_3s_infinite]">
            <Sparkles className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-sans font-black text-white tracking-widest uppercase flex items-center gap-2">
              APEX RACING <span className="text-[10px] bg-amber-500 text-slate-950 font-mono px-1.5 py-0.5 rounded-sm tracking-normal capitalize font-black border border-white/20">3D COCKPIT</span>
            </h1>
            <p className="text-[9px] text-amber-500/80 font-mono uppercase tracking-widest font-black">Desert Fire & Neon Drift Matchmaker</p>
          </div>
        </div>

        {/* Level Progression Indicator up to Level 100 */}
        <div className="flex-1 max-w-sm w-full bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-mono mb-1.5">
            <span className="text-amber-400 font-extrabold flex items-center gap-1 uppercase tracking-wider">
              PILOT LEVEL {profile.level} <span className="text-slate-500 text-[9px]">(Max 100)</span>
            </span>
            <span className="text-slate-400 font-semibold">{profile.xp} / {nextLevelXp} XP</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div 
              className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${xpPercentage}%` }}
            />
          </div>
        </div>

        {/* Player League, Coins, Keys & Audio panel */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* League name badge */}
          <div className={`px-3 py-1.5 rounded-md border text-xs font-mono font-bold bg-gradient-to-r ${getLeagueColor(profile.currentLeague)} shadow-sm`}>
            {profile.currentLeague.toUpperCase()} BRACKET
          </div>

          {/* Money coins tracker */}
          <div className="bg-slate-950 px-3 py-1.5 rounded-md border border-slate-850 flex items-center gap-2 shadow-inner">
            <span className="text-amber-500 text-sm font-sans font-black">C$</span>
            <span className="text-white text-sm font-mono font-black tracking-wide">
              {profile.coins.toLocaleString()}
            </span>
          </div>

          {/* Diamonds items tracker */}
          <div className="bg-slate-950 px-3 py-1.5 rounded-md border border-slate-850 flex items-center gap-2 shadow-inner">
            <span className="text-cyan-400 text-sm font-black animate-pulse">♦</span>
            <span className="text-white text-sm font-mono font-black">
              {profile.diamonds}
            </span>
          </div>

          {/* Sound Toggle controls */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 cursor-pointer rounded-md bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition shadow"
            title={isMuted ? "Unmute sounds" : "Mute sounds"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

      </div>

      {/* Main Tabs Segment */}
      <div className="max-w-7xl mx-auto flex overflow-x-auto gap-2 mt-4 pt-1.5 border-t border-slate-800/60 scrollbar-none">
        {menuItems.map((item) => {
          const IconComp = item.icon;
          const isSelected = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-sans font-black tracking-wider uppercase transition duration-200 whitespace-nowrap cursor-pointer ${
                isSelected
                  ? "bg-slate-950 text-amber-500 border-2 border-amber-500 shadow-md transform scale-102 font-black"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-950/20"
              }`}
            >
              <IconComp className={`w-3.5 h-3.5 ${isSelected ? "text-amber-400" : "text-slate-500"}`} />
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
