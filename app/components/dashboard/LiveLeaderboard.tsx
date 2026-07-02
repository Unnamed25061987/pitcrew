"use client";

import React, { useState } from 'react';
import { useLiveTiming } from '../../hooks/useLiveTiming';

export interface LiveCar {
  pos: number;
  num: string;
  team: string;
  driver: string;
  laps: number;
  gap: string;
  lastLap: string;
  bestLap: string;
  s1?: string;
  s2?: string;
  s3?: string;
  trend?: 'improving' | 'worsening' | 'stable'; 
  trendValue?: string;     
}

interface MonitoredCar {
  num: string;
  driver: string;
  maxStintTime: number; 
  elapsedStintTime: number; 
  totalDrivenTime: number; 
  maxTotalTime: number; 
}

export default function LiveLeaderboard() {
  const { cars, status, error } = useLiveTiming('JSON');
  
  const [monitoredCars, setMonitoredCars] = useState<MonitoredCar[]>([]);
  const [manualCarNum, setManualCarNum] = useState("");

  const addToMonitoring = (carNum: string, driverName: string) => {
    if (!monitoredCars.some(c => c.num === carNum)) {
      setMonitoredCars([...monitoredCars, {
        num: carNum,
        driver: driverName || `Pilote #${carNum}`,
        maxStintTime: 45,
        elapsedStintTime: 0,
        totalDrivenTime: 0,
        maxTotalTime: 120
      }]);
    }
  };

  const removeFromMonitoring = (carNum: string) => {
    setMonitoredCars(monitoredCars.filter(c => c.num !== carNum));
  };

  const updateStintTime = (num: string, time: number) => {
    setMonitoredCars(monitoredCars.map(c => c.num === num ? { ...c, elapsedStintTime: time } : c));
  };
  
  const handleManualOpen = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCarNum.trim()) {
      window.open(`/voiture/${manualCarNum.trim()}`, '_blank');
      setManualCarNum(""); 
    }
  };

  const renderTrend = (trend?: string, value?: string) => {
    if (!trend || !value) return <span className="text-gray-600">-</span>;
    if (trend === 'improving') return <span className="text-[#00ff66] font-bold tracking-wider">↗️ -{value}s</span>;
    if (trend === 'worsening') return <span className="text-red-400 font-bold tracking-wider">↘️ +{value}s</span>;
    return <span className="text-gray-500 font-bold tracking-wider">⚖️ {value}s</span>;
  };

  return (
    <div className="space-y-8 text-white w-full pb-10">
        
      {/* MODULE 1 : LA FLOTTE SURVEILLÉE */}
      {monitoredCars.length > 0 && (
        <div className="bg-[#15171e] p-6 rounded-lg border border-gray-800 shadow-xl">
          <h2 className="text-xl font-black text-[#66FCF1] mb-4 flex items-center">
            <span className="mr-2">🛡️</span> VUE D'ENSEMBLE FLOTTE
          </h2>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {monitoredCars.map(car => {
              const liveData = cars.find(c => String(c.num) === String(car.num));
              const isStintCritical = (car.maxStintTime - car.elapsedStintTime) <= 3;
              const isTotalCritical = (car.maxTotalTime - car.totalDrivenTime) <= 10;
              const mustPitNow = isStintCritical;

              return (
                <div key={car.num} className={`p-4 rounded-lg border transition-all duration-300 relative overflow-hidden ${mustPitNow ? 'bg-red-950 border-red-500 animate-[pulse_1s_infinite] shadow-[0_0_25px_rgba(239,68,68,0.4)]' : 'bg-[#1F2833] border-gray-700'}`}>
                  {mustPitNow && <div className="absolute top-0 right-0 bg-red-600 text-white font-black text-[10px] px-3 py-0.5 tracking-widest uppercase animate-bounce shadow-lg border-b border-l border-red-800 z-10">PILOTE LIMITE</div>}
                  
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl font-black text-[#66FCF1]">#{car.num}</span>
                        <span className="bg-[#0B0C10] px-2 py-0.5 rounded text-[#00ff66] font-black text-sm border border-gray-700">P{liveData?.pos || '?'}</span>
                      </div>
                      <h3 className="text-xs font-bold text-gray-300 mt-1 truncate max-w-[200px]">{liveData?.team || 'Équipe engagée'}</h3>
                    </div>
                    <button onClick={() => removeFromMonitoring(car.num)} className="text-gray-500 hover:text-red-400 text-[10px] font-bold transition-colors bg-[#0B0C10] px-2 py-1 rounded border border-gray-800">[ Retirer ]</button>
                  </div>
                  
                  {/* Grille restructurée en 2 colonnes (Essence retirée) */}
                  <div className="grid grid-cols-2 gap-2 bg-[#0B0C10] p-2 rounded border border-gray-800 shadow-inner">
                    
                    {/* CHRONO & DELTA */}
                    <div className="border-r border-gray-800 pr-2 flex flex-col justify-between">
                      <div>
                        <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">⏱️ Rythme & Delta</p>
                        <p className="text-base font-mono font-bold text-[#66FCF1] leading-none">{liveData?.lastLap || '-:--.---'}</p>
                        <div className="mt-2 space-y-0.5 text-[10px] font-mono">
                          <p className="text-gray-400">Écart: <span className="text-white">{liveData?.gap || '-'}</span></p>
                          <p className="text-gray-400">Trend: {renderTrend(liveData?.trend, liveData?.trendValue)}</p>
                        </div>
                      </div>
                    </div>

                    {/* TEMPS PILOTE */}
                    <div className="pl-2 flex flex-col justify-between">
                      <div>
                        <p className="text-[9px] text-gray-500 font-bold uppercase mb-1 truncate">👥 {liveData?.driver || car.driver}</p>
                        <div className="space-y-0.5 mt-1 text-[10px]">
                          <p className="text-gray-400 flex justify-between"><span>Stint:</span><span className={`font-mono font-bold ${isStintCritical ? 'text-red-500 font-black' : 'text-white'}`}>{car.elapsedStintTime}/{car.maxStintTime}m</span></p>
                          <p className="text-gray-400 flex justify-between"><span>Total:</span><span className={`font-mono ${isTotalCritical ? 'text-red-400 font-bold' : 'text-gray-300'}`}>{car.totalDrivenTime}/{car.maxTotalTime}m</span></p>
                        </div>
                      </div>
                      <div className="flex space-x-1 mt-2">
                        <button onClick={() => updateStintTime(car.num, car.maxStintTime - 2)} className="bg-gray-800 hover:bg-gray-700 text-[9px] px-1 py-1 rounded flex-1 transition">Max</button>
                        <button onClick={() => updateStintTime(car.num, 0)} className="bg-gray-800 hover:bg-gray-700 text-[9px] px-1 py-1 rounded flex-1 transition">Reset</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* MODULE 2 : LEADERBOARD GLOBAL */}
      <div className="bg-[#1a1c23] p-6 rounded-lg border border-gray-800 shadow-xl flex flex-col overflow-hidden">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 pb-2 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-black text-[#66FCF1]">🏁 LIVE TIMING GLOBAL</h2>
            {error && <span className="text-red-500 text-xs bg-red-950 p-1.5 rounded border border-red-900 mt-2 block">{error}</span>}
          </div>
          
          <form onSubmit={handleManualOpen} className="flex items-center space-x-2 bg-[#0B0C10] p-1.5 rounded border border-gray-700 shadow-inner">
            <span className="text-gray-400 text-[10px] font-bold uppercase hidden sm:inline">Accès Pré-course :</span>
            <input 
              type="text" placeholder="N° Voiture" value={manualCarNum} onChange={(e) => setManualCarNum(e.target.value)}
              className="bg-[#1F2833] text-white border border-gray-600 rounded px-2 py-1 text-xs w-24 outline-none focus:border-[#45A29E] font-bold"
            />
            <button type="submit" disabled={!manualCarNum.trim()} className="bg-[#45A29E] hover:bg-[#66FCF1] disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold px-2 py-1 rounded text-xs transition">
              Préparer ↗
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-auto border border-gray-800 rounded">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B0C10] text-gray-400 text-xs uppercase tracking-wider sticky top-0 z-10 border-b border-gray-800">
                <th className="p-3">Pos</th>
                <th className="p-3">N°</th>
                <th className="p-3">Équipe / Pilote</th>
                <th className="p-3">Tours</th>
                <th className="p-3">Écart (Gap)</th>
                <th className="p-3">Dernier Tour</th>
                <th className="p-3">Meill. Tour</th>
                <th className="p-3 text-center">Tendance</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 font-mono text-sm">
              {cars.map((car) => {
                const isTargeted = monitoredCars.some(m => String(m.num) === String(car.num));
                return (
                  <tr key={car.num} className={`hover:bg-[#1F2833] transition-colors ${isTargeted ? 'bg-[#1a383d]' : ''}`}>
                    <td className="p-3 font-bold text-gray-400">P{car.pos}</td>
                    <td className="p-3 font-black text-[#ffaa00]">#{car.num}</td>
                    <td className="p-3 font-sans">
                      <p className="font-bold text-white truncate max-w-[150px]">{car.team}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[150px]">{car.driver || 'Pilote inconnu'}</p>
                    </td>
                    <td className="p-3 text-white">{car.laps}</td>
                    <td className="p-3 text-gray-300">{car.gap}</td>
                    <td className="p-3 text-[#66FCF1] font-bold">{car.lastLap}</td>
                    <td className="p-3 text-purple-400">{car.bestLap}</td>
                    <td className="p-3 text-center bg-[#0B0C10]/50">{renderTrend(car.trend, car.trendValue)}</td>
                    <td className="p-3 text-center font-sans space-x-1 whitespace-nowrap">
                      <button onClick={() => addToMonitoring(String(car.num), car.driver)} disabled={isTargeted} className={`text-[10px] uppercase px-2 py-1.5 rounded font-bold transition shadow-md ${isTargeted ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-[#45A29E] text-black hover:bg-[#66FCF1]'}`}>
                        {isTargeted ? 'Suivie' : '+ Flotte'}
                      </button>
                      <a href={`/voiture/${car.num}`} target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase px-2 py-1.5 rounded font-bold transition shadow-md bg-gray-700 text-white hover:bg-gray-500 inline-block">
                        Détails ↗
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}