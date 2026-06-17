import React from "react";
import { UserProfile } from "../types";
import { Trophy, Award, Target, Hash, Info, Star } from "lucide-react";

interface LeaderboardScreenProps {
  profile: UserProfile;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ profile }) => {
  // Simulated global elite leaderboard records
  const globalLeaderboard = [
    { rank: 1, name: "DriftKing_X", level: 98, points: 142500, car: "Apex Vortex-X", avatar: "🥇" },
    { rank: 2, name: "OctaneShifter", level: 85, points: 121800, car: "Viper Interceptor", avatar: "🥈" },
    { rank: 3, name: "NitroSpecter", level: 78, points: 110400, car: "Apex Vortex-X", avatar: "🥉" },
    { rank: 4, name: "AsphaltTitan", level: 72, points: 95300, car: "V8 Charger", avatar: "👤" },
    { rank: 5, name: "GridDemon", level: 65, points: 88700, car: "Viper Interceptor", avatar: "👤" },
    { rank: 6, name: `${profile.username} (YOU)`, level: profile.level, points: profile.xp + profile.coins * 10, car: "GT Eclipse", avatar: "🏎️", isPlayer: true },
    { rank: 7, name: "V8Vanguard", level: 55, points: 64200, car: "V8 Charger", avatar: "👤" },
    { rank: 8, name: "CanyonGhost", level: 48, points: 51200, car: "Dune Raider 4x4", avatar: "👤" },
    { rank: 9, name: "ApexSlinger", level: 42, points: 39500, car: "GT Eclipse", avatar: "👤" },
    { rank: 10, name: "SkidRowBoss", level: 35, points: 27100, car: "Dune Raider 4x4", avatar: "👤" }
  ];

  // Sorting based on profile metrics
  const sortedLadder = [...globalLeaderboard].sort((a, b) => b.points - a.points);
  
  // Re-calculate ranks after injection
  const sortedWithRanks = sortedLadder.map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));

  const stats = [
    { label: "Wins/Podiums", value: `${profile.winsCount} / ${profile.podiumsCount}`, icon: Trophy, color: "text-amber-400" },
    { label: "Total Drifts", value: profile.totalDriftsCount.toLocaleString(), icon: Award, color: "text-cyan-400" },
    { label: "High Drift Score", value: profile.highestDriftScore.toLocaleString(), icon: Target, color: "text-rose-500" },
    { label: "Current League", value: profile.currentLeague.toUpperCase(), icon: Star, color: "text-purple-400" }
  ];

  return (
    <div className="w-full flex flex-col min-h-[calc(100vh-140px)] bg-slate-950 p-4 font-sans text-white animate-fade-in">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (1/3 Grid): Player career telemetry stats cards */}
        <div className="flex flex-col gap-5">
          <h3 className="text-xs font-mono text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-800 pb-3">
            DRIVER PROFILE telemetry
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            {stats.map((st) => {
              const IconComp = st.icon;
              return (
                <div key={st.label} className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex items-center gap-4">
                  <div className={`p-3 bg-slate-950 rounded-lg ${st.color}`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">{st.label}</span>
                    <strong className="text-base text-white tracking-wide">{st.value}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
              Global points are computed as: <strong>[Experience XP] + [Currency coins x 10]</strong>. Finish top podium spots inside Expert Glacier Pass or Mountain ranges to secure elite rating boosts!
            </p>
          </div>
        </div>

        {/* Right Column (2/3 Grid): Leaderboard listings */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-mono text-slate-400 font-extrabold uppercase tracking-widest">
              WORLD RACING CHAMPIONSHIPS LADDER
            </h3>
            <span className="text-[10px] font-mono text-indigo-400">SEASONAL DIVISIONS: LIVE</span>
          </div>

          <div className="flex flex-col gap-2">
            
            {/* Headers row */}
            <div className="grid grid-cols-12 px-3 text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider pb-1">
              <span className="col-span-1 text-center">Rank</span>
              <span className="col-span-5 text-left">Contestant</span>
              <span className="col-span-1 text-center">Level</span>
              <span className="col-span-3 text-right">Showroom Car</span>
              <span className="col-span-2 text-right">Apex Score</span>
            </div>

            {/* Rows list */}
            {sortedWithRanks.map((player) => (
              <div
                key={player.name}
                className={`grid grid-cols-12 p-3 rounded-lg items-center border font-mono text-xs transition duration-150 ${
                  player.isPlayer
                    ? "bg-indigo-950/40 border-indigo-500 text-white shadow-inner font-bold"
                    : "bg-slate-900/80 border-slate-850 text-slate-300 hover:border-slate-800"
                }`}
              >
                
                {/* Position */}
                <span className="col-span-1 text-center flex items-center justify-center font-bold">
                  {player.rank === 1 ? "🥇" : player.rank === 2 ? "🥈" : player.rank === 3 ? "🥉" : `#${player.rank}`}
                </span>

                {/* Name */}
                <span className="col-span-5 text-left flex items-center gap-1">
                  <span>{player.name}</span>
                </span>

                {/* Level */}
                <span className="col-span-1 text-center text-indigo-300">{player.level}</span>

                {/* Car */}
                <span className="col-span-3 text-right text-slate-400 text-[11px] font-sans italic">{player.car}</span>

                {/* score */}
                <span className="col-span-2 text-right text-yellow-500 font-sans font-bold">
                  {player.points.toLocaleString()}
                </span>

              </div>
            ))}

          </div>
        </div>

      </div>
    </div>
  );
};
