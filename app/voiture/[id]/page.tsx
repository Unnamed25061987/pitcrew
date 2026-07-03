"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiveTiming } from '../../hooks/useLiveTiming';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

interface Pilote { id: number; nom: string; nomRIS: string; statut: 'AU_VOLANT' | 'REPOS'; stintActuel: number; totalRoulé: number; totalMax: number; }
interface Stint { id: number; driver: string; laps: number; tire: string; }
interface AiMessage { role: 'user' | 'ai'; content: string; timestamp: string; }
interface LapRecord { id: number; lapNumber: number; driverRIS: string; s1: string; s2: string; s3: string; lapTime: string; lapTimeMs: number; }

const parseGapToSeconds = (gapStr?: string): number => {
  if (!gapStr || gapStr === "Leader") return 0;
  if (gapStr.includes("Laps") || gapStr.includes("Lap")) return parseInt(gapStr.replace(/[^0-9]/g, '')) * 135; 
  if (gapStr.includes("s")) return parseFloat(gapStr.replace(/[^0-9.-]/g, ''));
  return 0;
};

const parseLapToMs = (lapStr?: string): number => {
  if (!lapStr || lapStr === '-' || lapStr.includes('PIT') || lapStr.includes('IN')) return Infinity;
  const parts = lapStr.split(':');
  if (parts.length === 2) return (parseInt(parts[0]) * 60 + parseFloat(parts[1])) * 1000;
  return parseFloat(lapStr) * 1000 || Infinity;
};

const formatMsToLapTime = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(3);
  return `${minutes}:${seconds.padStart(6, '0')}`;
};

const formatLiveTimer = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
};

export default function VoitureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params.id as string;
  const { cars, status } = useLiveTiming('JSON');
  
  // NOUVEAUX REGLAGES PAR DEFAUT (Conso dynamique basée sur tes références)
  const [config, setConfig] = useState({ 
    capaMax: 80, 
    consoGreen: 1.7, 
    timeGreenStr: "2:55.000", 
    consoFcy: 0.7, 
    timeFcyStr: "7:00.000", // Nouvelle valeur de référence pour le FCY
    alertOrangePct: 35, 
    alertRedPct: 17, 
    pitLossTime: 65, 
    maxStintTime: 65 
  });
  
  const [currentFuel, setCurrentFuel] = useState<number>(0);
  const [pilotes, setPilotes] = useState<Pilote[]>([]);
  const [stints, setStints] = useState<Stint[]>([]);
  const [lapHistory, setLapHistory] = useState<LapRecord[]>([]);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    { role: 'ai', content: `Terminal IA Stratégie connecté. Je surveille la voiture #${carId}. Comment puis-je vous aider ?`, timestamp: new Date().toLocaleTimeString() }
  ]);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [gapHistory, setGapHistory] = useState<any[]>([]);
  
  const lastLapRef = useRef<number | null>(null);
  const carStateRef = useRef<string>('RUN'); 
  const currentSectorsRef = useRef({ s1: '-', s2: '-', s3: '-' });

  const liveCarData = cars.find(c => String(c.num) === String(carId));

  useEffect(() => {
    const savedConfig = localStorage.getItem(`car_config_${carId}`);
    let parsedCapa = 80;
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      parsedCapa = Number(parsed.capaMax) || 80;
      setConfig({
        capaMax: parsedCapa, 
        consoGreen: Number(parsed.consoGreen) || 1.7, 
        timeGreenStr: parsed.timeGreenStr || "2:55.000", 
        consoFcy: Number(parsed.consoFcy) || 0.7, 
        timeFcyStr: parsed.timeFcyStr || "7:00.000",
        alertOrangePct: Number(parsed.alertOrangePct) || 35,
        alertRedPct: Number(parsed.alertRedPct) || 17, 
        pitLossTime: Number(parsed.pitLossTime) || 65,
        maxStintTime: Number(parsed.maxStintTime) || 65
      });
    }

    const savedSession = localStorage.getItem(`car_session_${carId}`);
    if (savedSession) {
      try {
        const sess = JSON.parse(savedSession);
        if (sess.pilotes) setPilotes(sess.pilotes);
        if (sess.stints) setStints(sess.stints);
        if (sess.aiMessages && sess.aiMessages.length > 0) setAiMessages(sess.aiMessages);
        if (sess.lapHistory) setLapHistory(sess.lapHistory);
        if (sess.currentFuel !== undefined) setCurrentFuel(sess.currentFuel);
        else setCurrentFuel(parsedCapa);
      } catch (e) { setCurrentFuel(parsedCapa); }
    } else { setCurrentFuel(parsedCapa); }
    setIsLoaded(true);
  }, [carId]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(`car_session_${carId}`, JSON.stringify({ pilotes, stints, aiMessages, lapHistory, currentFuel }));
    }
  }, [pilotes, stints, aiMessages, lapHistory, currentFuel, isLoaded, carId]);

  useEffect(() => {
    const rawState = (liveCarData as any)?.lap?.car_state || (liveCarData as any)?.car_state || (liveCarData as any)?.state || 'RUN';
    carStateRef.current = String(rawState).toUpperCase();
  }, [liveCarData]);

  useEffect(() => {
    if (!liveCarData) return;
    if (liveCarData.s1 && liveCarData.s1 !== '-') currentSectorsRef.current.s1 = liveCarData.s1;
    if (liveCarData.s2 && liveCarData.s2 !== '-') currentSectorsRef.current.s2 = liveCarData.s2;
    if (liveCarData.s3 && liveCarData.s3 !== '-') currentSectorsRef.current.s3 = liveCarData.s3;
  }, [liveCarData?.s1, liveCarData?.s2, liveCarData?.s3]);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = carStateRef.current;
      const isRun = state === 'RUN' || state === 'TRACK' || (!state.includes('IN') && !state.includes('FUEL') && state !== 'PIT');
      const isIn = state === 'IN' || state === 'PITIN' || state === 'PIT';
      const isFuel = state === 'FUEL' || state === 'REFUEL';

      setPilotes(prev => prev.map(p => {
        if (p.statut === 'AU_VOLANT') {
          if (isRun) return { ...p, stintActuel: p.stintActuel + 1, totalRoulé: p.totalRoulé + 1 };
          if (isIn) return { ...p, stintActuel: 0 };
        }
        return p;
      }));

      if (isFuel) setCurrentFuel(prev => prev < config.capaMax ? config.capaMax : prev);
    }, 1000); 
    return () => clearInterval(interval);
  }, [config.capaMax]);

  useEffect(() => {
    if (liveCarData?.driver) {
      const risName = liveCarData.driver.trim().toLowerCase();
      setPilotes(prevPilotes => prevPilotes.map(p => {
        const isMatch = p.nomRIS && p.nomRIS.trim().toLowerCase() === risName;
        if (isMatch) {
          if (p.statut !== 'AU_VOLANT') return { ...p, statut: 'AU_VOLANT', stintActuel: 0 };
          return { ...p, statut: 'AU_VOLANT' };
        }
        return { ...p, statut: 'REPOS' };
      }));
    }
  }, [liveCarData?.driver]);

  // 🎯 MOTEUR D'INTERPOLATION DE CARBURANT
  useEffect(() => {
    if (liveCarData && liveCarData.laps > 0) {
      if (lastLapRef.current === null) {
        lastLapRef.current = liveCarData.laps;
      } else if (liveCarData.laps > lastLapRef.current) {
        const lapsDone = liveCarData.laps - lastLapRef.current;
        
        // Calcul Dynamique du Carburant consommé sur ce tour
        const lapTimeMs = parseLapToMs(liveCarData.lastLap);
        const greenMs = parseLapToMs(config.timeGreenStr) || 175000;
        const fcyMs = parseLapToMs(config.timeFcyStr) || 420000;
        
        let lapConso = config.consoGreen;

        if (lapTimeMs > 0 && lapTimeMs !== Infinity) {
          if (lapTimeMs <= greenMs) {
            lapConso = config.consoGreen; // Tour à fond
          } else if (lapTimeMs >= fcyMs) {
            lapConso = config.consoFcy; // Tour très lent (FCY pur ou arrêt pit)
          } else {
            // Règle de 3 linéaire (Interpolation)
            const ratio = (lapTimeMs - greenMs) / (fcyMs - greenMs);
            lapConso = config.consoGreen - (ratio * (config.consoGreen - config.consoFcy));
          }
        } else {
          // Securité si le chrono bug : on utilise le statut global
          const isFcy = status.includes('FCY') || status.includes('SAFETY') || status.includes('YELLOW');
          lapConso = isFcy ? config.consoFcy : config.consoGreen;
        }

        setCurrentFuel(prev => parseFloat(Math.max(0, prev - (lapsDone * lapConso)).toFixed(2)));
        
        const currentDriverRIS = liveCarData.driver || 'Inconnu';
        const newLap: LapRecord = {
          id: Date.now(),
          lapNumber: lastLapRef.current,
          driverRIS: currentDriverRIS,
          s1: currentSectorsRef.current.s1,
          s2: currentSectorsRef.current.s2,
          s3: currentSectorsRef.current.s3,
          lapTime: liveCarData.lastLap || '-',
          lapTimeMs: lapTimeMs
        };

        setLapHistory(prev => [newLap, ...prev].slice(0, 1000));
        
        lastLapRef.current = liveCarData.laps;
        currentSectorsRef.current = { s1: '-', s2: '-', s3: '-' };
      }
    }
  }, [liveCarData?.laps, status, config.consoGreen, config.consoFcy, config.timeGreenStr, config.timeFcyStr, liveCarData?.lastLap, liveCarData?.driver]);

  const fuelPct = config.capaMax > 0 ? (currentFuel / config.capaMax) * 100 : 0;
  const isFuelWarning = fuelPct <= config.alertOrangePct && fuelPct > config.alertRedPct;
  const isFuelCritical = fuelPct <= config.alertRedPct && currentFuel > 0;
  
  const activePilote = pilotes.find(p => p.statut === 'AU_VOLANT');
  const maxStintSec = config.maxStintTime * 60;
  const isStintCritical = activePilote ? (maxStintSec - activePilote.stintActuel <= 180) : false;
  const mustPitNow = isFuelCritical || isStintCritical;

  const driverPace = useMemo(() => {
    if (!activePilote || !activePilote.nomRIS) return null;
    const driverLaps = lapHistory.filter(l => l.driverRIS.toLowerCase() === activePilote.nomRIS.toLowerCase() && l.lapTimeMs !== Infinity);
    if (driverLaps.length < 3) return null; 
    
    const current3Laps = driverLaps.slice(0, 3);
    const avgCurrentMs = current3Laps.reduce((acc, curr) => acc + curr.lapTimeMs, 0) / 3;
    
    let trend: 'improving' | 'worsening' | 'stable' = 'stable';
    let deltaStr = "";

    if (driverLaps.length >= 4) {
      const prev3Laps = driverLaps.slice(1, 4);
      const avgPrevMs = prev3Laps.reduce((acc, curr) => acc + curr.lapTimeMs, 0) / 3;
      const deltaMs = avgCurrentMs - avgPrevMs;
      
      if (Math.abs(deltaMs) <= 300) { 
        trend = 'stable';
        deltaStr = "⚖️ =";
      } else if (deltaMs > 0) {
        trend = 'worsening';
        deltaStr = `↘️ +${(deltaMs / 1000).toFixed(2)}s`;
      } else {
        trend = 'improving';
        deltaStr = `↗️ ${(deltaMs / 1000).toFixed(2)}s`;
      }
    }
    return { avgStr: formatMsToLapTime(avgCurrentMs), trend, deltaStr };
  }, [lapHistory, activePilote]);

  let fuelColorText = 'text-white'; let fuelBorderColor = 'border-gray-800'; let fuelTitleColor = 'text-[#00ff66]';
  if (isFuelWarning) { fuelColorText = 'text-orange-500'; fuelBorderColor = 'border-orange-500'; fuelTitleColor = 'text-orange-500'; } 
  else if (isFuelCritical) { fuelColorText = 'text-red-500 animate-pulse'; fuelBorderColor = 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'; fuelTitleColor = 'text-red-500 animate-pulse'; }

  const carIndex = cars.findIndex(c => String(c.num) === String(carId));
  let battleGroup: any[] = [];
  if (carIndex !== -1) battleGroup = cars.slice(Math.max(0, carIndex - 2), Math.min(cars.length - 1, carIndex + 2) + 1);

  useEffect(() => {
    if (!liveCarData || battleGroup.length === 0) return;
    const currentLap = liveCarData.laps;
    setGapHistory(prev => {
      const existingIdx = prev.findIndex(item => item.lap === currentLap);
      const newData: any = { lap: currentLap };
      const ourGapSec = parseGapToSeconds(liveCarData.gap);
      battleGroup.forEach(c => {
        if (String(c.num) !== String(carId)) newData[`car_${c.num}`] = parseFloat((ourGapSec - parseGapToSeconds(c.gap)).toFixed(2));
      });
      if (existingIdx >= 0) {
        const updated = [...prev]; updated[existingIdx] = { ...updated[existingIdx], ...newData }; return updated;
      } else return [...prev, newData].slice(-15);
    });
  }, [cars, liveCarData?.laps, carId]);

  const predictorGroup = useMemo(() => {
    if (!liveCarData) return [];
    const estimatedExitGap = parseGapToSeconds(liveCarData.gap) + config.pitLossTime;
    const carsWithGaps = cars.map(c => ({ ...c, gapSec: parseGapToSeconds(c.gap), isGhost: false })); 
    const ghostCar = {
      isGhost: true, num: "GHOST", pos: "-", team: "📍 NOTRE SORTIE STAND", driver: "Simulation", 
      gapSec: estimatedExitGap, gap: `+${estimatedExitGap.toFixed(1)}s`, lastLap: "-", s1: "-", s2: "-", s3: "-"
    };
    const carsWithGhost = [...carsWithGaps, ghostCar].sort((a: any, b: any) => a.gapSec - b.gapSec);
    const ghostIndex = carsWithGhost.findIndex(c => c.isGhost);
    return carsWithGhost.slice(Math.max(0, ghostIndex - 2), Math.min(carsWithGhost.length - 1, ghostIndex + 2) + 1);
  }, [cars, liveCarData, config.pitLossTime]);

  const addPilote = () => setPilotes([...pilotes, { id: Date.now(), nom: `Pilote ${pilotes.length + 1}`, nomRIS: '', statut: pilotes.length === 0 ? 'AU_VOLANT' : 'REPOS', stintActuel: 0, totalRoulé: 0, totalMax: 120 }]);
  const updatePilote = (id: number, field: string, value: any) => setPilotes(pilotes.map(p => p.id === id ? { ...p, [field]: value } : p));
  const setPiloteAuVolant = (id: number) => setPilotes(pilotes.map(p => ({ ...p, statut: p.id === id ? 'AU_VOLANT' : 'REPOS' })));
  const addStint = () => setStints([...stints, { id: Date.now(), driver: '', laps: 15, tire: 'Slick' }]);
  const updateStint = (id: number, field: string, value: any) => setStints(stints.map(s => s.id === id ? { ...s, [field]: value } : s));
  const removeStint = (id: number) => setStints(stints.filter(s => s.id !== id));

  const greenSeconds = useMemo(() => {
    const parts = config.timeGreenStr.split(':');
    return parts.length < 2 ? 135 : (parseInt(parts[0]) * 60) + parseFloat(parts[1]);
  }, [config.timeGreenStr]);

  const calculatedStints = useMemo(() => {
    let elapsedSec = 0; let currentLap = liveCarData?.laps || 0;
    return stints.map((stint) => {
      const startSec = elapsedSec;
      const duration = stint.laps * greenSeconds;
      const endSec = startSec + duration;
      const startLap = currentLap + 1;
      const endLap = currentLap + stint.laps;
      elapsedSec = endSec + config.pitLossTime; 
      currentLap = endLap;
      const formatTime = (ts: number) => { const h = Math.floor(ts / 3600); const m = Math.floor((ts % 3600) / 60); return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; };
      return { ...stint, startTimeStr: formatTime(startSec), endTimeStr: formatTime(endSec), startLap, endLap };
    });
  }, [stints, greenSeconds, config.pitLossTime, liveCarData?.laps]);

  const uniqueDriversRIS = useMemo(() => {
    const drivers = new Set<string>();
    lapHistory.forEach(l => drivers.add(l.driverRIS));
    return Array.from(drivers);
  }, [lapHistory]);

  const bestLapsPerDriver = useMemo(() => {
    const bestLapsMap = new Map<string, { driverRIS: string, bestTimeStr: string, bestTimeMs: number }>();
    lapHistory.forEach(lap => {
      if (lap.lapTimeMs !== Infinity) {
        const existing = bestLapsMap.get(lap.driverRIS);
        if (!existing || lap.lapTimeMs < existing.bestTimeMs) {
          bestLapsMap.set(lap.driverRIS, { driverRIS: lap.driverRIS, bestTimeStr: lap.lapTime, bestTimeMs: lap.lapTimeMs });
        }
      }
    });
    return Array.from(bestLapsMap.values());
  }, [lapHistory]);

  const getDriverName = (risName: string) => {
    const matched = pilotes.find(p => p.nomRIS?.toLowerCase() === risName.toLowerCase());
    return matched ? matched.nom : risName;
  };

  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    const userQuery = aiInput;
    setAiInput("");
    setAiMessages(prev => [...prev, { role: 'user', content: userQuery, timestamp: new Date().toLocaleTimeString() }]);
    setIsAiTyping(true);

    setTimeout(() => {
      let mockResponse = "Analyse en cours...";
      const toursRestants = Math.floor(currentFuel / config.consoGreen);
      if (userQuery.toLowerCase().includes('essence') || userQuery.toLowerCase().includes('fuel') || userQuery.toLowerCase().includes('pit')) {
        mockResponse = `Au rythme actuel sous ${status}, il te reste ${currentFuel.toFixed(1)}L (${toursRestants} tours). Le pilote ${activePilote?.nom || ''} a roulé ${Math.floor((activePilote?.stintActuel || 0) / 60)} minutes.`;
      } else if (userQuery.toLowerCase().includes('pilote') || userQuery.toLowerCase().includes('stint')) {
        mockResponse = `${activePilote?.nom || 'Le pilote'} a roulé ${Math.floor((activePilote?.stintActuel || 0) / 60)} minutes sur un max de ${config.maxStintTime}. Il lui reste ${(activePilote?.totalMax || 120) - Math.floor((activePilote?.totalRoulé || 0) / 60)} minutes au total.`;
      } else {
        mockResponse = `Bien reçu. La piste est sous ${status}. Avec ${toursRestants} tours restants avant panne sèche, je garde un œil sur la fenêtre stratégique.`;
      }
      setAiMessages(prev => [...prev, { role: 'ai', content: mockResponse, timestamp: new Date().toLocaleTimeString() }]);
      setIsAiTyping(false);
    }, 1500);
  };

  const chartColors = ['#00ff66', '#ffaa00', '#ff3333', '#a855f7'];

  if (!isLoaded) return <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center text-white font-mono">Chargement télémétrie...</div>;

  return (
    <div className={`min-h-screen text-white p-6 font-sans transition-colors duration-500 ${mustPitNow ? 'bg-red-950/40' : 'bg-[#0B0C10]'}`}>
      
      {mustPitNow && (
        <div className="bg-red-600 text-white font-black text-center py-2 text-xl tracking-widest uppercase animate-pulse mb-6 rounded shadow-lg border border-red-400">
          ⚠️ BOX THIS LAP - {isStintCritical ? `LIMITE TEMPS PILOTE (${activePilote?.nom})` : 'CARBURANT CRITIQUE'} ⚠️
        </div>
      )}

      <div className="flex justify-between items-start border-b border-gray-800 pb-4 mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-5xl font-black text-[#66FCF1]">#{carId}</span>
          <div>
            <h1 className="text-2xl font-bold text-white">{liveCarData?.team || 'Écurie Connectée'}</h1>
            <p className="text-sm text-gray-400 font-mono">P{liveCarData?.pos || '?'} | Piste : <span className="text-[#00ff66]">{status}</span></p>
            <p className="text-xs text-gray-500 font-mono mt-1">Pilote RIS détecté : <span className="text-[#ffaa00] font-bold">{liveCarData?.driver || 'Inconnu'}</span> | Statut : <span className="text-white font-black">{carStateRef.current}</span></p>
          </div>
        </div>
        <button onClick={() => router.push(`/voiture/${carId}/config`)} className="bg-[#1F2833] hover:bg-[#45A29E] hover:text-black text-[#66FCF1] font-bold py-2 px-4 rounded border border-gray-700 transition text-sm shadow">⚙️ PARAMÈTRES ET LIMITES</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="flex flex-col gap-6">
          <div className="bg-[#1F2833] p-4 rounded-lg border border-gray-700 shadow-xl flex flex-col flex-1">
            <h3 className={`${fuelTitleColor} font-bold text-sm tracking-wider uppercase mb-2 border-b border-gray-700 pb-2 transition-colors`}>⛽ Niveau Carburant</h3>
            <div className={`bg-[#0B0C10] p-3 rounded text-center border transition-all duration-300 flex-1 flex flex-col justify-center ${fuelBorderColor}`}>
              <p className={`text-5xl font-mono font-black ${fuelColorText}`}>{currentFuel.toFixed(1)} L</p>
              <p className="text-[10px] text-gray-500 mt-2">{fuelPct.toFixed(0)}% (Alerte: {config.alertOrangePct}% / {config.alertRedPct}%)</p>
              <p className="text-sm font-bold text-gray-400 mt-2">~{Math.floor(currentFuel / config.consoGreen)} Tours restants</p>
              <input type="range" min="0" max={config.capaMax} value={currentFuel} onChange={e => setCurrentFuel(Number(e.target.value))} className="w-full mt-4 accent-[#45A29E]" />
            </div>
          </div>
          <div className="bg-[#1F2833] p-3 rounded-lg border border-gray-700 shadow-xl flex flex-col flex-1">
            <h3 className="text-[#00ff66] font-bold text-sm tracking-wider uppercase mb-2 border-b border-gray-700 pb-2">⏱️ STINT EN COURS</h3>
            <div className={`bg-[#0B0C10] p-3 rounded text-center border shadow-inner flex flex-col justify-center flex-1 ${isStintCritical ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-gray-800'}`}>
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 truncate">{activePilote?.nom || 'AUCUN PILOTE DÉTECTÉ'}</p>
              <p className={`text-4xl font-mono font-black tracking-wider ${isStintCritical ? 'text-red-500 animate-pulse' : 'text-[#66FCF1]'}`}>
                {formatLiveTimer(activePilote?.stintActuel || 0)}
              </p>
              <p className="text-[10px] text-gray-500 mt-1 mb-2">
                Max Légal : {config.maxStintTime} min
                {carStateRef.current === 'IN' && <span className="text-[#ffaa00] ml-1 animate-pulse">(PIT IN)</span>}
              </p>
              <div className="mt-auto pt-2 border-t border-gray-800/50">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Rythme Moyen (3 Trs)</p>
                {driverPace ? (
                  <div className="flex justify-center items-center gap-2">
                    <span className="text-lg font-mono font-bold text-white shadow-sm">{driverPace.avgStr}</span>
                    {driverPace.trend === 'improving' && <span className="text-[10px] font-black text-[#00ff66] bg-[#00ff66]/10 border border-[#00ff66]/20 px-1.5 py-0.5 rounded shadow-sm">{driverPace.deltaStr}</span>}
                    {driverPace.trend === 'worsening' && <span className="text-[10px] font-black text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded shadow-sm">{driverPace.deltaStr}</span>}
                    {driverPace.trend === 'stable' && <span className="text-[10px] font-bold text-gray-400 bg-gray-800 border border-gray-600 px-1.5 py-0.5 rounded">{driverPace.deltaStr}</span>}
                  </div>
                ) : (
                  <p className="text-[9px] text-gray-600 font-mono mt-1">Calcul en cours...</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1F2833] p-4 rounded-lg border border-gray-700 shadow-xl flex flex-col">
          <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
            <h3 className="text-[#00ff66] font-bold text-sm tracking-wider uppercase">👥 Pilotes & Config (Min)</h3>
            <div className="flex items-center space-x-2">
              <span className="text-[9px] text-[#ffaa00] bg-gray-900 px-1 rounded border border-gray-700 font-bold">Max Stint: {config.maxStintTime}m</span>
              <button onClick={addPilote} className="text-[10px] bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">+ Ajouter</button>
            </div>
          </div>
          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
            {pilotes.map((pilote) => (
              <div key={pilote.id} className={`p-2 rounded border transition-colors ${pilote.statut === 'AU_VOLANT' ? 'bg-[#153035] border-[#45A29E]' : 'bg-[#0B0C10] border-gray-800'}`}>
                <div className="flex gap-2 mb-2 items-center">
                  <input type="text" placeholder="Nom Complet" value={pilote.nom} onChange={e => updatePilote(pilote.id, 'nom', e.target.value)} className="bg-transparent font-bold text-sm text-white outline-none border-b border-gray-700 w-1/2" />
                  {liveCarData?.driver && (!pilote.nomRIS || pilote.nomRIS.toLowerCase() !== liveCarData.driver.toLowerCase()) ? (
                    <div className="w-1/2 flex gap-1 items-center">
                      <input type="text" placeholder="Lien RIS" value={pilote.nomRIS || ''} onChange={e => updatePilote(pilote.id, 'nomRIS', e.target.value)} className="bg-transparent font-mono text-xs text-[#ffaa00] outline-none border-b border-gray-700 w-full" />
                      <button onClick={() => { updatePilote(pilote.id, 'nomRIS', liveCarData.driver); setPiloteAuVolant(pilote.id); }} className="text-[9px] bg-[#45A29E] hover:bg-[#66FCF1] text-black font-black px-1.5 py-0.5 rounded transition-colors shadow shadow-[#45A29E]/50 animate-pulse">LIER</button>
                    </div>
                  ) : (
                    <div className="w-1/2 flex items-center gap-1 border-b border-gray-700">
                      <span className="text-[9px] text-[#00ff66]">✅</span>
                      <input type="text" placeholder="Lien RIS" value={pilote.nomRIS || ''} onChange={e => updatePilote(pilote.id, 'nomRIS', e.target.value)} className="bg-transparent font-mono text-xs text-[#ffaa00] outline-none w-full" />
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2 text-[10px]">
                  <div className="flex space-x-2">
                    <div className="flex items-center"><span className="text-gray-500 mr-1">Stint(m):</span><input type="number" value={Math.floor(pilote.stintActuel / 60)} onChange={e => updatePilote(pilote.id, 'stintActuel', Number(e.target.value) * 60)} className={`w-8 bg-gray-800 text-center rounded font-bold ${pilote.statut === 'AU_VOLANT' && isStintCritical ? 'text-red-500' : pilote.statut === 'AU_VOLANT' ? 'text-[#66FCF1]' : 'text-white'}`} /></div>
                    <div className="flex items-center"><span className="text-gray-500 mr-1">Total(m):</span><input type="number" value={Math.floor(pilote.totalRoulé / 60)} onChange={e => updatePilote(pilote.id, 'totalRoulé', Number(e.target.value) * 60)} className="w-8 bg-gray-800 text-center rounded text-white" /></div>
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => updatePilote(pilote.id, 'stintActuel', 0)} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-500 text-white">↺</button>
                    <button onClick={() => setPiloteAuVolant(pilote.id)} className={`text-[9px] px-2 py-0.5 rounded ${pilote.statut === 'AU_VOLANT' ? 'bg-[#00ff66] text-black font-black' : 'bg-gray-700 text-white'}`}>TRACK</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1F2833] p-4 rounded-lg border border-gray-700 shadow-xl flex flex-col">
          <h3 className="text-[#66FCF1] font-bold text-sm tracking-wider mb-2 uppercase border-b border-gray-700 pb-2">⏱️ Télémétrie Piste</h3>
          <div className="grid grid-cols-2 gap-2 mb-2 flex-1">
            <div className="bg-[#0B0C10] p-4 rounded text-center border border-gray-800 flex flex-col justify-center"><p className="text-gray-500 text-[10px] uppercase font-bold">Dernier</p><p className="text-2xl font-mono font-bold text-white mt-1">{liveCarData?.lastLap || '-:--'}</p></div>
            <div className="bg-[#0B0C10] p-4 rounded text-center border border-gray-800 flex flex-col justify-center"><p className="text-gray-500 text-[10px] uppercase font-bold">Meilleur</p><p className="text-2xl font-mono font-bold text-purple-400 mt-1">{liveCarData?.bestLap || '-:--'}</p></div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-[#0B0C10] p-2 rounded border border-gray-800"><span className="text-gray-500 font-bold">S1</span><p className="font-mono text-white mt-1">{liveCarData?.s1 || '-'}</p></div>
            <div className="bg-[#0B0C10] p-2 rounded border border-gray-800"><span className="text-gray-500 font-bold">S2</span><p className="font-mono text-white mt-1">{liveCarData?.s2 || '-'}</p></div>
            <div className="bg-[#0B0C10] p-2 rounded border border-gray-800"><span className="text-gray-500 font-bold">S3</span><p className="font-mono text-white mt-1">{liveCarData?.s3 || '-'}</p></div>
          </div>
        </div>
      </div>

      <div className="bg-[#1a1c23] p-5 rounded-lg border border-gray-800 shadow-xl mb-8">
        <h3 className="text-[#66FCF1] font-black text-base tracking-wider uppercase mb-4">📈 Évolution des Écarts (Deltas en Secondes)</h3>
        <div className="h-[300px] w-full bg-[#0B0C10] rounded border border-gray-800 pt-4 pr-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={gapHistory} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2833" />
              <XAxis dataKey="lap" stroke="#555" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis stroke="#555" tick={{ fill: '#888', fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1c23', borderColor: '#45A29E', color: '#fff', borderRadius: '8px' }} itemStyle={{ fontWeight: 'bold' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
              <ReferenceLine y={0} stroke="#66FCF1" strokeWidth={2} strokeDasharray="4 4" />
              {battleGroup.filter(c => String(c.num) !== String(carId)).map((c, index) => (
                <Line key={c.num} type="monotone" dataKey={`car_${c.num}`} name={`#${c.num} ${c.team}`} stroke={chartColors[index % chartColors.length]} strokeWidth={3} dot={{ r: 3, fill: '#0B0C10' }} activeDot={{ r: 6 }} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <div className="bg-[#1a1c23] p-5 rounded-lg border border-gray-800 shadow-xl">
          <h3 className="text-[#ffaa00] font-black text-sm tracking-wider mb-4 uppercase">⚔️ LA BATAILLE DIRECTE</h3>
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#0B0C10] text-gray-400 uppercase tracking-wider border-b border-gray-800">
                <th className="p-2">Pos</th><th className="p-2">N°</th><th className="p-2 font-sans">Équipe</th><th className="p-2">Écart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {battleGroup.map(c => {
                const isUs = String(c.num) === String(carId);
                return (
                  <tr key={c.num} className={isUs ? 'bg-[#153035] font-bold border-l-4 border-[#66FCF1]' : 'hover:bg-[#1F2833]'}>
                    <td className="p-2 text-gray-400">P{c.pos}</td>
                    <td className="p-2 text-[#ffaa00]">#{c.num}</td>
                    <td className="p-2 font-sans text-white text-xs truncate max-w-[120px]">{c.team}</td>
                    <td className="p-2 text-gray-300">{c.gap}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-[#1a1c23] p-5 rounded-lg border border-[#45A29E] shadow-[0_0_15px_rgba(69,162,158,0.2)]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[#66FCF1] font-black text-sm tracking-wider uppercase">🔮 PRÉDICTION SORTIE DES STANDS</h3>
            <span className="text-[10px] bg-[#0B0C10] px-2 py-1 rounded text-gray-400 border border-gray-700">Pit Loss: {config.pitLossTime}s</span>
          </div>
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#0B0C10] text-gray-400 uppercase tracking-wider border-b border-gray-800">
                <th className="p-2">Statut</th><th className="p-2">N°</th><th className="p-2 font-sans">Équipe</th><th className="p-2">Écart Virtuel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {predictorGroup.map((c: any) => (
                <tr key={c.num} className={c.isGhost ? 'bg-purple-900/40 font-bold border-l-4 border-purple-500 animate-pulse' : 'hover:bg-[#1F2833]'}>
                  <td className="p-2">{c.isGhost ? 'SORTIE' : `P${c.pos}`}</td>
                  <td className="p-2 text-[#ffaa00]">{c.num}</td>
                  <td className={`p-2 font-sans text-xs truncate max-w-[120px] ${c.isGhost ? 'text-purple-400' : 'text-white'}`}>{c.team}</td>
                  <td className="p-2 text-gray-300">{c.gap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <div className="bg-[#1a1c23] p-5 rounded-lg border border-gray-800 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[#66FCF1] font-black text-sm tracking-wider uppercase">📋 PLANIFICATEUR DE RELAIS</h3>
            <button onClick={addStint} className="bg-[#45A29E] hover:bg-[#66FCF1] text-black font-bold text-[10px] px-3 py-1.5 rounded shadow">+ AJOUTER RELAIS</button>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0B0C10] text-gray-400 uppercase tracking-wider sticky top-0">
                  <th className="p-2">Relais</th><th className="p-2">Pilote Prévu</th><th className="p-2 text-center">Tours</th><th className="p-2 text-[#00ff66]">Fin Est.</th><th className="p-2 text-center">X</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm font-mono">
                {calculatedStints.map((stint, index) => (
                  <tr key={stint.id} className="hover:bg-[#1F2833]">
                    <td className="p-2 font-sans font-bold text-gray-400">R{index + 1}</td>
                    <td className="p-2">
                      <select value={stint.driver} onChange={e => updateStint(stint.id, 'driver', e.target.value)} className="bg-[#0B0C10] border border-gray-700 text-white rounded p-1 w-28 outline-none text-xs cursor-pointer hover:border-gray-500">
                        <option value="">-- Pilote --</option>
                        {pilotes.map(p => <option key={p.id} value={p.nom}>{p.nom}</option>)}
                      </select>
                    </td>
                    <td className="p-2 text-center">
                      <input type="number" value={stint.laps} onChange={e => updateStint(stint.id, 'laps', parseInt(e.target.value) || 0)} className="bg-[#0B0C10] border border-gray-700 text-[#ffaa00] font-bold rounded p-1 w-12 text-center outline-none" />
                    </td>
                    <td className="p-2 text-[#00ff66] font-bold">{stint.endTimeStr}</td>
                    <td className="p-2 text-center"><button onClick={() => removeStint(stint.id)} className="text-red-500 hover:text-red-400 font-bold text-lg">×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#0B0C10] p-5 rounded-lg border border-[#a855f7] shadow-[0_0_15px_rgba(168,85,247,0.15)] flex flex-col h-[380px]">
          <h3 className="text-[#a855f7] font-black text-sm tracking-wider uppercase mb-4 flex items-center">
            <span className="mr-2">✨</span> GEMINI IA - INGÉNIEUR STRATÉGISTE
          </h3>
          <div className="flex-1 overflow-y-auto mb-4 pr-2 space-y-3 font-mono text-xs">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] text-gray-500 mb-0.5">{msg.timestamp}</span>
                <div className={`p-3 rounded-lg max-w-[85%] ${msg.role === 'user' ? 'bg-[#1F2833] text-[#66FCF1] border border-gray-700 rounded-br-none' : 'bg-[#1a1225] text-white border border-[#a855f7]/50 rounded-bl-none'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isAiTyping && <div className="text-[#a855f7] animate-pulse text-xs">Gemini analyse les données télémétriques...</div>}
          </div>
          <form onSubmit={handleAskAi} className="flex gap-2">
            <input type="text" value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="Posez une question stratégique..." className="flex-1 bg-[#1F2833] text-white rounded p-2 text-xs border border-gray-700 outline-none focus:border-[#a855f7]" />
            <button type="submit" disabled={isAiTyping || !aiInput.trim()} className="bg-[#a855f7] hover:bg-purple-400 disabled:opacity-50 text-black font-bold px-4 py-2 rounded text-xs transition">ENVOYER</button>
          </form>
        </div>
      </div>

      <div className="bg-[#1a1c23] p-5 rounded-lg border border-gray-800 shadow-xl mb-10">
        <h3 className="text-[#66FCF1] font-black text-sm tracking-wider uppercase mb-6 flex items-center">
          <span className="mr-2">📊</span> HISTORIQUE DES TOURS & PACE (PAR PILOTE)
        </h3>

        {uniqueDriversRIS.length === 0 ? (
          <p className="text-sm text-gray-500 font-sans italic text-center py-6">En attente de la complétion du premier tour...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {uniqueDriversRIS.map(driverRIS => {
              const driverLaps = lapHistory.filter(l => l.driverRIS === driverRIS);
              const bestLapData = bestLapsPerDriver.find(b => b.driverRIS === driverRIS);

              return (
                <div key={driverRIS} className="bg-[#1F2833] rounded border border-gray-700 overflow-hidden flex flex-col h-[500px] shadow-lg">
                  <div className="bg-[#0B0C10] p-4 border-b border-gray-800 text-center relative">
                    <h4 className="text-[#00ff66] font-bold uppercase tracking-widest text-sm mb-1 truncate">{getDriverName(driverRIS)}</h4>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest">Meilleur Tour Absolu</p>
                    <p className="text-2xl font-mono font-black text-[#a855f7] mt-1 shadow-sm">{bestLapData?.bestTimeStr || '-:--'}</p>
                    <span className="absolute top-2 right-2 text-[10px] text-gray-600 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-700">{driverLaps.length} tours</span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[10px] xl:text-xs">
                      <thead className="bg-[#1a1c23] text-gray-400 uppercase tracking-wider sticky top-0 z-10 shadow">
                        <tr>
                          <th className="p-2 border-b border-gray-700">Tr</th>
                          <th className="p-2 text-center border-b border-gray-700">S1</th>
                          <th className="p-2 text-center border-b border-gray-700">S2</th>
                          <th className="p-2 text-center border-b border-gray-700">S3</th>
                          <th className="p-2 text-[#66FCF1] text-right border-b border-gray-700">Temps</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 font-mono">
                        {driverLaps.map(lap => {
                          const isBest = lap.lapTime === bestLapData?.bestTimeStr;
                          return (
                            <tr key={lap.id} className={`transition-colors ${isBest ? 'bg-[#a855f7]/20 border-l-2 border-[#a855f7]' : 'hover:bg-[#1a1c23] border-l-2 border-transparent'}`}>
                              <td className="p-2 text-gray-500 font-bold">T{lap.lapNumber}</td>
                              <td className="p-2 text-center text-gray-400">{lap.s1}</td>
                              <td className="p-2 text-center text-gray-400">{lap.s2}</td>
                              <td className="p-2 text-center text-gray-400">{lap.s3}</td>
                              <td className={`p-2 text-right font-bold ${isBest ? 'text-[#a855f7]' : 'text-white'}`}>{lap.lapTime}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}