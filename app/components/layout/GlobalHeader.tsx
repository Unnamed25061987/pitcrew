"use client";
import React, { useState, useEffect } from 'react';

export default function GlobalHeader() {
  const [status, setStatus] = useState("WAITING");
  const [remain, setRemain] = useState("--:--:--");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/messages');
        if (res.ok) {
          const data = await res.json();
          setStatus(data.trackStatus);
          setRemain(data.remain);
          setMsg(data.message);
        }
      } catch (err) {
        console.error("Erreur lecture flux messages");
      }
    };

    fetchMessages();
    
    // 🔥 LE CŒUR DU RÉACTEUR : Actualisation chaque seconde (1000 ms)
    const interval = setInterval(fetchMessages, 1000); 
    
    return () => clearInterval(interval);
  }, []);

  // Couleurs dynamiques
  let bgClass = "bg-[#1a1c23]";
  let textClass = "text-white";
  let dotClass = "bg-gray-500";
  let pulse = false;

  const s = status.toUpperCase();
  if (s.includes("GREEN") || s.includes("RUN") || s.includes("RUNNING")) {
    bgClass = "bg-[#003311]";
    textClass = "text-[#00ff66]";
    dotClass = "bg-[#00ff66]";
  } else if (s.includes("FCY") || s.includes("YELLOW") || s.includes("SAFETY")) {
    bgClass = "bg-[#442D00]";
    textClass = "text-[#ffaa00]";
    dotClass = "bg-[#ffaa00]";
    pulse = true;
  } else if (s.includes("RED") || s.includes("ROUGE")) {
    bgClass = "bg-[#440000]";
    textClass = "text-[#ff3333]";
    dotClass = "bg-[#ff3333]";
    pulse = true;
  }

  return (
    <header className={`h-14 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 transition-colors duration-300 ${bgClass}`}>
      
      <div className="flex items-center space-x-4 flex-1 overflow-hidden">
        
        {/* Statut de la piste */}
        <span className={`flex items-center text-sm font-black tracking-widest shrink-0 ${textClass}`}>
          <span className={`w-3 h-3 rounded-full mr-3 ${dotClass} ${pulse ? 'animate-pulse' : ''}`}></span>
          TRACK STATUS: {s}
        </span>
        
        {/* Messages de la direction de course (RC_MESSAGE) */}
        {msg && (
          <div className="border-l border-gray-700 pl-4 flex-1 overflow-hidden whitespace-nowrap text-ellipsis">
            <span className="text-[#ffaa00] font-bold text-xs uppercase bg-[#15171e] px-2 py-1 rounded">
              ⚠️ DIR. COURSE
            </span>
            <span className="text-white text-xs font-bold uppercase ml-2 tracking-wide">
              {msg}
            </span>
          </div>
        )}
      </div>

      {/* Chrono Course */}
      <div className="text-sm font-mono text-gray-400 shrink-0 ml-4">
        REMAINING: <span className="text-white font-bold text-xl ml-2">{remain}</span>
      </div>
      
    </header>
  );
}