"use client";

import React, { useState, useEffect } from 'react';

export default function WeatherRadar() {
  // Simulation des données météo instantanées
  const [weather, setWeather] = useState({
    airTemp: 22.4,
    trackTemp: 34.1,
    humidity: 58,
    windSpeed: 14,
    windDir: 'NW',
    rainChance: 15,
    status: 'DRY' // DRY, DAMP, WET
  });

  // Simulation des prévisions de pluie sur 4h (Ex: une averse arrive dans 3h)
  const [rainForecast] = useState([
    { hour: '+1H', chance: 15 },
    { hour: '+2H', chance: 35 },
    { hour: '+3H', chance: 85 }, // Forte averse prévue !
    { hour: '+4H', chance: 40 },
  ]);

  // Petite animation pour simuler les variations de température en direct
  useEffect(() => {
    const interval = setInterval(() => {
      setWeather(prev => ({
        ...prev,
        airTemp: +(prev.airTemp + (Math.random() * 0.2 - 0.1)).toFixed(1),
        trackTemp: +(prev.trackTemp + (Math.random() * 0.4 - 0.2)).toFixed(1),
      }));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#1a1c23] rounded-lg border border-gray-800 shadow-xl overflow-hidden flex flex-col h-full">
      
      {/* HEADER DU MODULE */}
      <div className="bg-[#0B0C10] p-4 border-b border-gray-800 flex justify-between items-center">
        <h2 className="text-lg font-black text-[#66FCF1] flex items-center">
          <span className="mr-2">⛅</span> MÉTÉO & RADAR
        </h2>
        <div className={`px-3 py-1 rounded font-black text-xs tracking-widest ${
          weather.status === 'DRY' ? 'bg-[#153035] text-[#00ff66] border border-[#00ff66]/30' : 
          weather.status === 'DAMP' ? 'bg-yellow-900/50 text-yellow-500 border border-yellow-500/30' : 
          'bg-blue-900/50 text-blue-400 border border-blue-400/30'
        }`}>
          TRACK: {weather.status}
        </div>
      </div>

      {/* DONNÉES TÉLÉMÉTRIQUES MÉTÉO INSTANTANÉES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4 bg-[#1F2833]">
        <div className="bg-[#0B0C10] p-3 rounded border border-gray-700 shadow-inner text-center">
          <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Air Temp</p>
          <p className="text-lg font-mono font-bold text-white">{weather.airTemp}°C</p>
        </div>
        <div className="bg-[#0B0C10] p-3 rounded border border-[#ffaa00]/30 shadow-inner text-center">
          <p className="text-[9px] text-[#ffaa00] font-bold uppercase mb-1">Track Temp</p>
          <p className="text-lg font-mono font-bold text-[#ffaa00]">{weather.trackTemp}°C</p>
        </div>
        <div className="bg-[#0B0C10] p-3 rounded border border-gray-700 shadow-inner text-center">
          <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Hygrométrie</p>
          <p className="text-lg font-mono font-bold text-gray-300">{weather.humidity}%</p>
        </div>
        <div className="bg-[#0B0C10] p-3 rounded border border-gray-700 shadow-inner text-center">
          <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Vent</p>
          <p className="text-lg font-mono font-bold text-gray-300">
            {weather.windSpeed}<span className="text-xs">km/h</span> <span className="text-[#66FCF1] text-xs">{weather.windDir}</span>
          </p>
        </div>
      </div>

      {/* 🌧️ NOUVEAU : PRÉVISIONS PLUIE (COLONNES) */}
      <div className="bg-[#15171e] p-4 border-t border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Risque de pluie (4h)</h3>
          <span className="text-[10px] text-gray-500 font-mono">LIVE: {weather.rainChance}%</span>
        </div>
        
        {/* Conteneur du graphique en colonnes */}
        <div className="flex justify-between items-end h-24 gap-3">
          {rainForecast.map((forecast, index) => {
            // Logique de couleurs selon le pourcentage de pluie
            let barColor = "bg-blue-300/20 border-blue-300/30"; // Très faible
            let textColor = "text-gray-400";
            
            if (forecast.chance >= 70) {
              barColor = "bg-blue-500 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]"; // Alerte forte pluie
              textColor = "text-blue-400 font-black";
            } else if (forecast.chance >= 35) {
              barColor = "bg-blue-400/60 border-blue-400/80"; // Pluie probable
              textColor = "text-blue-200";
            }

            return (
              <div key={index} className="flex-1 flex flex-col justify-end items-center group">
                {/* Le pourcentage au-dessus de la colonne */}
                <span className={`text-[10px] mb-1 font-mono transition-colors ${textColor}`}>
                  {forecast.chance}%
                </span>
                
                {/* La colonne (Barre) */}
                <div className="w-full h-full bg-[#0B0C10] rounded-t-sm flex items-end border border-gray-800/50 relative overflow-hidden">
                  <div 
                    className={`w-full rounded-t-sm border-t transition-all duration-700 ${barColor}`}
                    style={{ height: `${Math.max(forecast.chance, 5)}%` }} // Minimum 5% pour que la barre soit toujours un peu visible
                  ></div>
                </div>
                
                {/* L'heure en dessous */}
                <span className="text-xs font-mono font-bold mt-2 text-white">
                  {forecast.hour}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CARTE RADAR INTERACTIVE */}
      <div className="flex-1 w-full relative bg-[#0B0C10] border-t border-gray-800 min-h-[300px]">
        <iframe 
          width="100%" 
          height="100%" 
          src="https://embed.windy.com/embed2.html?lat=50.437&lon=5.971&zoom=11&level=surface&overlay=rain&menu=&message=&marker=&calendar=&pressure=&type=map&location=coordinates&detail=&detailLat=50.437&detailLon=5.971&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1" 
          frameBorder="0"
          className="absolute top-0 left-0 w-full h-full grayscale-[10%] contrast-125 opacity-90 hover:opacity-100 hover:grayscale-0 transition-all duration-500"
          title="Radar Météo Piste"
        ></iframe>
      </div>

    </div>
  );
}