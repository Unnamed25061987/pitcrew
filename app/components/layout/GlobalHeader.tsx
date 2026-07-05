"use client";
import React from 'react';
import { useLiveTiming } from '../../hooks/useLiveTiming'; // 👈 Modifie ce chemin si besoin selon où est rangé ton GlobalHeader

const ROW_HEIGHT = 44;

const formatRemainingTime = (ms: number | undefined) => {
  if (ms === undefined || ms === null || isNaN(ms) || ms < 0) return "--:--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getStatusBadge = (state: string) => {
  const s = String(state || 'RUN').toUpperCase();
  if (s.includes('PIT') || s.includes('IN')) return <span className="text-[10px] font-black px-1.5 py-0.5 bg-yellow-900/80 text-[#ffaa00] border border-[#ffaa00]/50 rounded shadow-[0_0_5px_rgba(255,170,0,0.5)] animate-pulse">PIT</span>;
  if (s.includes('OUT') || s.includes('STOP')) return <span className="text-[10px] font-black px-1.5 py-0.5 bg-red-900/80 text-[#ff3333] border border-[#ff3333]/50 rounded shadow-[0_0_5px_rgba(255,51,51,0.5)]">OUT</span>;
  if (s.includes('RUN') || s.includes('TRACK')) return <span className="text-[10px] font-black px-1.5 py-0.5 bg-green-900/30 text-[#00ff66] border border-[#00ff66]/30 rounded">RUN</span>;
  return <span className="text-[10px] font-black px-1.5 py-0.5 bg-gray-800 text-gray-300 border border-gray-600 rounded">{s.substring(0, 3)}</span>;
};

export default function GlobalHeader() {
  // 🔥 On utilise notre Hook blindé pour récupérer absolument toutes les données globales
  const { cars, status, context, messages } = useLiveTiming('JSON');
  
  const trackState = context?.session?.track_state || status || "WAITING";
  const remainMs = context?.clock?.remaining_ms;
  
  // On récupère le dernier message de la direction de course s'il existe
  const latestMessage = messages && messages.length > 0 
    ? (messages[messages.length - 1].message || messages[messages.length - 1].content || messages[messages.length - 1].event) 
    : "";

  const safeCars = Array.isArray(cars) ? cars : [];
  const maxRank = Math.max(...safeCars.map(c => parseInt(c.pos) || 0), safeCars.length);
  const containerHeight = maxRank * ROW_HEIGHT;

  let bgClass = "bg-[#1a1c23]"; let textClass = "text-white"; let dotClass = "bg-gray-500"; let pulse = false;
  const s = trackState.toUpperCase();
  
  if (s.includes("GREEN") || s.includes("RUN") || s.includes("RUNNING")) {
    bgClass = "bg-[#003311]"; textClass = "text-[#00ff66]"; dotClass = "bg-[#00ff66]";
  } else if (s.includes("FCY") || s.includes("YELLOW") || s.includes("SAFETY")) {
    bgClass = "bg-[#442D00]"; textClass = "text-[#ffaa00]"; dotClass = "bg-[#ffaa00]"; pulse = true;
  } else if (s.includes("RED") || s.includes("ROUGE")) {
    bgClass = "bg-[#440000]"; textClass = "text-[#ff3333]"; dotClass = "bg-[#ff3333]"; pulse = true;
  }

  return (
    <>
      <style>{`
        /* L'animation CSS magique pour faire glisser les voitures */
        .leaderboard-row { transition: top 0.6s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s; }
      `}</style>

      {/* 🏁 BANDEAU SUPÉRIEUR (Track Status, RC Message, Remaining Time) */}
      <header className={`fixed top-0 left-0 right-0 h-14 border-b border-gray-800 flex items-center justify-between px-6 z-[60] transition-colors duration-300 ${bgClass}`}>
        <div className="flex items-center space-x-4 flex-1 overflow-hidden">
          <span className={`flex items-center text-sm font-black tracking-widest shrink-0 ${textClass}`}>
            <span className={`w-3 h-3 rounded-full mr-3 ${dotClass} ${pulse ? 'animate-pulse shadow-[0_0_8px_currentColor]' : ''}`}></span>
            TRACK STATUS: {s}
          </span>
          
          {latestMessage && (
            <div className="border-l border-gray-700 pl-4 flex-1 overflow-hidden whitespace-nowrap text-ellipsis flex items-center gap-2">
              <span className="text-[#ffaa00] font-bold text-[10px] uppercase bg-[#0B0C10] px-2 py-1 rounded border border-gray-700">
                ⚠️ DIR. COURSE
              </span>
              <span className="text-white text-xs font-bold uppercase tracking-wide truncate">{latestMessage}</span>
            </div>
          )}
        </div>
        <div className="text-sm font-mono text-gray-400 shrink-0 ml-4">
          REMAINING: <span className="text-white font-bold text-xl ml-2 tracking-widest">{formatRemainingTime(remainMs)}</span>
        </div>
      </header>

      {/* 📺 OVERLAY LEADERBOARD TV BROADCAST (MENU GAUCHE ANIMÉ) */}
      <div className="fixed left-0 top-14 bottom-0 w-[320px] bg-[#0B0C10] border-r border-gray-800 z-50 shadow-[10px_0_20px_rgba(0,0,0,0.5)] flex flex-col">
        <div className="bg-[#1F2833] p-3 border-b border-gray-800 text-center shadow-md shrink-0">
          <h2 className="text-[#66FCF1] font-black tracking-widest text-xs flex items-center justify-center gap-2 uppercase">
            <span className="text-base">🏆</span> LIVE CLASSIFICATION
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
          <div className="relative w-full" style={{ height: `${containerHeight}px` }}>
            {safeCars.map((car) => {
              const positionRank = parseInt(car.pos) || 999;
              const topPosition = (positionRank - 1) * ROW_HEIGHT;
              
              return (
                <div key={car.num} className="leaderboard-row absolute left-0 right-0 flex items-center px-4 py-2 border-b border-gray-800/50 bg-[#0B0C10] hover:bg-[#1a1c23]"
                     style={{ top: `${topPosition}px`, height: `${ROW_HEIGHT}px` }}>
                  <div className="w-8 font-black text-sm text-gray-500">P{car.pos}</div>
                  <div className="w-10 font-bold text-sm text-[#ffaa00]">#{car.num}</div>
                  <div className="flex-1 truncate font-sans text-xs uppercase pr-2 text-white font-bold">{car.team}</div>
                  <div className="w-10 text-right flex justify-end">{getStatusBadge(car.car_state)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}