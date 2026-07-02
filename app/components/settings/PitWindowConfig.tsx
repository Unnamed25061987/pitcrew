"use client";
// @ts-nocheck

import React, { useState } from 'react';

export default function PitWindowConfig() {
  const [pitRules, setPitRules] = useState({
    triggerType: 'fuel_percentage',
    triggerValue: 20,
    mandatoryStopTime: 115,
    maxDriverStintMin: 65,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPitRules({ ...pitRules, [name]: value });
  };

  return (
    <div className="bg-[#1F2833] p-6 rounded-lg text-white font-sans max-w-xl">
      <h2 className="text-xl text-[#66FCF1] font-bold mb-4">⚙️ Paramètres Dynamiques : Pit Window</h2>
      
      <div className="space-y-4">
        <div className="flex flex-col">
          <label className="text-sm font-bold text-[#C5C6C7] mb-1">Condition d'ouverture de la fenêtre</label>
          <select 
            name="triggerType" 
            value={pitRules.triggerType} 
            onChange={handleChange}
            className="bg-[#0B0C10] p-2 rounded border border-gray-600 text-white focus:outline-none focus:border-[#45A29E]"
          >
            <option value="fuel_percentage">Pourcentage d'essence restant (%)</option>
            <option value="lap_number">Nombre de tours effectués</option>
            <option value="time_elapsed">Temps écoulé (min)</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-bold text-[#C5C6C7] mb-1">Valeur de déclenchement</label>
          <input 
            type="number" 
            name="triggerValue" 
            value={pitRules.triggerValue} 
            onChange={handleChange}
            className="bg-[#0B0C10] p-2 rounded border border-gray-600 text-white focus:outline-none focus:border-[#45A29E]"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-bold text-[#C5C6C7] mb-1">Arrêt minimum réglementaire (sec)</label>
          <input 
            type="number" 
            name="mandatoryStopTime" 
            value={pitRules.mandatoryStopTime} 
            onChange={handleChange}
            className="bg-[#0B0C10] p-2 rounded border border-gray-600 text-white focus:outline-none focus:border-[#45A29E]"
          />
        </div>
      </div>

      <button className="mt-6 w-full bg-[#45A29E] text-black font-bold py-2 px-4 rounded hover:bg-[#66FCF1] transition">
        💾 SAUVEGARDER LE RÈGLEMENT
      </button>
    </div>
  );
}