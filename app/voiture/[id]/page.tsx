"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiveTiming } from '../../hooks/useLiveTiming';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

interface Pilote { id: number; nom: string; statut: 'AU_VOLANT' | 'REPOS'; stintActuel: number; stintMax: number; totalRoulé: number; totalMax: number; }
interface Stint { id: number; driver: string; laps: number; tire: string; }
interface AiMessage { role: 'user' | 'ai'; content: string; timestamp: string; }

const parseGapToSeconds = (gapStr?: string): number => {
  if (!gapStr || gapStr === "Leader") return 0;
  if (gapStr.includes("Laps") || gapStr.includes("Lap")) return parseInt(gapStr.replace(/[^0-9]/g, '')) * 135; 
  if (gapStr.includes("s")) return parseFloat(gapStr.replace(/[^0-9.-]/g, ''));
  return 0;
};

export default function VoitureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params.id as string;
  const { cars, status } = useLiveTiming('JSON');
  
  const [config, setConfig] = useState({ capaMax: 80, consoGreen: 3.2, consoFcy: 1.8, timeGreenStr: "2:15.000", alertOrangePct: 35, alertRedPct: 17, pitLossTime: 65 });
  
  // États de la session en cours
  const [currentFuel, setCurrentFuel] = useState<number>(0);
  const [pilotes, setPilotes] = useState<Pilote[]>([]);
  const [stints, setStints] = useState<Stint[]>([]);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    { role: 'ai', content: `Terminal IA Stratégie connecté. Je surveille la voiture #${carId}. Comment puis-je vous aider ?`, timestamp: new Date().toLocaleTimeString() }
  ]);
  
  const [isLoaded, setIsLoaded] = useState(false); // Permet de savoir si la sauvegarde a été chargée
  const [aiInput, setAiInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [gapHistory, setGapHistory] = useState<any[]>([]);
  const lastLapRef = useRef<number | null>(null);

  const liveCarData = cars.find(c => String(c.num) === String(carId));

  // 1. CHARGEMENT DE LA CONFIGURATION ET DE LA SESSION SAUVEGARDÉE
  useEffect(() => {
    // A. Récupération de la config
    const savedConfig = localStorage.getItem(`car_config_${carId}`);
    let parsedCapa = 80;
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      parsedCapa = Number(parsed.capaMax) || 80;
      setConfig({
        capaMax: parsedCapa,
        consoGreen: Number(parsed.consoGreen) || 3.2,
        consoFcy: Number(parsed.consoFcy) || 1.8,
        timeGreenStr: parsed.timeGreenStr || "2:15.000",
        alertOrangePct: Number(parsed.alertOrangePct) || 35,
        alertRedPct: Number(parsed.alertRedPct) || 17,
        pitLossTime: Number(parsed.pitLossTime) || 65
      });
    }

    // B. Récupération de la Session (Pilotes, Relais, Essence, IA)
    const savedSession = localStorage.getItem(`car_session_${carId}`);
    if (savedSession) {
      try {
        const sess = JSON.parse(savedSession);
        if (sess.pilotes) setPilotes(sess.pilotes);
        if (sess.stints) setStints(sess.stints);
        if (sess.aiMessages && sess.aiMessages.length > 0) setAiMessages(sess.aiMessages);
        if (sess.currentFuel !== undefined) {
          setCurrentFuel(sess.currentFuel);
        } else {
          setCurrentFuel(parsedCapa);
        }
      } catch (e) {
        console.error("Erreur de lecture de la session", e);
        setCurrentFuel(parsedCapa);
      }
    } else {
      setCurrentFuel(parsedCapa); // Si aucune session, le réservoir est plein
    }
    
    setIsLoaded(true); // Tout est chargé, on peut démarrer
  }, [carId]);

  // 2. SAUVEGARDE AUTOMATIQUE À CHAQUE MODIFICATION
  useEffect(() => {
    if (isLoaded) {
      const sessionData = { pilotes, stints, aiMessages, currentFuel };
      localStorage.setItem(`car_session_${carId}`, JSON.stringify(sessionData));
    }
  }, [pilotes, stints, aiMessages, currentFuel, isLoaded, carId]);

  // 3. Déduction intelligente de l'essence (Vert vs FCY)
  useEffect(() => {
    if (liveCarData && liveCarData.laps > 0) {
      if (lastLapRef.current === null) {
        lastLapRef.current = liveCarData.laps;
      } else if (liveCarData.laps > lastLapRef.current) {
        const lapsDone = liveCarData.laps - lastLapRef.current;
        const isFcyOrSafety = status.includes('FCY') || status.includes('SAFETY') || status.includes('YELLOW');
        const activeConso = isFcyOrSafety ? config.consoFcy : config.consoGreen;
        const fuelUsed = lapsDone * activeConso;
        setCurrentFuel(prev => parseFloat(Math.max(0, prev - fuelUsed).toFixed(2)));
        lastLapRef.current = liveCarData.laps;
      }
    }
  }, [liveCarData?.laps, status, config.consoGreen, config.consoFcy]);

  const fuelPct = config.capaMax > 0 ? (currentFuel / config.capaMax) * 100 : 0;
  const isFuelWarning = fuelPct <= config.alertOrangePct && fuelPct > config.alertRedPct;
  const isFuelCritical = fuelPct <= config.alertRedPct && currentFuel > 0;
  
  let fuelColorText = 'text-white'; let fuelBorderColor = 'border-gray-800'; let fuelTitleColor = 'text-[#00ff66]';
  if (isFuelWarning) { fuelColorText = 'text-orange-500'; fuelBorderColor = 'border-orange-500'; fuelTitleColor = 'text-orange-500'; } 
  else if (isFuelCritical) { fuelColorText = 'text-red-500 animate-pulse'; fuelBorderColor = 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'; fuelTitleColor = 'text-red-500 animate-pulse'; }

  // 4. Bataille en Piste & Graphique
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

  // 5. Prédiction de Sortie des Stands (Avec le correctif isGhost)
  const predictorGroup = useMemo(() => {
    if (!liveCarData) return [];
    const estimatedExitGap = parseGapToSeconds(liveCarData.gap) + config.pitLossTime;
    const carsWithGaps = cars.map(c => ({ ...c, gapSec: parseGapToSeconds(c.gap), isGhost: false })); // Correctif TypeScript
    const ghostCar = {
      isGhost: true, num: "GHOST", pos: "-", team: "📍 NOTRE SORTIE STAND", driver: "Simulation", 
      gapSec: estimatedExitGap, gap: `+${estimatedExitGap.toFixed(1)}s`, lastLap: "-", s1: "-", s2: "-", s3: "-"
    };
    const carsWithGhost = [...carsWithGaps, ghostCar].sort((a: any, b: any) => a.gapSec - b.gapSec);
    const ghostIndex = carsWithGhost.findIndex(c => c.isGhost);
    return carsWithGhost.slice(Math.max(0, ghostIndex - 2), Math.min(carsWithGhost.length - 1, ghostIndex + 2) + 1);
  }, [cars, liveCarData, config.pitLossTime]);

  // 6. Gestionnaires d'état (Pilotes & Relais)
  const addPilote = () => setPilotes([...pilotes, { id: Date.now(), nom: `Pilote ${pilotes.length + 1}`, statut: pilotes.length === 0 ? 'AU_VOLANT' : 'REPOS', stintActuel: 0, stintMax: 45, totalRoulé: 0, totalMax: 120 }]);
  const updatePilote = (id: number, field: string, value: any) => setPilotes(pilotes.map(p => p.id === id ? { ...p, [field]: value } : p));
  const setPiloteAuVolant = (id: number) => setPilotes(pilotes.map(p => ({ ...p, statut: p.id === id ? 'AU_VOLANT' : 'REPOS' })));
  
  const addStint = () => setStints([...stints, { id: Date.now(), driver: '', laps: 15, tire: 'Slick' }]);
  const updateStint = (id: number, field: string, value: any) => setStints(stints.map(s => s.id === id ? { ...s, [field]: value } : s));
  const removeStint = (id: number) => setStints(stints.filter(s => s.id !== id));

  const toursRestants = Math.floor(currentFuel / config.consoGreen);
  const activePilote = pilotes.find(p => p.statut === 'AU_VOLANT');
  const isStintCritical = activePilote ? (activePilote.stintMax - activePilote.stintActuel <= 3) : false;
  const mustPitNow = isFuelCritical || isStintCritical;

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

  // 7. IA GEMINI AVEC CONTEXTE
  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userQuery = aiInput;
    setAiInput("");
    setAiMessages(prev => [...prev, { role: 'user', content: userQuery, timestamp: new Date().toLocaleTimeString() }]);
    setIsAiTyping(true);

    setTimeout(() => {
      let mockResponse = "Analyse en cours...";
      if (userQuery.toLowerCase().includes('essence') || userQuery.toLowerCase().includes('fuel') || userQuery.toLowerCase().includes('pit')) {
        mockResponse = `Au rythme actuel sous ${status}, il te reste ${currentFuel.toFixed(1)}L (${toursRestants} tours). Le pilote ${activePilote?.nom || ''} est à ${activePilote?.stintActuel || 0}m de relais.`;
      } else if (userQuery.toLowerCase().includes('pilote') || userQuery.toLowerCase().includes('stint')) {
        mockResponse = `${activePilote?.nom || 'Le pilote'} a roulé ${activePilote?.stintActuel || 0} minutes sur un max de ${activePilote?.stintMax || 0}. Il lui reste ${activePilote?.totalMax ? activePilote.totalMax - activePilote.totalRoulé : 0} minutes.`;
      } else {
        mockResponse = `Bien reçu. La piste est sous ${status}. Avec ${toursRestants} tours restants avant panne sèche, je garde un œil sur la fenêtre stratégique.`;
      }

      setAiMessages(prev => [...prev, { role: 'ai', content: mockResponse, timestamp: new Date().toLocaleTimeString() }]);
      setIsAiTyping(false);
    }, 1500);
  };

  const chartColors = ['#00ff66', '#ffaa00', '#ff3333', '#a855f7'];

  // On évite un affichage bizarre pendant le très court instant de chargement
  if (!isLoaded) return <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center text-white font-mono">Chargement télémétrie...</div>;

  return (
    <div className={`min-h-screen text-white p-6 font-sans transition-colors duration-500 ${mustPitNow ? 'bg-red-950/40' : 'bg-[#0B0C10]'}`}>
      {mustPitNow && <div className="bg-red-600 text-white font-black text-center py-2 text-xl tracking-widest uppercase animate-pulse mb-6 rounded shadow-lg">⚠️ BOX THIS LAP - BOX THIS LAP ⚠️</div>}

      <div className="flex justify-between items-start border-b border-gray-800 pb-4 mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-5xl font-black text-[#66FCF1]">#{carId}</span>
          <div>
            <h1 className="text-2xl font-bold text-white">{liveCarData?.team || 'Écurie Connectée'}</h1>
            <p className="text-sm text-gray-400 font-mono">P{liveCarData?.pos || '?'} | Piste : <span className="text-[#00ff66]">{status}</span></p>
          </div>
        </div>
        <button onClick={() => router.push(`/voiture/${carId}/config`)} className="bg-[#1F2833] hover:bg-[#45A29E] hover:text-black text-[#66FCF1] font-bold py-2 px-4 rounded border border-gray-700 transition text-sm">⚙️ PARAMÈTRES ET ALERTES</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#1F2833] p-4 rounded-lg border border-gray-700 shadow-xl flex flex-col">
          <h3 className={`${fuelTitleColor} font-bold text-sm tracking-wider uppercase mb-2 border-b border-gray-700 pb-2 transition-colors`}>⛽ Niveau Carburant</h3>
          <div className={`bg-[#0B0C10] p-3 rounded text-center border transition-all duration-300 flex-1 flex flex-col justify-center ${fuelBorderColor}`}>
            <p className={`text-5xl font-mono font-black ${fuelColorText}`}>{currentFuel.toFixed(1)} L</p>
            <p className="text-[10px] text-gray-500 mt-2">{fuelPct.toFixed(0)}% (Alerte: {config.alertOrangePct}% / {config.alertRedPct}%)</p>
            <input type="range" min="0" max={config.capaMax} value={currentFuel} onChange={e => setCurrentFuel(Number(e.target.value))} className="w-full mt-4 accent-[#45A29E]" />
          </div>
        </div>

        <div className="bg-[#1F2833] p-4 rounded-lg border border-gray-700 shadow-xl">
          <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
            <h3 className="text-[#00ff66] font-bold text-sm tracking-wider uppercase">👥 Pilotes</h3>
            <button onClick={addPilote} className="text-[10px] bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">+ Ajouter</button>
          </div>
          <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
            {pilotes.map((pilote) => (
              <div key={pilote.id} className={`p-2 rounded border transition-colors ${pilote.statut === 'AU_VOLANT' ? 'bg-[#153035] border-[#45A29E]' : 'bg-[#0B0C10] border-gray-800'}`}>
                <div className="flex justify-between items-center mb-1">
                  <input type="text" value={pilote.nom} onChange={e => updatePilote(pilote.id, 'nom', e.target.value)} className="bg-transparent font-bold text-sm text-white outline-none border-b border-gray-700 w-1/2" />
                  <button onClick={() => setPiloteAuVolant(pilote.id)} className={`text-[9px] px-2 py-0.5 rounded ${pilote.statut === 'AU_VOLANT' ? 'bg-[#00ff66] text-black font-black' : 'bg-gray-700 text-white'}`}>TRACK</button>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                  <div className="flex justify-between items-center"><span className="text-gray-500">Stint:</span><input type="number" value={pilote.stintActuel} onChange={e => updatePilote(pilote.id, 'stintActuel', Number(e.target.value))} className="w-10 bg-gray-800 text-center rounded text-white" /></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500">Total:</span><input type="number" value={pilote.totalRoulé} onChange={e => updatePilote(pilote.id, 'totalRoulé', Number(e.target.value))} className="w-10 bg-gray-800 text-center rounded text-white" /></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1F2833] p-4 rounded-lg border border-gray-700 shadow-xl flex flex-col">
          <h3 className="text-[#66FCF1] font-bold text-sm tracking-wider mb-2 uppercase border-b border-gray-700 pb-2">⏱️ Télémétrie Piste</h3>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-[#0B0C10] p-2 rounded text-center border border-gray-800"><p className="text-gray-500 text-[10px] uppercase font-bold">Dernier</p><p className="text-xl font-mono font-bold text-white mt-1">{liveCarData?.lastLap || '-:--'}</p></div>
            <div className="bg-[#0B0C10] p-2 rounded text-center border border-gray-800"><p className="text-gray-500 text-[10px] uppercase font-bold">Meilleur</p><p className="text-xl font-mono font-bold text-purple-400 mt-1">{liveCarData?.bestLap || '-:--'}</p></div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs mt-auto">
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
            <input 
              type="text" 
              value={aiInput} 
              onChange={e => setAiInput(e.target.value)} 
              placeholder="Posez une question stratégique..." 
              className="flex-1 bg-[#1F2833] text-white rounded p-2 text-xs border border-gray-700 outline-none focus:border-[#a855f7]"
            />
            <button type="submit" disabled={isAiTyping || !aiInput.trim()} className="bg-[#a855f7] hover:bg-purple-400 disabled:opacity-50 text-black font-bold px-4 py-2 rounded text-xs transition">
              ENVOYER
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}