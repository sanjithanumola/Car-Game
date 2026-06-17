import React, { useState } from "react";
import { Car, UserProfile, CarCategory } from "../types";
import { CAR_PRESETS, PAINT_COLORS, WHEEL_COLORS, UPGRADE_PRICES } from "../carPresets";
import { GameAudio } from "../sound";
import { Sparkles, Hammer, Palette, ArrowRight, Zap, Flame, ShieldAlert, BadgeCheck } from "lucide-react";

interface GarageScreenProps {
  carsList: Car[];
  profile: UserProfile;
  currentCarId: string;
  onUnlockCar: (carId: string, price: number) => void;
  onSelectCar: (carId: string) => void;
  onUpgradeStat: (carId: string, statKey: "speed" | "acceleration" | "handling" | "brakes", cost: number) => void;
  onCustomizeCar: (carId: string, customConfig: Car["customization"]) => void;
}

export const GarageScreen: React.FC<GarageScreenProps> = ({
  carsList,
  profile,
  currentCarId,
  onUnlockCar,
  onSelectCar,
  onUpgradeStat,
  onCustomizeCar
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"specs" | "paint" | "fenders">("specs");

  // Keep track of the selected car in the showroom (default to active equipped car)
  const [showroomCarId, setShowroomCarId] = useState(currentCarId);
  const selectedCar = carsList.find(c => c.id === showroomCarId) || carsList[0];

  const paintColors = PAINT_COLORS;
  const wheelColors = WHEEL_COLORS;

  const isEquipped = selectedCar.id === currentCarId;

  // Calculate current effective stat levels
  const getStatTotalValue = (base: number, lvl: number) => {
    return Math.min(100, base + (lvl - 1) * 5);
  };

  const getUpgradeCost = (key: "speed" | "acceleration" | "handling" | "brakes", currentLevel: number) => {
    const list = UPGRADE_PRICES[key];
    if (currentLevel >= 10) return null; // fully upgraded
    return list[currentLevel - 1]; // level is 1-indexed, array is 0-indexed for prices
  };

  const handleStatUpgradeClick = (key: "speed" | "acceleration" | "handling" | "brakes", currentLevel: number) => {
    const cost = getUpgradeCost(key, currentLevel);
    if (!cost) return;

    if (profile.coins >= cost) {
      onUpgradeStat(selectedCar.id, key, cost);
      GameAudio.triggerLevelUp(); // play upgrade alert trigger
    } else {
      // Alert user of insufficient coins
    }
  };

  const updateShowroomCustomization = (field: keyof Car["customization"], value: string) => {
    const newConfig = {
      ...selectedCar.customization,
      [field]: value
    };
    onCustomizeCar(selectedCar.id, newConfig);
  };

  return (
    <div className="w-full flex flex-col min-h-[calc(100vh-140px)] bg-slate-950 p-4 font-sans text-white animate-fade-in">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (5/12 grid): Car Showrooms Selection list */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <h3 className="text-xs font-mono text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-800 pb-3">
            GARAGE SPEC SHEET
          </h3>

          <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto scrollbar-thin">
            {carsList.map((car) => {
              const isSelectedShowroom = car.id === showroomCarId;
              const carEquipped = car.id === currentCarId;
              const speedTotal = getStatTotalValue(car.baseStats.speed, car.upgrades.speedLevel);

              return (
                <div
                  key={car.id}
                  onClick={() => setShowroomCarId(car.id)}
                  className={`p-3.5 rounded-lg border transition cursor-pointer flex flex-col gap-2 ${
                    isSelectedShowroom
                      ? "bg-slate-950 border-amber-500 shadow-md"
                      : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-sans font-bold text-white flex items-center gap-1.5">
                        {car.name}
                        {carEquipped && <span className="text-[10px] bg-indigo-600 px-1 py-0.2 rounded font-mono uppercase tracking-normal font-normal">EQUIPPED</span>}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{car.category.toUpperCase()}</span>
                    </div>

                    {!car.isUnlocked ? (
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                        C$ {car.price.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                        <BadgeCheck className="w-3.5 h-3.5" /> UNLOCKED
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-400 font-mono border-t border-slate-800/60 pt-2">
                    <div>Total Spd: <strong className="text-white">{speedTotal}</strong></div>
                    <div>Upgrades: <strong className="text-indigo-400">{car.upgrades.speedLevel + car.upgrades.accelerationLevel + car.upgrades.handlingLevel + car.upgrades.brakesLevel - 4}/36</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (8/12 grid): Vector Previewer & Modifiers Dashboard */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main SVG Vector real-time custom painting illustration panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.12),transparent_70%)]" />

            {/* Showcase title block */}
            <div className="relative z-10">
              <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase">3D VECTOR ILLUSTRATOR PROJECTION</span>
              <h2 className="text-2xl font-sans font-black uppercase text-white tracking-wider mt-1">{selectedCar.name}</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Custom tuning and underglow installation console</p>
              
              <div className="flex gap-1.5 mt-4">
                <span className="text-[10px] px-2 py-0.5 bg-slate-950 font-mono rounded text-emerald-400 uppercase tracking-widest">
                  Class: {selectedCar.category}
                </span>
                {selectedCar.customization.neonUnderglow !== "none" && (
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-950 font-mono rounded text-cyan-400 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> NEON ACTIVE
                  </span>
                )}
              </div>
            </div>

            {/* Custom Vector SVG representation of the vehicle */}
            <div className="w-full md:w-80 h-44 relative bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
              <svg viewBox="0 0 200 120" className="w-full h-full p-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                
                {/* SVG neon underglow color mapping */}
                {selectedCar.customization.neonUnderglow !== "none" && (
                  <ellipse
                    cx="100"
                    cy="85"
                    rx="65"
                    ry="7"
                    fill={
                      selectedCar.customization.neonUnderglow === "blue" ? "#06b6d4" :
                      selectedCar.customization.neonUnderglow === "red" ? "#dc2626" :
                      selectedCar.customization.neonUnderglow === "green" ? "#22c55e" :
                      selectedCar.customization.neonUnderglow === "pink" ? "#ec4899" : "#eab308"
                    }
                    opacity="0.6"
                    className="animate-pulse"
                  />
                )}

                {/* Spoiler Mounts and Wing */}
                {selectedCar.customization.spoilerStyle !== "none" && (
                  <>
                    <path d="M 32 60 L 34 50 L 38 50 L 36 60 Z" fill="#2d3748" />
                    <rect
                      x={selectedCar.customization.spoilerStyle === "gt" ? "22" : "28"}
                      y="46"
                      width={selectedCar.customization.spoilerStyle === "gt" ? "24" : "15"}
                      height="4"
                      fill="#1e293b"
                      rx="1"
                    />
                  </>
                )}

                {/* Car Base Chassis Frame */}
                {/* Back Wheel Fender */}
                <path d="M 30 75 Q 30 65 50 60 L 150 56 Q 170 60 174 75 Z" fill="#1e293b" />
                
                {/* Visual customizable body paint body contouring */}
                <path
                  d="M 40 73 L 45 61 L 110 59 L 140 68 L 165 72 Z"
                  fill={selectedCar.customization.paintColor}
                />
                
                {/* Customizable decals striping layers overlay */}
                {selectedCar.customization.decalStyle !== "none" && (
                  <path
                    d="M 60 62 L 120 60 L 140 68 Z"
                    fill={selectedCar.customization.decalColor}
                    opacity="0.8"
                  />
                )}

                {/* Dark cockpit glass window shell */}
                <path d="M 94 60 L 115 60 L 128 67 L 90 67 Z" fill="#111827" stroke="#334155" strokeWidth="0.5" />

                {/* Rear customizable wheels rim color offsets */}
                <circle cx="65" cy="78" r="14" fill="#0c0f1d" stroke="#1e293b" strokeWidth="2" />
                <circle cx="65" cy="78" r="8" fill={selectedCar.customization.wheelColor} />

                {/* Front customizable wheels rim color offsets */}
                <circle cx="140" cy="78" r="14" fill="#0c0f1d" stroke="#1e293b" strokeWidth="2" />
                <circle cx="140" cy="78" r="8" fill={selectedCar.customization.wheelColor} />

                {/* Headlight yellow flare rays */}
                <polygon points="168,70 195,62 195,84" fill="#fef08a" opacity="0.18" />
                <circle cx="168" cy="71" r="3.2" fill="#ffffff" />
              </svg>
            </div>
          </div>

          {/* Core controls tab panel for upgrades and customizations */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-6">
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setActiveSubTab("specs")}
                className={`px-4 py-2.5 font-sans font-extrabold text-sm tracking-wider uppercase flex items-center gap-2 border-b-2 cursor-pointer ${
                  activeSubTab === "specs" ? "border-amber-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Hammer className="w-4 h-4" /> PERFORMANCE MODS
              </button>
              <button
                onClick={() => setActiveSubTab("paint")}
                className={`px-4 py-2.5 font-sans font-extrabold text-sm tracking-wider uppercase flex items-center gap-2 border-b-2 cursor-pointer ${
                  activeSubTab === "paint" ? "border-amber-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Palette className="w-4 h-4" /> VISUAL WRAPS
              </button>
            </div>

            {/* Performance mods panel specs tuner */}
            {activeSubTab === "specs" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: "speed", label: "Max Engine Output", stat: selectedCar.baseStats.speed, lvl: selectedCar.upgrades.speedLevel },
                  { key: "acceleration", label: "Grip Acceleration", stat: selectedCar.baseStats.acceleration, lvl: selectedCar.upgrades.accelerationLevel },
                  { key: "handling", label: "Steering Traction", stat: selectedCar.baseStats.handling, lvl: selectedCar.upgrades.handlingLevel },
                  { key: "brakes", label: "Brake Pad Force", stat: selectedCar.baseStats.brakes, lvl: selectedCar.upgrades.brakesLevel }
                ].map(({ key, label, stat, lvl }) => {
                  const currentTotal = getStatTotalValue(stat, lvl);
                  const cost = getUpgradeCost(key as any, lvl);
                  const canUpgrade = cost !== null && profile.coins >= cost && selectedCar.isUnlocked;

                  return (
                    <div key={key} className="bg-slate-950 p-4 rounded-lg border border-slate-850 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                          <span className="text-slate-300 font-bold">{label}</span>
                          <span className="text-indigo-400">Level {lvl} / 10</span>
                        </div>

                        {/* Progression bar rendering */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-900 border border-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${currentTotal}%` }} />
                          </div>
                          <span className="text-xs text-indigo-300 font-mono tracking-tighter w-8 text-right">{currentTotal}%</span>
                        </div>
                      </div>

                      {/* Upgrade controller button */}
                      {cost !== null ? (
                        <button
                          disabled={!canUpgrade}
                          onClick={() => handleStatUpgradeClick(key as any, lvl)}
                          className={`w-full py-2 px-3 rounded text-xs font-mono font-bold tracking-wider uppercase transition cursor-pointer flex justify-between items-center ${
                            canUpgrade
                              ? "bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 shadow-md shadow-indigo-600/10"
                              : "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
                          }`}
                        >
                          <span>UPGRADE +5%</span>
                          <span>C$ {cost.toLocaleString()}</span>
                        </button>
                      ) : (
                        <div className="text-center py-1.5 text-xs font-mono text-emerald-400 font-bold bg-emerald-950/20 rounded border border-emerald-900/30">
                          ⚙ MAXED CAPACITY
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Visual wrappers body style paint */}
            {activeSubTab === "paint" && (
              <div className="flex flex-col gap-6">
                
                {/* Hex Colors wrappers */}
                <div>
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-2.5">Body wrapping color</span>
                  <div className="flex flex-wrap gap-2">
                    {paintColors.map((color) => {
                      const isActive = selectedCar.customization.paintColor === color.hex;
                      return (
                        <button
                          key={color.hex}
                          onClick={() => updateShowroomCustomization("paintColor", color.hex)}
                          className={`w-8 h-8 rounded-full border transition cursor-pointer relative ${
                            isActive ? "border-white ring-2 ring-indigo-500" : "border-slate-800 hover:scale-105"
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Sub features styling configs: spoiling designs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/80 pt-4">
                  
                  {/* Spoilers and Wing mods selection */}
                  <div>
                    <span className="text-xs font-mono text-slate-400 uppercase block mb-2">Mount spoiler style</span>
                    <select
                      value={selectedCar.customization.spoilerStyle}
                      onChange={(e) => updateShowroomCustomization("spoilerStyle", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded font-mono text-xs text-slate-300 outline-none cursor-pointer"
                    >
                      <option value="none">Standard Street (None)</option>
                      <option value="low">Sleek Lip (Low Profile)</option>
                      <option value="wing">Formula Deck (Wing style)</option>
                      <option value="gt">GT Track Monster (Large)</option>
                    </select>
                  </div>

                  {/* Decals wrapping selector */}
                  <div>
                    <span className="text-xs font-mono text-slate-400 uppercase block mb-2">Thermal Decal wrapping</span>
                    <select
                      value={selectedCar.customization.decalStyle}
                      onChange={(e) => updateShowroomCustomization("decalStyle", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded font-mono text-xs text-slate-300 outline-none cursor-pointer"
                    >
                      <option value="none">Ghost Minimalist (None)</option>
                      <option value="stripes">Dual Motorsports (Stripes)</option>
                      <option value="flames">Burnout Sparks (Flames style)</option>
                      <option value="neon_lines">Synthwave Grid (Lines)</option>
                      <option value="tribal">Asphalt Reaper (Tribal design)</option>
                    </select>
                  </div>

                  {/* Wheels rim colors */}
                  <div>
                    <span className="text-xs font-mono text-slate-400 uppercase block mb-2">Tire Rim paint</span>
                    <div className="flex gap-2">
                      {wheelColors.map((colStr) => {
                        const isActive = selectedCar.customization.wheelColor === colStr;
                        return (
                          <button
                            key={colStr}
                            onClick={() => updateShowroomCustomization("wheelColor", colStr)}
                            className={`w-6 h-6 rounded-full border transition cursor-pointer ${
                              isActive ? "border-amber-500 scale-110" : "border-slate-850 hover:scale-105"
                            }`}
                            style={{ backgroundColor: colStr }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Underglow neon toggle list */}
                  <div>
                    <span className="text-xs font-mono text-slate-400 uppercase block mb-2">Underglow Neon lights</span>
                    <select
                      value={selectedCar.customization.neonUnderglow}
                      onChange={(e) => updateShowroomCustomization("neonUnderglow", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded font-mono text-xs text-slate-300 outline-none cursor-pointer"
                    >
                      <option value="none">Neon Deactivated (None)</option>
                      <option value="blue">Cyan Chill (Blue)</option>
                      <option value="red">Viper Flare (Red)</option>
                      <option value="green">Hazard Glow (Green)</option>
                      <option value="pink">Grid Retro (Pink)</option>
                      <option value="gold">Golden Sands (Gold)</option>
                    </select>
                  </div>

                </div>

              </div>
            )}

            {/* General selected car equip/buy segment footer */}
            <div className="border-t border-slate-800/80 pt-4 flex flex-col md:flex-row items-center justify-between gap-4">
              
              {!selectedCar.isUnlocked ? (
                <div className="w-full flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-500 font-mono block">Class multiplier access fee</span>
                    <span className="text-lg font-mono font-bold text-amber-400">
                      C$ {selectedCar.price.toLocaleString()}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (profile.coins >= selectedCar.price) {
                        onUnlockCar(selectedCar.id, selectedCar.price);
                      }
                    }}
                    disabled={profile.coins < selectedCar.price}
                    className={`py-3 px-6 rounded-lg font-sans font-bold tracking-wider text-sm uppercase transition cursor-pointer ${
                      profile.coins >= selectedCar.price
                        ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10"
                        : "bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    PURCHASE VEHICLE
                  </button>
                </div>
              ) : (
                <div className="w-full flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-500 font-mono block">Status: Registered grid showroom</span>
                    <span className="text-sm text-emerald-400 font-semibold uppercase font-mono">Owned</span>
                  </div>

                  <button
                    disabled={isEquipped}
                    onClick={() => onSelectCar(selectedCar.id)}
                    className={`py-3 px-6 rounded-lg font-sans font-bold tracking-wider text-sm uppercase transition cursor-pointer flex items-center gap-1.5 ${
                      isEquipped
                        ? "bg-indigo-950 text-indigo-400 border border-indigo-800/40 cursor-not-allowed"
                        : "bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md cursor-pointer"
                    }`}
                  >
                    {isEquipped ? "EQUIPPED" : "EQUIP CAR"}
                    {!isEquipped && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
