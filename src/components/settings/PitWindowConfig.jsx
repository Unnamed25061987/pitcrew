import React, { useState } from 'react';

export default function PitWindowConfig() {
  const [pitRules, setPitRules] = useState({
    triggerType: 'fuel_percentage', // ou 'lap_number', 'time_elapsed'
    triggerValue: 20, // ex: Ouvre à 20% d'essence
    mandatoryStopTime: 115, // Temps minimum d'arrêt en secondes (ex: GT3)
    maxDriverStintMin: 65, // Temps max de conduite par relais
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPitRules({ ...pitRules, [name]: value });
  };

  return (
    <div className="bg-[#1F2833] p-6 rounded-lg text-white font-sans max-w-xl">
      <h2 className="text-xl text-[#66FCF1] font-bold mb-4">⚙️ Paramètres Dynamiques : Pit Window</h2>
      
      <div className="space-y-4">
        {/* Règle de déclenchement */}
        <div className="flex flex-col">
          <label className="text-sm font-bold text-[#C5C6C7] mb-1">Condition d'ouverture de la fenêtre</label>
          <select 
            name="triggerType" 
            value={pitRules.triggerType} 
            onChange={handleChange}
            className="bg-[#0B0C10] p-2 rounded border border-gray-600 focus:outline-none focus:border-[#45A29E]"
          >
            <option value="fuel_percentage">Pourcentage d'essence restant (%)</option>
            <option value="lap_number">Nombre de tours effectués</option>
            <option value="time_elapsed">Temps écoulé depuis le départ (min)</option>
          </select>
        </div>

        {/* Valeur de déclenchement */}
        <div className="flex flex-col">
          <label className="text-sm font-bold text-[#C5C6C7] mb-1">Valeur de déclenchement</label>
          <input 
            type="number" 
            name="triggerValue" 
            value={pitRules.triggerValue} 
            onChange={handleChange}
            className="bg-[#0B0C10] p-2 rounded border border-gray-600 focus:outline-none focus:border-[#45A29E]"
          />
        </div>

        {/* Temps d'arrêt obligatoire */}
        <div className="flex flex-col">
          <label className="text-sm font-bold text-[#C5C6C7] mb-1">Arrêt minimum réglementaire (Pit Stop Delta - sec)</label>
          <input 
            type="number" 
            name="mandatoryStopTime" 
            value={pitRules.mandatoryStopTime} 
            onChange={handleChange}
            className="bg-[#0B0C10] p-2 rounded border border-gray-600 focus:outline-none focus:border-[#45A29E]"
          />
        </div>
      </div>

      <button className="mt-6 w-full bg-[#45A29E] text-black font-bold py-2 px-4 rounded hover:bg-[#66FCF1] transition">
        💾 SAUVEGARDER LE RÈGLEMENT
      </button>
    </div>
  );
}