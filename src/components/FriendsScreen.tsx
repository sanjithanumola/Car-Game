import React, { useState, useEffect, useRef } from "react";
import { Friend, UserProfile } from "../types";
import { Mic, MicOff, MessageSquare, Send, Users, Activity, VolumeX, Volume2 } from "lucide-react";

interface FriendsProps {
  profile: UserProfile;
}

export const FriendsScreen: React.FC<FriendsProps> = ({ profile }) => {
  const [friends, setFriends] = useState<Friend[]>([
    {
      id: "fr1",
      name: "DriftKing_X",
      avatarSeed: "fr1",
      level: 98,
      status: "online",
      isVoiceMuted: false,
      chatHistory: [
        { sender: "friend", text: "Yo! Ready to race Neon Expressway?", timestamp: "10:14" },
        { sender: "user", text: "Connecting matching servers now!", timestamp: "10:15" },
        { sender: "friend", text: "Nice. I upgraded my vortex hypercar with cyan neon!", timestamp: "10:15" }
      ]
    },
    {
      id: "fr2",
      name: "TurboViper",
      avatarSeed: "fr2",
      level: 72,
      status: "racing",
      isVoiceMuted: false,
      chatHistory: [
        { sender: "friend", text: "Police chase in Sahara Sands is insane!", timestamp: "09:30" }
      ]
    },
    {
      id: "fr3",
      name: "NitrousGhost",
      avatarSeed: "fr3",
      level: 45,
      status: "online",
      isVoiceMuted: true,
      chatHistory: []
    },
    {
      id: "fr4",
      name: "AsphaltAngel",
      avatarSeed: "fr4",
      level: 60,
      status: "offline",
      isVoiceMuted: false,
      chatHistory: []
    }
  ]);

  const [activeFriendId, setActiveFriendId] = useState<string>("fr1");
  const [chatInput, setChatInput] = useState("");
  const selectedFriend = friends.find(f => f.id === activeFriendId);

  // Voice simulator attributes
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMyMicMuted, setIsMyMicMuted] = useState(false);
  const [speakersFeed, setSpeakersFeed] = useState<string[]>([]);
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Periodically animate simulated speakers and voice canvas decibels
  useEffect(() => {
    let frameId: number;
    const canvas = visualizerCanvasRef.current;
    if (canvas && isVoiceActive) {
      const ctx = canvas.getContext("2d");
      let phase = 0;
      
      const draw = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        
        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + Math.sin(x * 0.08 + phase) * (isMyMicMuted ? 1 : 12 * Math.sin(x * 0.02));
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        phase += 0.28;
        frameId = requestAnimationFrame(draw);
      };
      draw();
    }
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [isVoiceActive, isMyMicMuted]);

  // Periodic visual logs of speaking activity inside crews
  useEffect(() => {
    if (!isVoiceActive) {
      setSpeakersFeed([]);
      return;
    }

    const interval = setInterval(() => {
      const names = ["DriftKing_X", "TurboViper", "User Driver"];
      const speakingList: string[] = [];
      
      if (!isMyMicMuted) {
        speakingList.push("You (Mic Active)");
      }
      
      if (Math.random() > 0.4) {
        speakingList.push(names[Math.floor(Math.random() * 2)]);
      }

      setSpeakersFeed(speakingList);
    }, 2200);

    return () => clearInterval(interval);
  }, [isVoiceActive, isMyMicMuted]);

  const handleSendMessage = () => {
    if (!chatInput.trim() || !selectedFriend) return;

    const userMsg = chatInput.trim();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append user message
    const updatedHistory = [...selectedFriend.chatHistory, { sender: "user" as const, text: userMsg, timestamp }];
    
    setFriends(prev => prev.map(f => f.id === selectedFriend.id ? { ...f, chatHistory: updatedHistory } : f));
    setChatInput("");

    // Simulate smart context bot responses
    setTimeout(() => {
      let replyText = "Awesome! Let's get down to the track. See you in the next match!";
      const lower = userMsg.toLowerCase();
      if (lower.includes("police") || lower.includes("cop")) {
        replyText = "Yeah, police barricades in Sahara sands are brutal. Drift around them!";
      } else if (lower.includes("car") || lower.includes("upgrade") || lower.includes("paint")) {
        replyText = "Nice mods! I just painted my Viper Interceptor dark grey metallic. Looks clean!";
      } else if (lower.includes("join") || lower.includes("invite") || lower.includes("race")) {
        replyText = "I'm launching Metropolis Drift right now! Join the matchmaking lobby.";
      }

      const botUpdatedHistory = [...updatedHistory, { sender: "friend" as const, text: replyText, timestamp }];
      setFriends(prev => prev.map(f => f.id === selectedFriend.id ? { ...f, chatHistory: botUpdatedHistory } : f));
    }, 1200);
  };

  return (
    <div className="w-full flex flex-col min-h-[calc(100vh-140px)] bg-slate-950 p-4 font-sans text-white animate-fade-in">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* 1. Left Channel: Friend List & Activities */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
            <h3 className="text-sm font-mono text-slate-300 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-400 font-bold" /> RACING CREW
            </h3>
            <span className="text-[10px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded font-mono font-bold">
              {friends.filter(f => f.status !== "offline").length} ONLINE
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {friends.map((friend) => {
              const isSelected = friend.id === activeFriendId;
              return (
                <div
                  key={friend.id}
                  onClick={() => setActiveFriendId(friend.id)}
                  className={`p-3 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-slate-950 border-amber-500"
                      : "bg-slate-900/60 border-slate-850 hover:border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{friend.avatarSeed === "fr1" ? "🦊" : friend.avatarSeed === "fr2" ? "🦁" : "👤"}</span>
                    <div>
                      <h4 className="text-xs font-bold font-sans">{friend.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[9px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          friend.status === "online" ? "bg-emerald-400" :
                          friend.status === "racing" ? "bg-cyan-400 animate-pulse" : "bg-slate-600"
                        }`} />
                        <span className="text-slate-400 capitalize">{friend.status} Lvl.{friend.level}</span>
                      </div>
                    </div>
                  </div>

                  <MessageSquare className={`w-3.5 h-3.5 ${isSelected ? "text-amber-500" : "text-slate-500"}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Middle/Right channels: Chat panel & Voice widgets */}
        <div className="lg:col-span-8 flex flex-col md:flex-row gap-6">
          
          {/* Active messenger panel */}
          {selectedFriend ? (
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col shadow-xl">
              <div className="border-b border-slate-850 pb-3 flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-sans font-extrabold">{selectedFriend.name} Chatroom</h4>
                  <span className="text-[10px] text-indigo-400 font-mono">Sync latency: 15ms</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Simulated Matching Client</span>
              </div>

              {/* Chat lines container scrolling list */}
              <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto mb-4 p-3 bg-slate-950/60 rounded-lg flex flex-col gap-3.5 border border-slate-850">
                {selectedFriend.chatHistory.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-mono text-xs">
                    No history. Select quick chat messages below to send simulated pings.
                  </div>
                ) : (
                  selectedFriend.chatHistory.map((chat, idx) => {
                    const isUser = chat.sender === "user";
                    return (
                      <div key={idx} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                        <div className={`px-3 py-2 rounded-lg text-xs leading-relaxed max-w-xs font-sans ${
                          isUser ? "bg-indigo-600 text-white rounded-tr-none" : "bg-slate-800 text-slate-200 rounded-tl-none"
                        }`}>
                          {chat.text}
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">{chat.timestamp}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick typing suggestions inputs */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  "Watch out for police!",
                  "Nice drift!",
                  "Race me Sahara Sands",
                  "My supercar class is maxed"
                ].map((txt) => (
                  <button
                    key={txt}
                    onClick={() => {
                      setChatInput(txt);
                    }}
                    className="text-[10px] bg-slate-950/80 hover:bg-slate-800 cursor-pointer text-indigo-400 border border-slate-850 px-2 py-1 rounded"
                  >
                    {txt}
                  </button>
                ))}
              </div>

              {/* Chat Input row */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type message here..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                  className="flex-1 bg-slate-950 border border-slate-850 p-2.5 rounded font-sans text-xs text-slate-200 outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded text-white cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-center text-slate-500 font-mono text-xs">
              Select friend on left panel to open chat.
            </div>
          )}

          {/* 3. Voice room status panel right */}
          <div className="w-full md:w-64 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-xl">
            <h4 className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider border-b border-slate-850 pb-2">
              APAC COMM VOICE DECK
            </h4>

            {isVoiceActive ? (
              <div className="flex flex-col gap-4 animate-scale-up">
                
                {/* Voice connected visual wave state */}
                <div className="bg-slate-950 p-3.5 rounded-lg border border-cyan-800/40 text-center">
                  <span className="text-[10px] text-cyan-400 font-bold tracking-widest block animate-pulse">
                    VOICE CONNECTED (MUTE: NO)
                  </span>
                  
                  {/* Visualizer canvas */}
                  <canvas
                    ref={visualizerCanvasRef}
                    height={40}
                    width={180}
                    className="w-full h-10 mt-2 block rounded bg-slate-950"
                  />
                </div>

                {/* Who is speaking simulated log */}
                <div className="bg-slate-950/60 p-3 rounded-md border border-slate-850">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase mb-1.5">Speaking list:</span>
                  <div className="flex flex-col gap-1.5 font-mono text-[10px]">
                    {speakersFeed.length === 0 ? (
                      <span className="text-slate-600">Ambient silence...</span>
                    ) : (
                      speakersFeed.map((spk) => (
                        <div key={spk} className="flex items-center gap-1.5 text-cyan-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          <span>{spk}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Mic and Mute controls buttons */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => setIsMyMicMuted(!isMyMicMuted)}
                    className={`py-2 px-3 rounded font-mono text-[11px] font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5 transition ${
                      isMyMicMuted
                        ? "bg-rose-950/50 text-rose-400 border border-rose-800"
                        : "bg-cyan-950/50 text-cyan-400 border border-cyan-800"
                    }`}
                  >
                    {isMyMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {isMyMicMuted ? "Muted" : "Mic On"}
                  </button>

                  <button
                    onClick={() => setIsVoiceActive(false)}
                    className="py-2 px-3 bg-red-950/80 text-rose-450 border border-red-800 text-[11px] hover:text-white font-mono font-bold uppercase cursor-pointer rounded"
                  >
                    LEAVE ROOM
                  </button>
                </div>

              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <Mic className="w-10 h-10 text-slate-600 mb-3 animate-[pulse_3s_infinite]" />
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans mb-4">
                  Connect to APAC Voice deck channel #3 to talk with crew members while racing.
                </p>

                <button
                  onClick={() => setIsVoiceActive(true)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-bold tracking-widest text-[11px] uppercase py-2.5 rounded shadow cursor-pointer transition"
                >
                  CONNECT VOICE DECK
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
