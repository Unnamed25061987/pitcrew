"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CarConfigPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params.id as string;

  const [saved, setSaved] = useState(false);
  
  const [config, setConfig] = useState({
    capaMax: "80",
    timeGreenStr: "2:15.000",
    consoGreen: "3.20",
    timeFcyStr: "3:00.000",
    consoFcy: "1.80",
    alertOrangePct: "35",
    alertRedPct: "17",
    pitLossTime: "65" // NOUVEAU : Temps perdu lors d'un arrêt (entrée, arrêt, sortie)
  });

  useEffect(() => {
    const savedConfig = localStorage.getItem(`car_config_${carId}`);
    if (savedConfig) {
      setConfig({ ...config, ...JSON.parse(savedConfig) });
    }
  }, [carId]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(`car_config_${carId}`, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-[#0B0C10] min-h-screen text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-3xl font-black text-[#66FCF1] flex items-center"><span className="mr-3">⚙️</span> CONFIGURATION TÉLÉMÉTRIE</h1>
            <p className="text-gray-400 mt-1">Voiture : <span className="text-[#ffaa00] font-black text-xl">#{carId}</span></p>
          </div>
          <button onClick={() => router.push(`/voiture/${carId}`)} className="bg-[#1F2833] hover:bg-gray-700 text-white font-bold py-2 px-4 rounded border border-gray-600">⬅ Retour Télémétrie</button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          <div className="bg-[#1a1c23] p-5 rounded-lg border border-gray-800 shadow-xl">
            <h2 className="text-[#ffaa00] font-bold tracking-wider mb-4 border-b border-gray-700 pb-2">⛽ CAPACITÉ & ARRÊTS AUX STANDS</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Réservoir Max (L)</label>
                <input type="text" value={config.capaMax} onChange={e => setConfig({...config, capaMax: e.target.value})} className="w-full bg-[#0B0C10] border border-gray-600 rounded p-2 font-mono text-white text-xl" />
              </div>
              <div>
                <label className="block text-xs text-purple-400 mb-1">Perte Pit Stop (sec)</label>
                <input type="number" value={config.pitLossTime} onChange={e => setConfig({...config, pitLossTime: e.target.value})} className="w-full bg-[#0B0C10] border border-purple-600 rounded p-2 font-mono text-purple-400 text-xl" title="Temps total perdu en passant par la voie des stands par rapport à un tour normal" />
              </div>
              <div>
                <label className="block text-xs text-orange-400 mb-1">Alerte PREPA (%)</label>
                <input type="number" value={config.alertOrangePct} onChange={e => setConfig({...config, alertOrangePct: e.target.value})} className="w-full bg-[#0B0C10] border border-orange-600 rounded p-2 font-mono text-orange-400 text-xl" />
              </div>
              <div>
                <label className="block text-xs text-red-500 mb-1">Alerte BOX (%)</label>
                <input type="number" value={config.alertRedPct} onChange={e => setConfig({...config, alertRedPct: e.target.value})} className="w-full bg-[#0B0C10] border border-red-600 rounded p-2 font-mono text-red-500 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-[#1a1c23] p-5 rounded-lg border border-gray-800 shadow-xl">
            <h2 className="text-[#00ff66] font-bold tracking-wider mb-4 border-b border-gray-700 pb-2">🟢 RÉFÉRENCES DRAPEAU VERT</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Temps au Tour Cible (Format M:SS.mmm)</label>
                <input type="text" value={config.timeGreenStr} onChange={e => setConfig({...config, timeGreenStr: e.target.value})} className="w-full bg-[#0B0C10] border border-gray-600 rounded p-2 font-mono text-white text-xl" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Consommation mesurée (L/Tour)</label>
                <input type="text" value={config.consoGreen} onChange={e => setConfig({...config, consoGreen: e.target.value})} className="w-full bg-[#0B0C10] border border-gray-600 rounded p-2 font-mono text-white text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-[#1a1c23] p-5 rounded-lg border border-gray-800 shadow-xl">
            <h2 className="text-[#ffaa00] font-bold tracking-wider mb-4 border-b border-gray-700 pb-2">🟡 RÉFÉRENCES FULL COURSE YELLOW</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Temps au Tour imposé (Format M:SS.mmm)</label>
                <input type="text" value={config.timeFcyStr} onChange={e => setConfig({...config, timeFcyStr: e.target.value})} className="w-full bg-[#0B0C10] border border-gray-600 rounded p-2 font-mono text-white text-xl" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Consommation sous FCY (L/Tour)</label>
                <input type="text" value={config.consoFcy} onChange={e => setConfig({...config, consoFcy: e.target.value})} className="w-full bg-[#0B0C10] border border-gray-600 rounded p-2 font-mono text-white text-xl" />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 pt-2">
            <button type="submit" className="bg-[#45A29E] hover:bg-[#66FCF1] text-black font-black py-3 px-8 rounded shadow-lg transition">💾 ENREGISTRER LE PROFIL</button>
            {saved && <span className="text-[#00ff66] font-bold animate-pulse">Enregistré.</span>}
          </div>

        </form>
      </div>
    </div>
  );
}