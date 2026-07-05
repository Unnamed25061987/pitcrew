"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CarConfigPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params.id as string;

  const [config, setConfig] = useState({
    capaMax: 80,
    consoGreen: 1.7,
    timeGreenStr: "2:55.000",
    consoFcy: 0.7,
    timeFcyStr: "7:00.000",
    alertOrangePct: 35,
    alertRedPct: 17,
    maxStintTime: 65,
    pitBaseTime: 35,
    pitRefuelTime: 30,
    pitDriverTime: 15,
    stintAlertMin: 10
  });

  useEffect(() => {
    const saved = localStorage.getItem(`car_config_${carId}`);
    if (saved) {
      setConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
    }
  }, [carId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    localStorage.setItem(`car_config_${carId}`, JSON.stringify(config));
    router.push(`/voiture/${carId}`);
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <h1 className="text-3xl font-black text-[#66FCF1] flex items-center gap-3">
            <span>⚙️</span> CONFIGURATION VOITURE #{carId}
          </h1>
          <button onClick={() => router.push(`/voiture/${carId}`)} className="text-gray-400 hover:text-white transition">
            ✕ Retour au Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Section Carburant */}
          <div className="bg-[#1a1c23] p-6 rounded-lg border border-gray-800 shadow-xl">
            <h2 className="text-[#00ff66] font-bold text-sm tracking-wider uppercase mb-4 border-b border-gray-700 pb-2">⛽ Carburant & Consommation</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Capacité Max (Litres)</label>
                <input type="number" name="capaMax" value={config.capaMax} onChange={handleChange} className="w-full bg-[#0B0C10] border border-gray-700 rounded p-2 text-white font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Conso Green (L/Tr)</label>
                  <input type="number" step="0.1" name="consoGreen" value={config.consoGreen} onChange={handleChange} className="w-full bg-[#0B0C10] border border-gray-700 rounded p-2 text-[#00ff66] font-bold font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Temps Tr Vert</label>
                  <input type="text" name="timeGreenStr" value={config.timeGreenStr} onChange={handleChange} placeholder="ex: 2:55.000" className="w-full bg-[#0B0C10] border border-gray-700 rounded p-2 text-[#00ff66] font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Conso FCY (L/Tr)</label>
                  <input type="number" step="0.1" name="consoFcy" value={config.consoFcy} onChange={handleChange} className="w-full bg-[#0B0C10] border border-gray-700 rounded p-2 text-[#ffaa00] font-bold font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Temps Tr FCY</label>
                  <input type="text" name="timeFcyStr" value={config.timeFcyStr} onChange={handleChange} placeholder="ex: 7:00.000" className="w-full bg-[#0B0C10] border border-gray-700 rounded p-2 text-[#ffaa00] font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs text-orange-500 uppercase tracking-widest mb-1">Alerte Orange (%)</label>
                  <input type="number" name="alertOrangePct" value={config.alertOrangePct} onChange={handleChange} className="w-full bg-[#0B0C10] border border-orange-500/50 rounded p-2 text-orange-500 font-bold font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-red-500 uppercase tracking-widest mb-1">Alerte Rouge (%)</label>
                  <input type="number" name="alertRedPct" value={config.alertRedPct} onChange={handleChange} className="w-full bg-[#0B0C10] border border-red-500/50 rounded p-2 text-red-500 font-bold font-mono" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Section Temps de Pilotage */}
            <div className="bg-[#1a1c23] p-6 rounded-lg border border-gray-800 shadow-xl">
              <h2 className="text-[#66FCF1] font-bold text-sm tracking-wider uppercase mb-4 border-b border-gray-700 pb-2">⏱️ Temps de Pilotage</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Stint Maximum Réglementaire (Min)</label>
                  <input type="number" name="maxStintTime" value={config.maxStintTime} onChange={handleChange} className="w-full bg-[#0B0C10] border border-gray-700 rounded p-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-red-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    Alerte "BOX THIS LAP" avant la fin (Min)
                  </label>
                  <input type="number" name="stintAlertMin" value={config.stintAlertMin} onChange={handleChange} className="w-full bg-red-900/20 border border-red-500/50 rounded p-2 text-red-400 font-bold font-mono" />
                  <p className="text-[10px] text-gray-500 mt-1 italic">Le bandeau rouge clignotant s'activera à {config.maxStintTime - config.stintAlertMin} minutes de roulage.</p>
                </div>
              </div>
            </div>

            {/* Section Temps des Stands (Pit Stops) */}
            <div className="bg-[#1a1c23] p-6 rounded-lg border border-gray-800 shadow-xl flex-1">
              <h2 className="text-[#a855f7] font-bold text-sm tracking-wider uppercase mb-4 border-b border-gray-700 pb-2">🔧 Temps d'arrêt aux Stands (Sec)</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Pit Lane (Pit-In à Pit-Out pur) / DT</label>
                  <input type="number" name="pitBaseTime" value={config.pitBaseTime} onChange={handleChange} className="w-full bg-[#0B0C10] border border-gray-700 rounded p-2 text-[#a855f7] font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">+ Refuel pur</label>
                    <input type="number" name="pitRefuelTime" value={config.pitRefuelTime} onChange={handleChange} className="w-full bg-[#0B0C10] border border-gray-700 rounded p-2 text-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">+ Driver Change</label>
                    <input type="number" name="pitDriverTime" value={config.pitDriverTime} onChange={handleChange} className="w-full bg-[#0B0C10] border border-gray-700 rounded p-2 text-white font-mono" />
                  </div>
                </div>
                <div className="pt-2">
                  <p className="text-[10px] text-gray-500 border border-gray-800 p-2 rounded bg-[#0B0C10]">
                    Total pour un "FULL PIT" calculé : <strong className="text-white">{Number(config.pitBaseTime) + Number(config.pitRefuelTime) + Number(config.pitDriverTime)}s</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={handleSave} className="bg-[#45A29E] hover:bg-[#66FCF1] text-black font-black uppercase tracking-widest py-3 px-8 rounded shadow-[0_0_15px_rgba(69,162,158,0.3)] transition">
            💾 Sauvegarder et Appliquer
          </button>
        </div>

      </div>
    </div>
  );
}