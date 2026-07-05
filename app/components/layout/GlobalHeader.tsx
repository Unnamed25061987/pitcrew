"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useLiveTiming } from '../../hooks/useLiveTiming';

const ROW_HEIGHT = 44;

const getStatusBadge = (state: string) => {
  const s = String(state || 'RUN').toUpperCase();
  if (s.includes('PIT') || s.includes('IN')) return <span className="text-[9px] font-black px-1.5 py-0.5 bg-yellow-900/80 text-[#ffaa00] border border-[#ffaa00]/50 rounded shadow-[0_0_5px_rgba(255,170,0,0.5)] animate-pulse">PIT</span>;
  if (s.includes('OUT') || s.includes('STOP')) return <span className="text-[9px] font-black px-1.5 py-0.5 bg-red-900/80 text-[#ff3333] border border-[#ff3333]/50 rounded shadow-[0_0_5px_rgba(255,51,51,0.5)]">OUT</span>;
  if (s.includes('RUN') || s.includes('TRACK')) return <span className="text-[9px] font-black px-1.5 py-0.5 bg-green-900/30 text-[#00ff66] border border-[#00ff66]/30 rounded">RUN</span>;
  return <span className="text-[9px] font-black px-1.5 py-0.5 bg-gray-800 text-gray-300 border border-gray-600 rounded">{s.substring(0, 3)}</span>;
};

// 🚀 COMPOSANT LIGNE ANIMÉE (EFFET DÉPASSEMENT F1) 🚀
const LeaderboardRow = ({ car, topPosition, isOurCar }: { car: any, topPosition: number, isOurCar: boolean }) => {
  const [isOvertaking, setIsOvertaking] = useState(false);
  const prevTopRef = useRef(topPosition);

  useEffect(() => {
    if (prevTopRef.current !== topPosition) {
      setIsOvertaking(true);
      const timer = setTimeout(() => setIsOvertaking(false), 1500); 
      prevTopRef.current = topPosition;
      return () => clearTimeout(timer);
    }
  }, [topPosition]);

  return (
    <div 
      className={`absolute left-0 right-0 flex items-center px-4 py-2 border-b border-gray-800/50 ${
        isOvertaking 
          ? 'bg-[#153035] shadow-[0_15px_30px_rgba(102,252,241,0.3)] z-50 border-l-4 border-l-[#66FCF1]' 
          : (isOurCar ? 'bg-[#1a383b] border-l-4 border-l-[#66FCF1] z-40' : 'bg-[#0B0C10] hover:bg-[#1a1c23] z-10')
      }`}
      style={{ 
        top: `${topPosition}px`, height: `${ROW_HEIGHT}px`,
        transition: 'top 1.5s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.5s ease-in-out, background-color 0.5s',
        transform: isOvertaking ? 'scale(1.05)' : 'scale(1)'
      }}
    >
      <div className={`w-6 font-black text-xs ${isOurCar || isOvertaking ? 'text-[#66FCF1]' : 'text-gray-500'}`}>{car.pos}</div>
      <div className={`w-8 font-bold text-xs ${isOurCar || isOvertaking ? 'text-white' : 'text-[#ffaa00]'}`}>#{car.num}</div>
      <div className={`flex-1 truncate font-sans text-[11px] uppercase pr-2 ${isOurCar || isOvertaking ? 'text-[#66FCF1] font-black' : 'text-gray-200'}`}>{car.team}</div>
      <div className="w-14 text-right font-mono text-[10px] text-gray-400 truncate pr-2">{car.gap}</div>
      <div className="w-8 text-right flex justify-end">{getStatusBadge(car.car_state)}</div>
    </div>
  );
};

export default function GlobalHeader() {
  const { cars } = useLiveTiming('JSON'); // On utilise LiveTiming uniquement pour les voitures
  
  // 🚀 RETOUR DE TON API ORIGINALE POUR LA DIRECTION DE COURSE 🚀
  const [status, setStatus] = useState("WAITING");
  const [remain, setRemain] = useState("--:--:--");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/messages');
        if (res.ok) {
          const data = await res.json();
          setStatus(data.trackStatus || "WAITING");
          setRemain(data.remain || "--:--:--");
          setMsg(data.message || "");
        }
      } catch (err) {
        console.error("Erreur lecture flux messages");
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); 
    return () => clearInterval(interval);
  }, []);

  const safeCars = Array.isArray(cars) ? cars : [];
  const maxRank = Math.max(...safeCars.map(c => parseInt(c.pos) || 0), safeCars.length);
  const containerHeight = maxRank * ROW_HEIGHT;

  let bgClass = "bg-[#1a1c23]"; let textClass = "text-white"; let dotClass = "bg-gray-500"; let pulse = false;
  const s = status.toUpperCase();
  
  if (s.includes("GREEN") || s.includes("RUN") || s.includes("RUNNING")) {
    bgClass = "bg-[#003311]"; textClass = "text-[#00ff66]"; dotClass = "bg-[#00ff66]";
  } else if (s.includes("FCY") || s.includes("YELLOW") || s.includes("SAFETY") || s.includes("SLOW")) {
    bgClass = "bg-[#442D00]"; textClass = "text-[#ffaa00]"; dotClass = "bg-[#ffaa00]"; pulse = true;
  } else if (s.includes("RED") || s.includes("ROUGE")) {
    bgClass = "bg-[#440000]"; textClass = "text-[#ff3333]"; dotClass = "bg-[#ff3333]"; pulse = true;
  } else if (s.includes("CHECKERED") || s.includes("FINISH")) {
    bgClass = "bg-gray-800"; textClass = "text-white"; dotClass = "bg-white"; pulse = true;
  }

  // 🚀 GESTION DE L'ANIMATION GÉANTE DU BANDEAU 🚀
  const [showStatusAnim, setShowStatusAnim] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevStatusRef.current !== null && prevStatusRef.current !== s && s !== "WAITING") {
      setShowStatusAnim(true);
      const timer = setTimeout(() => setShowStatusAnim(false), 5000); // Animation géante de 5 secondes
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = s;
  }, [s]);

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const carIdMatch = currentPath.match(/\/voiture\/(\d+)/);
  const watchedCarId = carIdMatch ? carIdMatch[1] : null;

  return (
    <>
      <style>{`
        @keyframes slide-right {
            0% { transform: translateX(-20px); opacity: 0; }
            50% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(20px); opacity: 0; }
        }
        @keyframes slide-left {
            0% { transform: translateX(20px); opacity: 0; }
            50% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(-20px); opacity: 0; }
        }
        .anim-arrow-r { animation: slide-right 1.2s infinite; display: inline-block; }
        .anim-arrow-l { animation: slide-left 1.2s infinite; display: inline-block; }
      `}</style>

      {/* 🏁 BANDEAU SUPÉRIEUR (GÉANT SI ANIMATION, NORMAL SINON) */}
      <header 
        className={`fixed top-0 left-0 right-0 z-[70] border-b border-gray-800 flex flex-col justify-center transition-all duration-700 ease-in-out overflow-hidden shadow-2xl ${bgClass}`}
        style={{ height: showStatusAnim ? '160px' : '56px' }}
      >
        <div className={`absolute top-0 left-0 w-full h-[56px] flex items-center justify-between px-6 transition-opacity duration-300 ${showStatusAnim ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex items-center space-x-4 flex-1 overflow-hidden">
            <span className={`flex items-center text-sm font-black tracking-widest shrink-0 ${textClass}`}>
              <span className={`w-3 h-3 rounded-full mr-3 ${dotClass} ${pulse ? 'animate-pulse shadow-[0_0_8px_currentColor]' : ''}`}></span>
              TRACK STATUS: {s}
            </span>
            {msg && (
              <div className="border-l border-gray-700 pl-4 flex-1 overflow-hidden whitespace-nowrap text-ellipsis flex items-center gap-2">
                <span className="text-[#ffaa00] font-bold text-[10px] uppercase bg-[#0B0C10] px-2 py-1 rounded border border-gray-700">⚠️ DIR. COURSE</span>
                <span className="text-white text-xs font-bold uppercase tracking-wide truncate">{msg}</span>
              </div>
            )}
          </div>
          <div className="text-sm font-mono text-gray-400 shrink-0 ml-4">
            REMAINING: <span className="text-white font-bold text-xl ml-2 tracking-widest">{remain}</span>
          </div>
        </div>

        {/* 🎬 GRAND TITRE ANIMÉ AU CENTRE */}
        <div className={`absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none transition-opacity duration-700 delay-200 ${showStatusAnim ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-8 text-6xl font-black uppercase tracking-widest drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
            <div className={`flex gap-2 ${textClass} opacity-60`}>
              <span className="anim-arrow-r" style={{ animationDelay: '0ms' }}>❯</span>
              <span className="anim-arrow-r" style={{ animationDelay: '200ms' }}>❯</span>
              <span className="anim-arrow-r" style={{ animationDelay: '400ms' }}>❯</span>
            </div>
            
            <span className={`tracking-[0.2em] ${textClass} drop-shadow-[0_0_15px_currentColor]`}>{s}</span>
            
            <div className={`flex gap-2 ${textClass} opacity-60`}>
              <span className="anim-arrow-l" style={{ animationDelay: '400ms' }}>❮</span>
              <span className="anim-arrow-l" style={{ animationDelay: '200ms' }}>❮</span>
              <span className="anim-arrow-l" style={{ animationDelay: '0ms' }}>❮</span>
            </div>
          </div>
        </div>
      </header>

      {/* 📺 OVERLAY LEADERBOARD TV BROADCAST */}
      <div className="fixed left-0 top-14 bottom-0 w-[320px] bg-[#0B0C10] border-r border-gray-800 z-50 shadow-[10px_0_20px_rgba(0,0,0,0.5)] flex flex-col">
        <div className="bg-[#1F2833] p-3 border-b border-gray-800 text-center shadow-md shrink-0 flex justify-between items-center px-4">
          <span className="text-[10px] font-bold text-gray-500">POS</span>
          <h2 className="text-[#66FCF1] font-black tracking-widest text-xs uppercase flex items-center gap-1">
            <span className="text-base">🏆</span> LIVE
          </h2>
          <span className="text-[10px] font-bold text-gray-500">INT</span>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
          <div className="relative w-full" style={{ height: `${containerHeight}px` }}>
            {safeCars.map((car) => {
              const positionRank = parseInt(car.pos) || 999;
              const topPosition = (positionRank - 1) * ROW_HEIGHT;
              const isOurCar = String(car.num) === String(watchedCarId);
              return <LeaderboardRow key={car.num} car={car} topPosition={topPosition} isOurCar={isOurCar} />;
            })}
          </div>
        </div>
      </div>
    </>
  );
}