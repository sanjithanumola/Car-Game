import React from "react";
import { DailyChallenge, UserProfile, Achievement } from "../types";
import { Award, CheckCircle, Zap, Shield, Sparkles, Star } from "lucide-react";

interface ChallengesScreenProps {
  challengesList: DailyChallenge[];
  achievementsList: Achievement[];
  profile: UserProfile;
  onClaimReward: (challengeId: string, coins: number, xp: number) => void;
  onClaimAchievement: (achievementId: string, diamonds: number) => void;
}

export const ChallengesScreen: React.FC<ChallengesScreenProps> = ({
  challengesList,
  achievementsList,
  profile,
  onClaimReward,
  onClaimAchievement
}) => {
  return (
    <div className="w-full flex flex-col min-h-[calc(100vh-140px)] bg-slate-950 p-4 font-sans text-white animate-fade-in">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column (Daily Objectives block) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 block mb-1">
              UPDATES REFRESH IN 16H
            </span>
            <h3 className="text-sm font-mono text-slate-300 font-extrabold uppercase tracking-widest">
              DAILY QUEST BOARD
            </h3>
          </div>

          <div className="flex flex-col gap-4">
            {challengesList.map((ch) => {
              const remains = ch.target - ch.current;
              const isFinished = ch.current >= ch.target;
              const progressPercentage = Math.min(100, Math.round((ch.current / ch.target) * 100));

              return (
                <div
                  key={ch.id}
                  className={`p-4 rounded-lg border flex flex-col gap-3 font-mono ${
                    ch.isClaimed
                      ? "bg-slate-950/40 border-slate-900 text-slate-500"
                      : isFinished
                      ? "bg-gradient-to-tr from-emerald-950/20 to-slate-900 border-emerald-500/50 text-slate-200"
                      : "bg-slate-900/60 border-slate-850 text-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-white leading-relaxed">{ch.description}</p>
                      <span className="text-[10px] text-indigo-400 mt-1 block">
                        Progress: {ch.current} / {ch.target}
                      </span>
                    </div>

                    {ch.isClaimed ? (
                      <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase font-bold">
                        Claimed
                      </span>
                    ) : isFinished ? (
                      <button
                        onClick={() => onClaimReward(ch.id, ch.rewardCoins, ch.rewardXP)}
                        className="py-1 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded font-sans font-extrabold cursor-pointer transition shadow text-[10px]"
                      >
                        CLAIM REWARD
                      </button>
                    ) : (
                      <span className="text-[9px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded uppercase">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Meter bar */}
                  {!ch.isClaimed && (
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <div>Coins: <strong className="text-yellow-400">C${ch.rewardCoins}</strong></div>
                    <div>XP: <strong className="text-emerald-400">+{ch.rewardXP}</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (Championship Leagues & Achievements lists) */}
        <div className="flex flex-col gap-6">
          
          {/* League status info card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl relative overflow-hidden flex items-center justify-between gap-4">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_100%_100%,rgba(244,63,94,0.08),transparent)]" />
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase">CURRENT GRAND SEASON</span>
              <h4 className="text-lg font-sans font-black uppercase text-white mt-0.5">
                {profile.currentLeague.toUpperCase()} BRACKET CHALLENGE
              </h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Acquire Level {profile.level >= 30 ? "Complete" : profile.level >= 15 ? "30 for Elite" : "15 for Pro"} to unlock next bracket league matches!
              </p>
            </div>
            <div className="p-3 bg-indigo-950 rounded-lg text-amber-400">
              <Star className="w-6 h-6 fill-amber-400" />
            </div>
          </div>

          {/* Achievements progress */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-mono text-slate-300 font-extrabold uppercase tracking-widest border-b border-slate-800 pb-3">
              CAREER DRIFT BADGES
            </h3>

            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto scrollbar-thin">
              {achievementsList.map((ac) => (
                <div
                  key={ac.id}
                  className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 font-mono text-xs ${
                    ac.unlocked
                      ? "bg-indigo-950/20 border-indigo-500/50 text-indigo-100"
                      : "bg-slate-900/60 border-slate-850 text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${ac.unlocked ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-950 text-slate-600"}`}>
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{ac.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{ac.description}</p>
                    </div>
                  </div>

                  {ac.unlocked ? (
                    <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/50 border border-cyan-800/40 px-2 py-0.5 rounded">
                      ♦ {ac.rewardDiamonds}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded">
                      LOCKED
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
