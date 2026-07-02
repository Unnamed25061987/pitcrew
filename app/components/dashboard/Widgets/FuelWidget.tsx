"use client";
import React from 'react';

export default function FuelWidget() {
  // Plus tard, ces données viendront de ton API RIS ou de ta base de données
  const fuelPercentage = 28; 
  const toursRestants = 14;
  const consoTour = 2.4;
  
  // Règle de couleur : Rouge et clignotant si sous les 30%
  const isLow = fuelPercentage < 30;

  return (
    <div className="bg-[#1F2833] h-full rounded-lg p-4 flex flex-col justify-between border border-gray-700 shadow-lg overflow-hidden">
      
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <h3 className="text-[#ffaa00] font-bold text-sm tracking-wider flex items-center">
          <span className="mr-2">⛽</span> CARBURANT
        </h3>
        <span className="text-gray-400 text-xs font-mono">{consoTour} L/Tour</span>
      </div>

      {/* Donnée principale */}
      <div className="flex items-center justify-center flex-1 my-2">
        <div className="text-center">
          <p className={`text-5xl font-black ${isLow ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {fuelPercentage}%
          </p>
          <p className="text-gray-400 text-sm mt-1 font-mono">~{toursRestants} Tours restants</p>
        </div>
      </div>

      {/* Barre de progression graphique */}
      <div className="w-full bg-[#0B0C10] rounded-full h-3 mt-2 border border-gray-800">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${isLow ? 'bg-red-500' : 'bg-[#00ff66]'}`} 
          style={{ width: `${fuelPercentage}%` }}
        ></div>
      </div>
      
    </div>
  );
}