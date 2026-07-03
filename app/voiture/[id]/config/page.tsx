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
    pitLossTime: 65,
    maxStintTime: 65
  });

  useEffect(() => {
    const savedConfig = localStorage.getItem(`car_config_${carId}`);
    if (savedConfig) {
      setConfig({ ...config, ...JSON.parse(savedConfig) });
    }
  }, [carId]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setConfig({ ...config, [name]: value });
  };

  const handleSave = () => {
    localStorage.setItem(`car_config_${carId}`, JSON.stringify(config));
    router.push(`/voiture/${carId}`);
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-white p-8">
      <div className="max-w-3xl mx-auto bg-[#1a1c23] p-8 rounded-lg border border-gray-800 shadow-xl">
        <h1 className="text-3xl font-black text-[#66FCF1] mb-6">⚙️ Configuration Voiture #{carId}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          <div className="bg-[#1F2833] p-5 rounded border border-gray-700">
            <h2 className="text-[#00ff66] font-bold uppercase mb-4 border-b border-gray-700 pb-2">⛽ Paramètres Carburant (Interpolation)</h2>
            <label className="block mb-3 text-sm">Capacité Réservoir (L)
              <input type="number" name="capaMax" value={config.capaMax} onChange={handleChange} className="w-full mt-1 bg-[#0B0C10] border border-gray-600 rounded p-2 text-white outline-none focus:border-[#00ff66]" />
            </label>
            <div className="flex gap-2 mb-3">
              <label className="block text-sm flex-1">Conso Green (L/Tr)
                <input type="number" step="0.1" name="consoGreen" value={config.consoGreen} onChange={handleChange} className="w-full mt-1 bg-[#0B0C10] border border-gray-600 rounded p-2 text-white outline-none focus:border-[#00ff66]" />
              </label>
              <label className="block text-sm flex-1">Chrono Green (Ref)
                <input type="text" name="timeGreenStr" value={config.timeGreenStr} onChange={handleChange} className="w-full mt-1 bg-[#0B0C10] border border-gray-600 rounded p-2 text-[#00ff66] outline-none focus:border-[#00ff66]" />
              </label>
            </div>
            <div className="flex gap-2">
              <label className="block text-sm flex-1">Conso FCY/Lent (L/Tr)
                <input type="number" step="0.1" name="consoFcy" value={config.consoFcy} onChange={handleChange} className="w-full mt-1 bg-[#0B0C10] border border-gray-600 rounded p-2 text-white outline-none focus:border-[#ffaa00]" />
              </label>
              <label className="block text-sm flex-1">Chrono FCY/Lent (Ref)
                <input type="text" name="timeFcyStr" value={config.timeFcyStr} onChange={handleChange} className="w-full mt-1 bg-[#0B0C10] border border-gray-600 rounded p-2 text-[#ffaa00] outline-none focus:border-[#ffaa00]" />
              </label>
            </div>
            <p className="text-[10px] text-gray-500 mt-3 italic">Le système calculera la consommation de chaque tour proportionnellement au temps réalisé entre ces deux extrêmes.</p>
          </div>

          <div className="bg-[#1F2833] p-5 rounded border border-gray-700">
            <h2 className="text-[#ffaa00] font-bold uppercase mb-4 border-b border-gray-700 pb-2">🚨 Limites & Alertes</h2>
            <label className="block mb-3 text-sm">Alerte Fuel Orange (%)
              <input type="number" name="alertOrangePct" value={config.alertOrangePct} onChange={handleChange} className="w-full mt-1 bg-[#0B0C10] border border-gray-600 rounded p-2 text-white outline-none focus:border-[#ffaa00]" />
            </label>
            <label className="block mb-3 text-sm">Alerte Fuel Rouge (%)
              <input type="number" name="alertRedPct" value={config.alertRedPct} onChange={handleChange} className="w-full mt-1 bg-[#0B0C10] border border-gray-600 rounded p-2 text-white outline-none focus:border-red-500" />
            </label>
            <label className="block text-sm">Limite Stint Pilote (Minutes)
              <input type="number" name="maxStintTime" value={config.maxStintTime} onChange={handleChange} className="w-full mt-1 bg-gray-900 border border-[#a855f7] rounded p-2 text-[#66FCF1] font-bold outline-none shadow-[0_0_10px_rgba(168,85,247,0.2)]" />
            </label>
          </div>

        </div>

        <button onClick={handleSave} className="w-full bg-[#45A29E] hover:bg-[#66FCF1] text-black font-black py-4 rounded text-lg transition shadow-lg">
          SAUVEGARDER ET RETOURNER AU PIT WALL
        </button>
      </div>
    </div>
  );
}