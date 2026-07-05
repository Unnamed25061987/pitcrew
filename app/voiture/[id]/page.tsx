"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiveTiming } from '../../hooks/useLiveTiming';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

interface Pilote { id: number; nom: string; nomRIS: string; statut: 'AU_VOLANT' | 'REPOS'; stintActuel: number; totalRoulé: number; totalMax: number; }
interface Stint { id: number; driver: string; laps: number; tire: string; }
interface AiMessage { role: 'user' | 'ai'; content: string; timestamp: string; }
interface LapRecord { id: number; lapNumber: number; driverRIS: string; s1: string; s2: string; s3: string; lapTime: string; lapTimeMs: number; }
interface PitStopRecord { id: number; lap: number; timeIn: string; durationSec: number; }
interface RcMessage { time: string; msg: string; }

const chartColors = ['#00ff66', '#ffaa00', '#ff3333', '#a855f7', '#00ffff'];

const parseLapToMs = (lapStr?: string): number => {
  if (!lapStr) return Infinity;
  const str = String(lapStr);
  if (str === '-' || str.includes('PIT') || str.includes('IN')) return Infinity;
  const parts = str.split(':');
  if (parts.length === 2) return (parseInt(parts[0]) * 60 + parseFloat(parts[1])) * 1000;
  return parseFloat(str) * 1000 || Infinity;
};

const formatMsToLapTime = (ms: number) => {
  if (ms === Infinity || isNaN(ms)) return "-:--.---";
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

// 🚀 EXTRACTION PURE DU GAP AU LEADER (Robuste pour les mathématiques) 🚀
const getAbsoluteGapMs = (car: any) => {
  if (!car || !car.gaps || !car.gaps.toLeader) return 0;
  const laps = car.gaps.toLeader.laps;
  const ms = car.gaps.toLeader.ms;
  if (laps !== null && laps !== undefined && Number(laps) > 0) return Number(laps) * 135000; // Estime 1 tour = 135s si pas de chrono
  if (ms !== null && ms !== undefined && Number(ms) > 0) return Number(ms);
  return 0;
};

// 🚀 FORMATAGE DU GAP POUR L'AFFICHAGE 🚀
const formatGap = (gaps: any) => {
  if (!gaps || !gaps.toLeader) return "Leader";
  const laps = gaps.toLeader.laps;
  const ms = gaps.toLeader.ms;
  if (laps !== null && laps !== undefined && Number(laps) > 0) return `+${laps}L`;
  if (ms !== null && ms !== undefined && Number(ms) > 0) return `+${(Number(ms) / 1000).toFixed(3)}s`;
  return "Leader";
};

export default function VoitureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params.id as string;
  const { cars, context, messages: liveMessages } = useLiveTiming('JSON'); 
  
  const [globalStatus, setGlobalStatus] = useState("WAITING");
  
  const [config, setConfig] = useState({ 
    capaMax: 80, consoGreen: 1.7, timeGreenStr: "2:55.000", consoFcy: 0.7, timeFcyStr: "7:00.000",
    alertOrangePct: 35, alertRedPct: 17, pitLossTime: 65, maxStintTime: 65, stintAlertMin: 10,
    pitBaseTime: 35, pitRefuelTime: 30, pitDriverTime: 15
  });
  
  const [currentFuel, setCurrentFuel] = useState<number>(0);
  const [pilotes, setPilotes] = useState<Pilote[]>([]);
  const [stints, setStints] = useState<Stint[]>([]);
  const [lapHistory, setLapHistory] = useState<LapRecord[]>([]);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([{ role: 'ai', content: `Terminal IA connecté.`, timestamp: new Date().toLocaleTimeString() }]);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  const [gapHistory, setGapHistory] = useState<any[]>([]);

  const [pitMode, setPitMode] = useState<'DT' | 'REFUEL' | 'DRIVER' | 'FULL' | 'CUSTOM'>('FULL');
  const [customPitTime, setCustomPitTime] = useState<number>(65);
  
  const [pitStopsHistory, setPitStopsHistory] = useState<PitStopRecord[]>([]);
  const [currentPitTimer, setCurrentPitTimer] = useState<number | null>(null);
  const [rcHistory, setRcHistory] = useState<RcMessage[]>([]);
  const pitEntryTimeRef = useRef<number | null>(null);
  const prevPitStateRef = useRef<boolean>(false);
  
  const lastLapRef = useRef<number | null>(null);
  const carStateRef = useRef<string>('RUN'); 
  const currentSectorsRef = useRef({ s1: '-', s2: '-', s3: '-' });
  const competitorsPaceRef = useRef<Record<string, Record<number, number>>>({});

  const safeCars = useMemo(() => Array.isArray(cars) ? cars : [], [cars]);
  const sortedCars = useMemo(() => [...safeCars].sort((a: any, b: any) => (parseInt(a.position) || 999) - (parseInt(b.position) || 999)), [safeCars]);
  const carIndex = useMemo(() => sortedCars.findIndex((c: any) => String(c?.car_number || c?.num) === String(carId)), [sortedCars, carId]);
  const liveCarData = useMemo(() => carIndex !== -1 ? sortedCars[carIndex] : null, [sortedCars, carIndex]);
  const battleGroup = useMemo(() => {
    if (carIndex === -1) return [];
    return sortedCars.slice(Math.max(0, carIndex - 2), Math.min(sortedCars.length - 1, carIndex + 2) + 1);
  }, [sortedCars, carIndex]);

  useEffect(() => {
    const fetchRC = async () => {
      try {
        const res = await fetch('/api/messages');
        if (res.ok) {
          const data = await res.json();
          if (data.trackStatus) setGlobalStatus(data.trackStatus);
          if (data.message) {
            setRcHistory(prev => {
              if (prev.length === 0 || prev[0].msg !== data.message) {
                return [{ time: new Date().toLocaleTimeString(), msg: data.message }, ...prev].slice(0, 30);
              }
              return prev;
            });
          }
        }
      } catch (e) {}
    };
    fetchRC();
    const int = setInterval(fetchRC, 5000);
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    if (globalStatus === "WAITING" && context?.session?.track_state) {
      setGlobalStatus(context.session.track_state);
    }
  }, [globalStatus, context?.session?.track_state]);

  useEffect(() => {
    if (liveMessages && liveMessages.length > 0) {
      const rcEvents = liveMessages.filter((e:any) => e.kind === "RC_MESSAGE");
      if (rcEvents.length > 0) {
        const msg = rcEvents[rcEvents.length - 1].message;
        setRcHistory(prev => {
          if (prev.length === 0 || prev[0].msg !== msg) return [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 30);
          return prev;
        });
      }
    }
  }, [liveMessages]);

  useEffect(() => {
    const savedConfig = localStorage.getItem(`car_config_${carId}`);
    let parsedCapa = 80;
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      parsedCapa = Number(parsed.capaMax) || 80;
      setConfig({ ...config, ...parsed });
    }
    const savedSession = localStorage.getItem(`car_session_${carId}`);
    if (savedSession) {
      try {
        const sess = JSON.parse(savedSession);
        if (sess.pilotes) setPilotes(sess.pilotes);
        if (sess.stints) setStints(sess.stints);
        if (sess.aiMessages) setAiMessages(sess.aiMessages);
        if (sess.lapHistory) setLapHistory(sess.lapHistory);
        if (sess.pitStopsHistory) setPitStopsHistory(sess.pitStopsHistory);
        if (sess.currentFuel !== undefined) setCurrentFuel(sess.currentFuel);
        else setCurrentFuel(parsedCapa);
      } catch (e) { setCurrentFuel(parsedCapa); }
    } else { setCurrentFuel(parsedCapa); }
    setIsLoaded(true);
  }, [carId]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem(`car_session_${carId}`, JSON.stringify({ pilotes, stints, aiMessages, lapHistory, pitStopsHistory, currentFuel }));
  }, [pilotes, stints, aiMessages, lapHistory, pitStopsHistory, currentFuel, isLoaded, carId]);

  useEffect(() => {
    const rawState = liveCarData?.lap?.car_state || 'RUN';
    carStateRef.current = String(rawState).toUpperCase();
  }, [liveCarData?.lap?.car_state]);

  useEffect(() => {
    if (!liveCarData?.lap) return;
    if (liveCarData.lap.s1_ms) currentSectorsRef.current.s1 = (liveCarData.lap.s1_ms / 1000).toFixed(3);
    if (liveCarData.lap.s2_ms) currentSectorsRef.current.s2 = (liveCarData.lap.s2_ms / 1000).toFixed(3);
    if (liveCarData.lap.s3_ms) currentSectorsRef.current.s3 = (liveCarData.lap.s3_ms / 1000).toFixed(3);
  }, [liveCarData?.lap?.s1_ms, liveCarData?.lap?.s2_ms, liveCarData?.lap?.s3_ms]);

  useEffect(() => {
    if (!safeCars) return;
    safeCars.forEach((c: any) => {
      const ms = c.lap?.lap_time_ms;
      const lapNum = c.lap?.lap_number;
      if (ms && lapNum) {
        const carKey = String(c.car_number || c.num);
        if (!competitorsPaceRef.current[carKey]) competitorsPaceRef.current[carKey] = {};
        competitorsPaceRef.current[carKey][lapNum] = ms;
      }
    });
  }, [safeCars]);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = String(carStateRef.current || '');
      const isRun = state === 'RUN' || state === 'TRACK' || (!state.includes('IN') && !state.includes('FUEL') && state !== 'PIT');
      const isIn = state === 'IN' || state === 'PITIN' || state === 'PIT' || state === 'FUEL';
      const isFuel = state === 'FUEL' || state === 'REFUEL';

      setPilotes(prev => prev.map((p: Pilote) => {
        if (p.statut === 'AU_VOLANT') {
          if (isRun) return { ...p, stintActuel: p.stintActuel + 1, totalRoulé: p.totalRoulé + 1 };
          if (isIn) return { ...p, stintActuel: 0 };
        }
        return p;
      }));
      if (isFuel) setCurrentFuel(prev => prev < config.capaMax ? config.capaMax : prev);

      // --- CHRONO PIT STOP ---
      if (isIn && !prevPitStateRef.current) {
        pitEntryTimeRef.current = Date.now();
        setCurrentPitTimer(0);
      } else if (!isIn && prevPitStateRef.current && pitEntryTimeRef.current) {
        const durationSec = Math.floor((Date.now() - pitEntryTimeRef.current) / 1000);
        setPitStopsHistory(prev => [{
          id: Date.now(), lap: lastLapRef.current || 0, timeIn: new Date().toLocaleTimeString(), durationSec
        }, ...prev].slice(0, 20)); 
        pitEntryTimeRef.current = null;
        setCurrentPitTimer(null);
      } else if (isIn && pitEntryTimeRef.current) {
        setCurrentPitTimer(Math.floor((Date.now() - pitEntryTimeRef.current) / 1000));
      }
      prevPitStateRef.current = isIn;

    }, 1000); 
    return () => clearInterval(interval);
  }, [config.capaMax]);

  useEffect(() => {
    if (liveCarData?.driver) {
      const risName = String(liveCarData.driver || '').trim().toLowerCase();
      setPilotes(prevPilotes => prevPilotes.map((p: Pilote) => {
        const isMatch = p.nomRIS && String(p.nomRIS || '').trim().toLowerCase() === risName;
        if (isMatch) return { ...p, statut: 'AU_VOLANT', stintActuel: p.statut !== 'AU_VOLANT' ? 0 : p.stintActuel };
        return { ...p, statut: 'REPOS' };
      }));
    }
  }, [liveCarData?.driver]);

  useEffect(() => {
    if (liveCarData?.lap && liveCarData.lap.lap_number > 0) {
      if (lastLapRef.current === null) {
        lastLapRef.current = liveCarData.lap.lap_number;
      } else if (liveCarData.lap.lap_number > lastLapRef.current) {
        const lapsDone = liveCarData.lap.lap_number - lastLapRef.current;
        const lapTimeMs = liveCarData.lap.lap_time_ms;
        const greenMs = parseLapToMs(config.timeGreenStr) || 175000;
        const fcyMs = parseLapToMs(config.timeFcyStr) || 420000;
        
        let lapConso = config.consoGreen;
        if (lapTimeMs && lapTimeMs > 0) {
          if (lapTimeMs <= greenMs) lapConso = config.consoGreen; 
          else if (lapTimeMs >= fcyMs) lapConso = config.consoFcy; 
          else {
            const ratio = (lapTimeMs - greenMs) / (fcyMs - greenMs);
            lapConso = config.consoGreen - (ratio * (config.consoGreen - config.consoFcy));
          }
        } else {
          const safeStatus = String(globalStatus || '').toUpperCase();
          lapConso = safeStatus.includes('FCY') || safeStatus.includes('YELLOW') ? config.consoFcy : config.consoGreen;
        }

        setCurrentFuel(prev => parseFloat(Math.max(0, prev - (lapsDone * lapConso)).toFixed(2)));
        
        const newLap: LapRecord = {
          id: Date.now(), lapNumber: lastLapRef.current, driverRIS: String(liveCarData.driver || 'Inconnu'),
          s1: currentSectorsRef.current.s1, s2: currentSectorsRef.current.s2, s3: currentSectorsRef.current.s3,
          lapTime: formatMsToLapTime(lapTimeMs), lapTimeMs: lapTimeMs || Infinity
        };

        setLapHistory(prev => [newLap, ...prev].slice(0, 1000));
        lastLapRef.current = liveCarData.lap.lap_number;
        currentSectorsRef.current = { s1: '-', s2: '-', s3: '-' };
      }
    }
  }, [liveCarData?.lap?.lap_number, globalStatus, config.consoGreen, config.consoFcy, config.timeGreenStr, config.timeFcyStr, liveCarData?.lap?.lap_time_ms, liveCarData?.driver]);

  const fuelPct = config.capaMax > 0 ? (currentFuel / config.capaMax) * 100 : 0;
  const isFuelWarning = fuelPct <= config.alertOrangePct && fuelPct > config.alertRedPct;
  const isFuelCritical = fuelPct <= config.alertRedPct && currentFuel > 0;
  
  const activePilote = pilotes.find(p => p.statut === 'AU_VOLANT');
  const maxStintSec = config.maxStintTime * 60;
  const isStintCritical = activePilote ? (maxStintSec - activePilote.stintActuel <= config.stintAlertMin * 60) : false;
  const mustPitNow = isFuelCritical || isStintCritical;

  const driverPace = useMemo(() => {
    if (!activePilote || !activePilote.nomRIS) return null;
    const driverLaps = lapHistory.filter((l: LapRecord) => String(l.driverRIS || '').toLowerCase() === String(activePilote.nomRIS || '').toLowerCase() && l.lapTimeMs !== Infinity);
    if (driverLaps.length < 3) return null; 
    
    const current3Laps = driverLaps.slice(0, 3);
    const avgCurrentMs = current3Laps.reduce((acc, curr) => acc + curr.lapTimeMs, 0) / 3;
    let trend: 'improving' | 'worsening' | 'stable' = 'stable';
    let deltaStr = "";

    if (driverLaps.length >= 4) {
      const prev3Laps = driverLaps.slice(1, 4);
      const avgPrevMs = prev3Laps.reduce((acc, curr) => acc + curr.lapTimeMs, 0) / 3;
      const deltaMs = avgCurrentMs - avgPrevMs;
      if (Math.abs(deltaMs) <= 300) { trend = 'stable'; deltaStr = "⚖️ ="; } 
      else if (deltaMs > 0) { trend = 'worsening'; deltaStr = `↘️ +${(deltaMs / 1000).toFixed(2)}s`; } 
      else { trend = 'improving'; deltaStr = `↗️ ${(deltaMs / 1000).toFixed(2)}s`; }
    }
    return { avgStr: formatMsToLapTime(avgCurrentMs), trend, deltaStr };
  }, [lapHistory, activePilote]);

  const ourGapToLeaderMs = liveCarData?.gaps?.toLeader?.ms;
  
  useEffect(() => {
    if (!liveCarData || battleGroup.length === 0) return;
    const currentLap = liveCarData.lap?.lap_number || 0;
    
    setGapHistory(prev => {
      const existingIdx = prev.findIndex(item => item.lap === currentLap);
      const newData: any = { lap: currentLap };
      const ourGapSec = getAbsoluteGapMs(liveCarData) / 1000;
      
      battleGroup.forEach((c: any) => {
        if (String(c.car_number || c.num) !== String(carId)) {
          const competitorGapSec = getAbsoluteGapMs(c) / 1000;
          newData[`car_${c.car_number || c.num}`] = parseFloat((ourGapSec - competitorGapSec).toFixed(2));
        }
      });
      
      if (existingIdx >= 0) {
        const updated = [...prev]; updated[existingIdx] = { ...updated[existingIdx], ...newData }; return updated;
      } else return [...prev, newData].slice(-15);
    });
  }, [ourGapToLeaderMs]); 

  // 🚀 AWS BATTLE FORECAST (UTILISE LE GAP TO LEADER ABSOLU) 🚀
  const overtakePredictions = useMemo(() => {
    if (!liveCarData || carIndex === -1 || sortedCars.length === 0) return { attack: null, defend: null };

    const getAveragePace = (carNum: string) => {
      const history = competitorsPaceRef.current[carNum] || {};
      const lapNums = Object.keys(history).map(Number).sort((a,b) => b - a);
      const validLaps = lapNums.map(n => history[n]).filter(ms => ms > 60000 && ms < 600000); 

      if (validLaps.length >= 2) return { ms: (validLaps[0] + validLaps[1]) / 2, method: "2-LAP PACE AVG" };
      else if (validLaps.length === 1) return { ms: validLaps[0], method: "LAST LAP PACE" };
      return { ms: Infinity, method: "NO PACE DATA" };
    };

    const ourPaceData = getAveragePace(String(carId));
    const ourAbsoluteMs = getAbsoluteGapMs(liveCarData);

    const getPrediction = (targetCar: any, isAhead: boolean) => {
      const targetPaceData = getAveragePace(String(targetCar.car_number || targetCar.num));
      const targetAbsoluteMs = getAbsoluteGapMs(targetCar);
      
      // On calcule l'écart direct en ms entre les 2 voitures depuis le Leader
      const currentAbsoluteGapMs = Math.abs(ourAbsoluteMs - targetAbsoluteMs) || 100;

      let paceAdvantageSec = 0;
      let valid = false;
      let calcMethod = "GATHERING DATA";

      if (ourPaceData.ms !== Infinity && targetPaceData.ms !== Infinity) {
        paceAdvantageSec = (targetPaceData.ms - ourPaceData.ms) / 1000;
        valid = true;
        calcMethod = (ourPaceData.method.includes("2-LAP") && targetPaceData.method.includes("2-LAP")) ? "2-LAP PACE AVG" : "1-LAP PACE";
      }

      let trend: 'GOOD' | 'BAD' | 'STABLE' = 'STABLE';
      let statusText = "PACE MATCHED";
      let lapsToCatch = Infinity;

      if (valid) {
        if (isAhead) {
          if (paceAdvantageSec > 0.5) { trend = 'GOOD'; statusText = 'CATCHING'; lapsToCatch = (currentAbsoluteGapMs / 1000) / paceAdvantageSec; } 
          else if (paceAdvantageSec < -0.5) { trend = 'BAD'; statusText = 'LOSING GROUND'; }
        } else {
          if (paceAdvantageSec > 0.5) { trend = 'GOOD'; statusText = 'PULLING AWAY'; } 
          else if (paceAdvantageSec < -0.5) { trend = 'BAD'; statusText = 'BEING CAUGHT'; lapsToCatch = (currentAbsoluteGapMs / 1000) / Math.abs(paceAdvantageSec); }
        }
      }

      return {
        type: isAhead ? 'ATTACK' : 'DEFEND', 
        targetCar: targetCar.car_number || targetCar.num, 
        targetTeam: targetCar.team,
        paceAdvantageSec: valid ? Math.abs(paceAdvantageSec).toFixed(2) : "0.00",
        trend, statusText, calcMethod, 
        gapSec: (currentAbsoluteGapMs / 1000).toFixed(3),
        lapsRemaining: lapsToCatch !== Infinity && lapsToCatch < 999 && valid ? Math.ceil(lapsToCatch) : '-',
        predictedLap: lapsToCatch !== Infinity && lapsToCatch < 999 && valid ? ((liveCarData.lap?.lap_number || 0) + Math.ceil(lapsToCatch)) : '-'
      };
    };

    const result: any = { attack: null, defend: null };
    if (carIndex > 0) result.attack = getPrediction(sortedCars[carIndex - 1], true);
    if (carIndex < sortedCars.length - 1) result.defend = getPrediction(sortedCars[carIndex + 1], false);

    return result;
  }, [sortedCars, liveCarData, carIndex]);

  const currentPitLoss = useMemo(() => {
    if (pitMode === 'DT') return config.pitBaseTime; 
    if (pitMode === 'REFUEL') return config.pitBaseTime + config.pitRefuelTime; 
    if (pitMode === 'DRIVER') return config.pitBaseTime + config.pitDriverTime; 
    if (pitMode === 'FULL') return config.pitBaseTime + config.pitRefuelTime + config.pitDriverTime; 
    return customPitTime; 
  }, [pitMode, customPitTime, config]);

  const predictorGroup = useMemo(() => {
    if (!liveCarData) return [];
    const ourAbsoluteMs = getAbsoluteGapMs(liveCarData);
    const estimatedExitMs = ourAbsoluteMs + (currentPitLoss * 1000);
    
    const carsWithGaps = sortedCars.map((c: any) => ({ 
      ...c, absoluteMs: getAbsoluteGapMs(c), isGhost: false 
    })); 
    
    const ghostCar = {
      isGhost: true, num: "GHOST", position: "-", team: "📍 NOTRE SORTIE STAND", driver: "Simulation", 
      absoluteMs: estimatedExitMs, gaps: { toLeader: { laps: 0, ms: estimatedExitMs }}
    };
    
    const carsWithGhost = [...carsWithGaps, ghostCar].sort((a: any, b: any) => a.absoluteMs - b.absoluteMs);
    const ghostIndex = carsWithGhost.findIndex((c: any) => c.isGhost);
    return carsWithGhost.slice(Math.max(0, ghostIndex - 2), Math.min(carsWithGhost.length - 1, ghostIndex + 2) + 1);
  }, [sortedCars, liveCarData, currentPitLoss]);

  const addPilote = () => setPilotes([...pilotes, { id: Date.now(), nom: `Pilote ${pilotes.length + 1}`, nomRIS: '', statut: pilotes.length === 0 ? 'AU_VOLANT' : 'REPOS', stintActuel: 0, totalRoulé: 0, totalMax: 120 }]);
  const updatePilote = (id: number, field: string, value: any) => setPilotes(pilotes.map((p: Pilote) => p.id === id ? { ...p, [field]: value } : p));
  const setPiloteAuVolant = (id: number) => setPilotes(pilotes.map((p: Pilote) => ({ ...p, statut: p.id === id ? 'AU_VOLANT' : 'REPOS' })));
  const addStint = () => setStints([...stints, { id: Date.now(), driver: '', laps: 15, tire: 'Slick' }]);
  const updateStint = (id: number, field: string, value: any) => setStints(stints.map((s: Stint) => s.id === id ? { ...s, [field]: value } : s));
  const removeStint = (id: number) => setStints(stints.filter((s: Stint) => s.id !== id));

  const greenSeconds = useMemo(() => {
    const parts = String(config.timeGreenStr || '').split(':');
    return parts.length < 2 ? 135 : (parseInt(parts[0]) * 60) + parseFloat(parts[1]);
  }, [config.timeGreenStr]);

  const calculatedStints = useMemo(() => {
    let elapsedSec = 0; let currentLap = liveCarData?.lap?.lap_number || 0;
    const defaultFullPitLoss = config.pitBaseTime + config.pitRefuelTime + config.pitDriverTime;
    return stints.map((stint: Stint) => {
      const startSec = elapsedSec;
      const duration = stint.laps * greenSeconds;
      const endSec = startSec + duration;
      const startLap = currentLap + 1;
      const endLap = currentLap + stint.laps;
      elapsedSec = endSec + defaultFullPitLoss; 
      currentLap = endLap;
      const formatTime = (ts: number) => { const h = Math.floor(ts / 3600); const m = Math.floor((ts % 3600) / 60); return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; };
      return { ...stint, startTimeStr: formatTime(startSec), endTimeStr: formatTime(endSec), startLap, endLap };
    });
  }, [stints, greenSeconds, config, liveCarData?.lap?.lap_number]);

  const uniqueDriversRIS = useMemo(() => {
    const drivers = new Set<string>();
    lapHistory.forEach((l: LapRecord) => drivers.add(l.driverRIS));
    return Array.from(drivers);
  }, [lapHistory]);

  const bestLapsPerDriver = useMemo(() => {
    const bestLapsMap = new Map<string, { driverRIS: string, bestTimeStr: string, bestTimeMs: number }>();
    lapHistory.forEach((lap: LapRecord) => {
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
    const matched = pilotes.find((p: Pilote) => String(p.nomRIS || '').toLowerCase() === String(risName || '').toLowerCase());
    return matched ? matched.nom : String(risName || '');
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
      mockResponse = `Bien reçu. La piste est sous ${globalStatus}. Avec ${toursRestants} tours restants avant panne sèche, je garde un œil sur la fenêtre stratégique.`;
      setAiMessages(prev => [...prev, { role: 'ai', content: mockResponse, timestamp: new Date().toLocaleTimeString() }]);
      setIsAiTyping(false);
    }, 1500);
  };

  let fuelColorText = 'text-white'; let fuelBorderColor = 'border-gray-800'; let fuelTitleColor = 'text-[#00ff66]';
  if (isFuelWarning) { fuelColorText = 'text-orange-500'; fuelBorderColor = 'border-orange-500'; fuelTitleColor = 'text-orange-500'; } 
  else if (isFuelCritical) { fuelColorText = 'text-red-500 animate-pulse'; fuelBorderColor = 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'; fuelTitleColor = 'text-red-500 animate-pulse'; }

  const RenderAwsBox = ({ data }: { data: any }) => {
    if (!data) return (
      <div className="flex-1 flex items-center justify-center p-6 rounded-lg bg-[#0B0C10]/50 border border-gray-800 font-sans italic text-gray-600">
        Pas de cible détectée
      </div>
    );

    const themeColor = data.trend === 'GOOD' ? '#00ff66' : (data.trend === 'BAD' ? '#ff3333' : '#ffaa00');
    const bgGradient = data.trend === 'GOOD' ? 'from-[#003311]/80' : (data.trend === 'BAD' ? 'from-[#440000]/80' : 'from-[#442D00]/80');
    const deltaSign = data.trend === 'GOOD' ? '-' : (data.trend === 'BAD' ? '+' : '±');

    return (
      <div className={`flex-1 flex flex-col p-5 rounded-lg border backdrop-blur-sm shadow-xl transition-all duration-500 bg-gradient-to-r ${bgGradient} to-[#0B0C10]`}
           style={{ borderColor: `${themeColor}50`, boxShadow: `0 0 15px ${themeColor}15` }}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{data.type === 'ATTACK' ? '🎯' : '🛡️'}</span>
            <div className="flex flex-col">
              <span className="font-black text-sm tracking-widest" style={{ color: themeColor }}>{data.statusText}</span>
              <span className="text-white font-bold text-sm">#{data.targetCar} {data.targetTeam}</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] bg-black/50 px-2 py-0.5 rounded text-gray-400 border border-gray-700">Gap: <strong className="text-white">{data.gapSec}s</strong></span>
            <span className="text-[8px] text-gray-500 mt-1 uppercase">Via {data.calcMethod}</span>
          </div>
        </div>

        <div className="flex justify-between items-end mt-2">
          <div className="flex gap-1 ml-2">
            {[0, 1, 2, 3, 4].map(idx => {
              let animDelay = '0s';
              if (data.trend === 'GOOD') animDelay = `${idx * 0.15}s`;
              else if (data.trend === 'BAD') animDelay = `${(4 - idx) * 0.15}s`;
              return (
                <svg key={idx} className={data.trend === 'GOOD' ? 'aws-arrow-good' : (data.trend === 'BAD' ? 'aws-arrow-bad' : 'aws-arrow-stable')} 
                     style={{ animationDelay: animDelay, color: themeColor }} width="16" height="26" viewBox="0 0 14 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d={data.trend === 'BAD' ? "M12 2L2 12L12 22" : "M2 2L12 12L2 22"}/>
                </svg>
              )
            })}
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-[9px] text-gray-400 uppercase tracking-widest">Pace Delta</span>
            <span className="text-base font-black px-2 py-0.5 rounded border mt-1" style={{ backgroundColor: `${themeColor}15`, color: themeColor, borderColor: `${themeColor}30` }}>
              {deltaSign}{data.paceAdvantageSec}s
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">
              {data.trend === 'GOOD' && data.type === 'ATTACK' ? 'STRIKING IN' : data.trend === 'BAD' && data.type === 'DEFEND' ? 'BEING CAUGHT IN' : 'DISTANCE MAINTAINED'}
            </span>
            <span className="text-3xl font-black text-white leading-none shadow-sm whitespace-nowrap">
              {data.lapsRemaining} <span className="text-sm text-gray-400 font-normal">Laps</span>
            </span>
            <span className="text-xs font-bold mt-1" style={{ color: data.trend === 'STABLE' ? '#888' : themeColor }}>
              Target Lap: {data.predictedLap}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (!isLoaded) return <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center text-white font-mono">Chargement télémétrie...</div>;

  return (
    <div className="min-h-screen bg-[#0B0C10] w-full pl-[100px] pt-[56px] relative overflow-x-hidden">
      
      <style>{`
        @keyframes aws-wave-good {
            0%, 100% { opacity: 0.2; transform: translateX(-3px) scale(0.9); filter: drop-shadow(0 0 0px transparent); }
            50% { opacity: 1; transform: translateX(3px) scale(1.1); filter: drop-shadow(0 0 6px #00ff66); }
        }
        @keyframes aws-wave-bad {
            0%, 100% { opacity: 0.2; transform: translateX(3px) scale(0.9); filter: drop-shadow(0 0 0px transparent); }
            50% { opacity: 1; transform: translateX(-3px) scale(1.1); filter: drop-shadow(0 0 6px #ff3333); }
        }
        @keyframes aws-pulse-stable {
            0%, 100% { opacity: 0.3; filter: drop-shadow(0 0 0px transparent); transform: scale(0.95); }
            50% { opacity: 1; filter: drop-shadow(0 0 6px #ffaa00); transform: scale(1.05); }
        }
        .aws-arrow-good { animation: aws-wave-good 1s infinite; margin: 0 -3px; }
        .aws-arrow-bad { animation: aws-wave-bad 1s infinite; margin: 0 -3px; }
        .aws-arrow-stable { animation: aws-pulse-stable 1.5s infinite; margin: 0 -3px; }
      `}</style>

      <div className={`p-6 font-sans transition-colors duration-500 min-h-[calc(100vh-56px)] ${mustPitNow ? 'bg-red-950/40' : 'bg-transparent'}`}>
        
        {mustPitNow && (
          <div className="bg-red-600 text-white font-black text-center py-2 text-xl tracking-widest uppercase animate-pulse mb-6 rounded shadow-lg border border-red-400 mt-4">
            ⚠️ BOX THIS LAP - {isStintCritical ? `LIMITE TEMPS PILOTE (${activePilote?.nom})` : 'CARBURANT CRITIQUE'} ⚠️
          </div>
        )}

        <div className="flex justify-between items-start border-b border-gray-800 pb-4 mb-6 mt-4">
          <div className="flex items-center space-x-4">
            <span className="text-5xl font-black text-[#66FCF1]">#{carId}</span>
            <div>
              <h1 className="text-2xl font-bold text-white">{liveCarData?.team || 'Écurie Connectée'}</h1>
              <p className="text-sm text-gray-400 font-mono">P{liveCarData?.position || '?'} | Piste : <span className="text-[#00ff66]">{globalStatus}</span></p>
              <p className="text-xs text-gray-500 font-mono mt-1">Pilote RIS détecté : <span className="text-[#ffaa00] font-bold">{liveCarData?.driver || 'Inconnu'}</span> | Statut : <span className="text-white font-black">{carStateRef.current}</span></p>
            </div>
          </div>
          <button onClick={() => router.push(`/voiture/${carId}/config`)} className="bg-[#1F2833] hover:bg-[#45A29E] hover:text-black text-[#66FCF1] font-bold py-2 px-4 rounded border border-gray-700 transition text-sm shadow">⚙️ PARAMÈTRES ET LIMITES</button>
        </div>

        <div className="bg-gradient-to-b from-[#1a1c23] to-[#0B0C10] p-6 rounded-lg border border-gray-700 shadow-2xl relative overflow-hidden mb-8">
          <div className="absolute inset-0 opacity-[0.03] bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#ffffff_10px,#ffffff_20px)] pointer-events-none" />
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="text-white font-black text-lg tracking-wider uppercase flex items-center gap-2">
              <span className="text-2xl">⚡</span> AWS BATTLE FORECAST
            </h3>
            <span className="text-xs bg-[#0B0C10] px-3 py-1.5 rounded font-mono text-gray-400 border border-gray-700 shadow-sm">
              SMART PACE CALCULATOR
            </span>
          </div>
          <div className="flex flex-col xl:flex-row gap-6 font-mono relative z-10">
            <RenderAwsBox data={overtakePredictions.attack} />
            <RenderAwsBox data={overtakePredictions.defend} />
          </div>
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
              <div className={`bg-[#0B0C10] p-3 rounded text-center border shadow-inner flex flex-col justify-center flex-1 relative ${isStintCritical ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-gray-800'}`}>
                
                {currentPitTimer !== null && (
                  <div className="absolute inset-0 bg-yellow-900/95 flex flex-col items-center justify-center rounded z-20 backdrop-blur-sm shadow-[0_0_30px_rgba(255,170,0,0.5)] border-2 border-[#ffaa00]">
                    <span className="text-[#ffaa00] font-black text-sm tracking-widest animate-pulse mb-2 drop-shadow-md">⏱️ PIT STOP IN PROGRESS</span>
                    <span className="text-6xl font-mono font-black text-white drop-shadow-[0_0_10px_#ffaa00]">{currentPitTimer}s</span>
                  </div>
                )}

                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 truncate">{activePilote?.nom || 'AUCUN PILOTE DÉTECTÉ'}</p>
                <p className={`text-4xl font-mono font-black tracking-wider ${isStintCritical ? 'text-red-500 animate-pulse' : 'text-[#66FCF1]'}`}>
                  {formatLiveTimer(activePilote?.stintActuel || 0)}
                </p>
                <p className="text-[10px] text-gray-500 mt-1 mb-2">
                  Max Légal : {config.maxStintTime} min | Alerte : -{config.stintAlertMin} min
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
              <h3 className="text-[#00ff66] font-bold text-sm tracking-wider uppercase">👥 Pilotes & Config</h3>
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
                    {liveCarData?.driver && (!pilote.nomRIS || String(pilote.nomRIS || '').toLowerCase() !== String(liveCarData.driver || '').toLowerCase()) ? (
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
              <div className="bg-[#0B0C10] p-4 rounded text-center border border-gray-800 flex flex-col justify-center"><p className="text-gray-500 text-[10px] uppercase font-bold">Dernier</p><p className="text-2xl font-mono font-bold text-white mt-1">{liveCarData?.lap?.lap_time_ms ? formatMsToLapTime(liveCarData.lap.lap_time_ms) : '-:--'}</p></div>
              <div className="bg-[#0B0C10] p-4 rounded text-center border border-gray-800 flex flex-col justify-center"><p className="text-gray-500 text-[10px] uppercase font-bold">Meilleur</p><p className="text-2xl font-mono font-bold text-purple-400 mt-1">{liveCarData?.lap?.best_lap_ms ? formatMsToLapTime(liveCarData.lap.best_lap_ms) : '-:--'}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#0B0C10] p-2 rounded border border-gray-800"><span className="text-gray-500 font-bold">S1</span><p className="font-mono text-white mt-1">{liveCarData?.lap?.s1_ms ? (liveCarData.lap.s1_ms/1000).toFixed(3) : '-'}</p></div>
              <div className="bg-[#0B0C10] p-2 rounded border border-gray-800"><span className="text-gray-500 font-bold">S2</span><p className="font-mono text-white mt-1">{liveCarData?.lap?.s2_ms ? (liveCarData.lap.s2_ms/1000).toFixed(3) : '-'}</p></div>
              <div className="bg-[#0B0C10] p-2 rounded border border-gray-800"><span className="text-gray-500 font-bold">S3</span><p className="font-mono text-white mt-1">{liveCarData?.lap?.s3_ms ? (liveCarData.lap.s3_ms/1000).toFixed(3) : '-'}</p></div>
            </div>
          </div>
        </div>

        {/* 🚀 BLOC HISTORIQUE DES MESSAGES & PIT STOPS 🚀 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          
          <div className="bg-[#1a1c23] p-5 rounded-lg border border-gray-800 shadow-xl flex flex-col max-h-[300px]">
            <h3 className="text-[#ffaa00] font-black text-sm tracking-wider uppercase mb-4 flex items-center border-b border-gray-700 pb-2">
              <span className="mr-2">⏱️</span> HISTORIQUE DES PIT STOPS
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {pitStopsHistory.length === 0 ? (
                <p className="text-xs text-gray-500 italic text-center py-4">Aucun arrêt aux stands enregistré.</p>
              ) : (
                pitStopsHistory.map(pit => (
                  <div key={pit.id} className="flex justify-between items-center bg-[#0B0C10] p-3 rounded border border-gray-800">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-500">Lap {pit.lap}</span>
                      <span className="text-xs text-gray-400">@ {pit.timeIn}</span>
                    </div>
                    <span className="text-lg font-black text-[#ffaa00] font-mono">{pit.durationSec}s</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[#1a1c23] p-5 rounded-lg border border-gray-800 shadow-xl flex flex-col max-h-[300px]">
            <h3 className="text-[#ff3333] font-black text-sm tracking-wider uppercase mb-4 flex items-center border-b border-gray-700 pb-2">
              <span className="mr-2">📢</span> RACE CONTROL MESSAGES
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {rcHistory.length === 0 ? (
                <p className="text-xs text-gray-500 italic text-center py-4">Aucun message de la direction de course.</p>
              ) : (
                rcHistory.map((rc, idx) => (
                  <div key={idx} className="flex gap-3 bg-[#0B0C10] p-2.5 rounded border border-gray-800 items-start">
                    <span className="text-[10px] text-gray-500 font-mono mt-0.5 whitespace-nowrap">[{rc.time}]</span>
                    <span className="text-xs font-bold text-white uppercase">{rc.msg}</span>
                  </div>
                ))
              )}
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
                {battleGroup.filter((c: any) => String(c?.car_number || c?.num) !== String(carId)).map((c: any, index: number) => (
                  <Line key={c.car_number || c.num} type="monotone" dataKey={`car_${c.car_number || c.num}`} name={`#${c.car_number || c.num} ${c.team}`} stroke={chartColors[index % chartColors.length]} strokeWidth={3} dot={{ r: 3, fill: '#0B0C10' }} activeDot={{ r: 6 }} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 🚀 BATAILLE DIRECTE ET PRÉDICTEUR DE STAND 🚀 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          
          <div className="bg-[#1a1c23] p-5 rounded-lg border border-gray-800 shadow-xl">
            <h3 className="text-[#ffaa00] font-black text-sm tracking-wider mb-4 uppercase">⚔️ LA BATAILLE DIRECTE</h3>
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-[#0B0C10] text-gray-400 uppercase tracking-wider border-b border-gray-800">
                  <th className="p-3">Pos</th><th className="p-3">N°</th><th className="p-3 font-sans">Équipe</th><th className="p-3">GAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {battleGroup.map((c: any) => {
                  const isUs = String(c?.car_number || c?.num) === String(carId);
                  return (
                    <tr key={c.car_number || c.num} className={isUs ? 'bg-[#153035] font-bold border-l-4 border-[#66FCF1]' : 'hover:bg-[#1F2833]'}>
                      <td className="p-3 text-gray-400">P{c.position || c.pos}</td>
                      <td className="p-3 text-[#ffaa00]">#{c.car_number || c.num}</td>
                      <td className="p-3 font-sans text-white text-sm truncate max-w-[200px]">{c.team}</td>
                      <td className="p-3 text-gray-300">{formatGap(c.gaps)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-[#1a1c23] p-5 rounded-lg border border-[#45A29E] shadow-[0_0_15px_rgba(69,162,158,0.2)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[#66FCF1] font-black text-sm tracking-wider uppercase">🔮 PRÉDICTION SORTIE DES STANDS</h3>
              
              <div className="flex items-center gap-2">
                <select value={pitMode} onChange={e => setPitMode(e.target.value as any)} 
                        className="bg-[#0B0C10] border border-gray-700 text-xs text-white p-1 rounded outline-none font-bold">
                  <option value="DT">Drive-Through ({config.pitBaseTime}s)</option>
                  <option value="REFUEL">Pit + Fuel ({config.pitBaseTime + config.pitRefuelTime}s)</option>
                  <option value="DRIVER">Pit + Pilote ({config.pitBaseTime + config.pitDriverTime}s)</option>
                  <option value="FULL">Pit Complet ({config.pitBaseTime + config.pitRefuelTime + config.pitDriverTime}s)</option>
                  <option value="CUSTOM">Custom...</option>
                </select>
                {pitMode === 'CUSTOM' ? (
                  <input type="number" value={customPitTime} onChange={e => setCustomPitTime(Number(e.target.value))} 
                         className="w-14 bg-[#0B0C10] border border-gray-700 text-center text-xs text-[#ffaa00] rounded p-1" />
                ) : (
                  <span className="text-[10px] bg-[#0B0C10] px-2 py-1 rounded text-[#ffaa00] border border-gray-700 font-bold">
                    {currentPitLoss}s
                  </span>
                )}
              </div>
            </div>
            
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-[#0B0C10] text-gray-400 uppercase tracking-wider border-b border-gray-800">
                  <th className="p-2">Statut</th><th className="p-2">N°</th><th className="p-2 font-sans">Équipe</th><th className="p-2">Écart Virtuel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {predictorGroup.map((c: any) => (
                  <tr key={c.num || c.car_number} className={c.isGhost ? 'bg-purple-900/40 font-bold border-l-4 border-purple-500 animate-pulse' : 'hover:bg-[#1F2833]'}>
                    <td className="p-2">{c.isGhost ? 'SORTIE' : `P${c.position || c.pos}`}</td>
                    <td className="p-2 text-[#ffaa00]">{c.num || c.car_number}</td>
                    <td className={`p-2 font-sans text-xs truncate max-w-[120px] ${c.isGhost ? 'text-purple-400' : 'text-white'}`}>{c.team}</td>
                    <td className="p-2 text-gray-300">{c.isGhost ? c.gap : `+${(c.absoluteMs/1000).toFixed(1)}s`}</td>
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
                  {calculatedStints.map((stint: any, index: number) => (
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
    </div>
  );
}