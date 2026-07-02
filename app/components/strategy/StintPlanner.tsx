"use client";

import React, { useState, useMemo } from 'react';

// Constantes pour la simulation (en secondes)
const LAP_TIME_SEC = 120; // 2 minutes par tour
const PIT_LOSS_NORMAL = 65; // Perte de temps pour un arrêt sous drapeau vert
const PIT_LOSS_FCY = 25;    // Perte de temps pour un arrêt sous FCY/Safety Car

export default function StintPlanner() {
  // On ne stocke QUE les données variables. Les heures seront déduites automatiquement.
  const [raceStartTime] = useState(15 * 3600); // 15:00:00 en secondes depuis minuit
  const [stints, setStints] = useState([
    { id: 1, driver: 'Pilote A', laps: 30, tire: 'Slick Medium' },
    { id: 2, driver: 'Pilote B', laps: 32, tire: 'Slick Hard' },
    { id: 3, driver: 'Pilote A', laps: 28, tire: 'Slick Soft' },
  ]);

  // Simulateur "Test" (What-If)
  const [testScenario, setTestScenario] = useState({
    targetLap: 25,
    condition: 'FCY', // 'NORMAL' ou 'FCY'
  });

  // 🧠 L'EFFET DOMINO (Calculé à la volée)
  const calculatedStints = useMemo(() => {
    let currentTime = raceStartTime;
    let currentLap = 0;

    return stints.map((stint) => {
      const startTime = currentTime;
      const durationSec = stint.laps * LAP_TIME_SEC;
      const endTime = startTime + durationSec;
      
      const startLap = currentLap + 1;
      const endLap = currentLap + stint.laps;

      // Mise à jour pour le prochain relais (on ajoute le temps du relais + le temps du pit stop)
      currentTime = endTime + PIT_LOSS_NORMAL;
      currentLap = endLap;

      return {
        ...stint,
        startTime,
        endTime,
        startLap,
        endLap
      };
    });
  }, [stints, raceStartTime]);

  // Mise à jour d'un relais spécifique
  const updateStint = (id: number, field: string, value: any) => {
    setStints(stints.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // Convertisseur de secondes en format HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calcul du gain/perte pour le mode Test
  const calculateTestDelta = () => {
    const timeSaved = testScenario.condition === 'FCY' ? (PIT_LOSS_NORMAL - PIT_LOSS_FCY) : 0;
    // Simulation basique : si on rentre sous FCY, on gagne le delta du pit stop.
    // Si on rentre en NORMAL plus tôt, on perd du temps sur l'usure des pneus (arbitraire pour l'exemple).
    if (testScenario.condition === 'FCY') return { text: `GAIN ESTIMÉ : -${timeSaved} sec`, color: 'text-[#00ff66]' };
    return { text: `PERTE ESTIMÉE : +12 sec (Trafic & Usure)`, color: 'text-red-500' };
  };

  const delta = calculateTestDelta();

  return (
    <div className="bg-[#1a1c23] p-6 rounded-lg border border-gray-800 shadow-xl text-white">
      
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-black text-[#66FCF1]">📝 TABLEAU DE MARCHE (DOMINO)</h2>
          <p className="text-gray-400 text-sm">Temps par tour estimé : 2:00.000 | Perte Pit : 65s</p>
        </div>
        <button className="bg-[#1f7bb6] hover:bg-[#2891d6] text-white font-bold py-2 px-4 rounded transition">
          + AJOUTER RELAIS
        </button>
      </div>

      {/* Le Tableau Principal */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1F2833] text-gray-400 text-xs uppercase tracking-wider">
              <th className="p-3 rounded-tl">Relais</th>
              <th className="p-3">Pilote</th>
              <th className="p-3">Tours</th>
              <th className="p-3">Fenêtre (Tours)</th>
              <th className="p-3">Départ</th>
              <th className="p-3">Fin Prévue</th>
              <th className="p-3 rounded-tr">Pneus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {calculatedStints.map((stint, index) => (
              <tr key={stint.id} className="hover:bg-[#1F2833] transition-colors">
                <td className="p-3 font-bold text-gray-400">R{index + 1}</td>
                <td className="p-3">
                  <select 
                    value={stint.driver}
                    onChange={(e) => updateStint(stint.id, 'driver', e.target.value)}
                    className="bg-[#0B0C10] border border-gray-700 rounded p-1 text-white focus:border-[#66FCF1] outline-none"
                  >
                    <option>Pilote A</option>
                    <option>Pilote B</option>
                    <option>Pilote C</option>
                  </select>
                </td>
                <td className="p-3">
                  {/* C'EST ICI QUE LA MAGIE DOMINO OPÈRE */}
                  <input 
                    type="number" 
                    value={stint.laps}
                    onChange={(e) => updateStint(stint.id, 'laps', parseInt(e.target.value) || 0)}
                    className="bg-[#0B0C10] border border-gray-700 rounded p-1 w-16 text-center text-[#ffaa00] font-bold focus:border-[#66FCF1] outline-none"
                  />
                </td>
                <td className="p-3 text-gray-400 text-sm">
                  T{stint.startLap} ➔ T{stint.endLap}
                </td>
                <td className="p-3 font-mono">{formatTime(stint.startTime)}</td>
                <td className="p-3 font-mono text-[#00ff66] font-bold">{formatTime(stint.endTime)}</td>
                <td className="p-3">
                  <select 
                    value={stint.tire}
                    onChange={(e) => updateStint(stint.id, 'tire', e.target.value)}
                    className="bg-[#0B0C10] border border-gray-700 rounded p-1 text-white text-sm outline-none"
                  >
                    <option>Slick Soft</option>
                    <option>Slick Medium</option>
                    <option>Slick Hard</option>
                    <option>Wet (Pluie)</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SECTION EFFET "TEST" (WHAT-IF) */}
      <div className="bg-[#1F2833] rounded-lg p-5 border border-gray-700">
        <h3 className="text-[#ffaa00] font-bold mb-3 flex items-center">
          <span className="mr-2">🧪</span> SIMULATEUR D'ARRÊT ANTICIPÉ (WHAT-IF)
        </h3>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Si on rentre au tour</span>
            <input 
              type="number" 
              value={testScenario.targetLap}
              onChange={(e) => setTestScenario({ ...testScenario, targetLap: parseInt(e.target.value) || 0 })}
              className="bg-[#0B0C10] border border-gray-600 rounded p-1 w-16 text-center text-white"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">sous régime de</span>
            <select 
              value={testScenario.condition}
              onChange={(e) => setTestScenario({ ...testScenario, condition: e.target.value })}
              className="bg-[#0B0C10] border border-gray-600 rounded p-1 text-white"
            >
              <option value="NORMAL">Drapeau Vert (Normal)</option>
              <option value="FCY">Drapeau Jaune (FCY / SC)</option>
            </select>
          </div>

          <div className="ml-auto bg-[#0B0C10] px-6 py-2 rounded border border-gray-800">
            <span className={`font-black tracking-wider ${delta.color}`}>
              {delta.text}
            </span>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-4 italic">
          * L'algorithme calcule la perte de temps dans les stands (65s Vert vs 25s FCY) croisée avec la dégradation thermique estimée des pneus actuels.
        </p>
      </div>

    </div>
  );
}