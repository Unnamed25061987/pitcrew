"use client";

import React, { useState, useMemo } from 'react';

interface CarProfile {
  id: string;
  team: string;
  category: string;
  capaMax: number;
  currentFuel: number;
  consoGreen: number;
  consoFcy: number;
  lapGreen: number; // en secondes
  lapFcy: number;   // en secondes
}

export default function FleetManager() {
  const [cars, setCars] = useState<CarProfile[]>([
    { id: '383', team: 'Trajectus Motorsport', category: 'Ligier JS', capaMax: 80, currentFuel: 45, consoGreen: 3.2, consoFcy: 1.8, lapGreen: 135, lapFcy: 180 },
    { id: '17', team: 'Speedlover', category: 'Porsche GT3', capaMax: 100, currentFuel: 95, consoGreen: 4.5, consoFcy: 2.5, lapGreen: 124, lapFcy: 165 },
    { id: '309', team: 'Orhes Racing', category: 'Ligier JS', capaMax: 80, currentFuel: 72, consoGreen: 3.2, consoFcy: 1.8, lapGreen: 136, lapFcy: 182 }
  ]);

  const [selectedCarId, setSelectedCarId] = useState<string>('383');
  const [applyToCategory, setApplyToCategory] = useState<boolean>(false);

  // Trouver la voiture active pour le formulaire
  const activeCar = useMemo(() => {
    return cars.find(c => c.id === selectedCarId) || cars[0];
  }, [cars, selectedCarId]);

  // Modification d'un paramètre
  const handleParamChange = (field: keyof CarProfile, value: any) => {
    setCars(prevCars => {
      return prevCars.map(car => {
        // Si l'option "Appliquer à la catégorie" est active, on modifie toutes les voitures de la même catégorie
        if (applyToCategory && car.category === activeCar.category) {
          if (field === 'id' || field === 'team') return car; // On ne change pas l'ID ni le nom de l'équipe
          return { ...car, [field]: value };
        }
        // Sinon, on ne modifie que la voiture sélectionnée
        if (car.id === selectedCarId) {
          return { ...car, [field]: value };
        }
        return car;
      });
    });
  };

  // Convertisseur secondes -> MM:SS
  const formatLapTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#1a1c23] p-6 rounded-lg border border-gray-800 shadow-xl text-white">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-[#66FCF1]">🚗 GESTION DE FLOTTE & PROFILS</h2>
          <p className="text-gray-400 text-sm">Configurez les caractéristiques physiques par véhicule ou par catégorie</p>
        </div>
        
        {/* Sélecteur de véhicule actif */}
        <div className="flex items-center space-x-3 bg-[#0B0C10] p-2 rounded border border-gray-700">
          <span className="text-xs font-bold text-gray-400 uppercase">Voiture Ciblée :</span>
          <select 
            value={selectedCarId} 
            onChange={(e) => setSelectedCarId(e.target.value)}
            className="bg-[#1F2833] text-white font-mono font-bold p-1 rounded outline-none border border-gray-600 focus:border-[#45A29E]"
          >
            {cars.map(c => (
              <option key={c.id} value={c.id}>#{c.id} - {c.team}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Panneau de configuration de la voiture active */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 p-4 bg-[#1F2833] rounded-lg border border-gray-700">
        
        {/* Bloc Carburant */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#ffaa00] border-b border-gray-700 pb-1">⛽ ÉNERGIE & CAPACITÉ</h3>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Réservoir Maximum (Liters)</label>
            <input 
              type="number" 
              value={activeCar.capaMax}
              onChange={(e) => handleParamChange('capaMax', Number(e.target.value) || 0)}
              className="w-full bg-[#0B0C10] border border-gray-600 rounded p-2 font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Niveau Actuel (Liters)</label>
            <input 
              type="number" 
              value={activeCar.currentFuel}
              max={activeCar.capaMax}
              onChange={(e) => handleParamChange('currentFuel', Math.min(activeCar.capaMax, Number(e.target.value) || 0))}
              className="w-full bg-[#0B0C10] border border-gray-600 rounded p-2 font-mono text-white"
            />
          </div>
        </div>

        {/* Bloc Consommation */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#ffaa00] border-b border-gray-700 pb-1">📉 CONSOMMATION PAR TOUR</h3>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Sous Drapeau Vert (L/Tr)</label>
            <input 
              type="number" 
              step="0.1"
              value={activeCar.consoGreen}
              onChange={(e) => handleParamChange('consoGreen', Number(e.target.value) || 0)}
              className="w-full bg-[#0B0C10] border border-gray-600 rounded p-2 font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Sous FCY / Safety Car (L/Tr)</label>
            <input 
              type="number" 
              step="0.1"
              value={activeCar.consoFcy}
              onChange={(e) => handleParamChange('consoFcy', Number(e.target.value) || 0)}
              className="w-full bg-[#0B0C10] border border-gray-600 rounded p-2 font-mono text-white"
            />
          </div>
        </div>

        {/* Bloc Rythme / Temps au tour */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#ffaa00] border-b border-gray-700 pb-1">⏱️ RYTHME DE RÉFÉRENCE</h3>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Temps Drapeau Vert (sec)</label>
            <input 
              type="number" 
              value={activeCar.lapGreen}
              onChange={(e) => handleParamChange('lapGreen', Number(e.target.value) || 0)}
              className="w-full bg-[#0B0C10] border border-gray-600 rounded p-2 font-mono text-white"
            />
            <span className="text-[10px] text-gray-400">Format traduit : {formatLapTime(activeCar.lapGreen)}</span>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Temps sous FCY (sec)</label>
            <input 
              type="number" 
              value={activeCar.lapFcy}
              onChange={(e) => handleParamChange('lapFcy', Number(e.target.value) || 0)}
              className="w-full bg-[#0B0C10] border border-gray-600 rounded p-2 font-mono text-white"
            />
            <span className="text-[10px] text-gray-400">Format traduit : {formatLapTime(activeCar.lapFcy)}</span>
          </div>
        </div>

      </div>

      {/* Option d'application de groupe */}
      <div className="flex items-center space-x-3 mb-6 p-3 bg-[#15171e] rounded border border-gray-800">
        <input 
          type="checkbox" 
          id="catApply" 
          checked={applyToCategory}
          onChange={(e) => setApplyToCategory(e.target.checked)}
          className="w-4 h-4 cursor-pointer accent-[#45A29E]"
        />
        <label htmlFor="catApply" className="text-sm cursor-pointer font-bold text-gray-300">
          🔗 Appliquer simultanément ces modifications à TOUTES les voitures de la catégorie <span className="text-[#66FCF1]">{activeCar.category}</span>
        </label>
      </div>

      {/* Grand Tableau Récapitulatif de la Flotte */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0B0C10] text-gray-400 text-xs uppercase tracking-wider">
              <th className="p-3 rounded-tl">N°</th>
              <th className="p-3">Équipe</th>
              <th className="p-3">Catégorie</th>
              <th className="p-3">Carburant Restant</th>
              <th className="p-3">Autonomie (Vert)</th>
              <th className="p-3">Autonomie (FCY)</th>
              <th className="p-3 rounded-tr">Temps de Stint (Vert)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {cars.map((car) => {
              const lapsGreen = Math.floor(car.currentFuel / car.consoGreen);
              const lapsFcy = Math.floor(car.currentFuel / car.consoFcy);
              const stintDurationMin = Math.floor((lapsGreen * car.lapGreen) / 60);
              const pctFuel = (car.currentFuel / car.capaMax) * 100;
              
              // Alerte visuelle si sous les 20% de carburant
              const rowAlert = pctFuel < 20 ? "bg-[#3d1616] hover:bg-[#4a1a1a]" : "hover:bg-[#1F2833]";

              return (
                <tr key={car.id} className={`transition-colors duration-200 ${rowAlert}`}>
                  <td className="p-3 font-mono font-bold text-[#66FCF1]">#{car.id}</td>
                  <td className="p-3 font-bold">{car.team}</td>
                  <td className="p-3"><span className="bg-gray-800 px-2 py-0.5 rounded text-xs">{car.category}</span></td>
                  <td className="p-3 font-mono">
                    <span className={pctFuel < 20 ? "text-red-500 font-black animate-pulse" : "text-white"}>
                      {car.currentFuel.toFixed(1)}L ({Math.floor(pctFuel)}%)
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[#ffaa00] font-bold">{lapsGreen} Tours</td>
                  <td className="p-3 font-mono text-gray-400">{lapsFcy} Tours</td>
                  <td className="p-3 font-mono text-[#00ff66] font-bold">{stintDurationMin} min</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}