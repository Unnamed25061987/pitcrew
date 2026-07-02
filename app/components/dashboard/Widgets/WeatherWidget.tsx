"use client";
import React from 'react';
import { useWeather } from '../../../hooks/useWeather';

export default function WeatherWidget() {
  const { weather, forecast, status } = useWeather();
  const isRaining = weather?.precipitation > 0;

  return (
    <div className="bg-[#1F2833] h-full rounded-lg p-4 flex flex-col justify-between border border-gray-700 shadow-lg relative">
      <div className="absolute top-2 right-2 text-[10px] font-mono text-gray-500">{status}</div>

      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[#66FCF1] font-bold text-sm tracking-wider flex items-center">
          <span className="mr-2">☁️</span> TÉLÉMÉTRIE MÉTÉO
        </h3>
      </div>

      <div className="space-y-2 mb-3">
        <div className="bg-[#0B0C10] p-2 rounded flex justify-between items-center border border-gray-800">
          <span className="text-gray-500 text-xs font-bold uppercase">Temp. Air</span>
          <span className="text-lg font-mono font-bold text-white">{weather?.temperature_2m || '--'}°C</span>
        </div>
        <div className="bg-[#0B0C10] p-2 rounded flex justify-between items-center border border-gray-800">
          <span className="text-gray-500 text-xs font-bold uppercase">Pluie</span>
          <span className={`text-lg font-mono font-bold ${isRaining ? 'text-[#00ff66] animate-pulse' : 'text-[#66FCF1]'}`}>
            {weather?.precipitation || '0.0'} mm
          </span>
        </div>
      </div>

      <div>
        <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">Prévisions H/H</p>
        <div className="grid grid-cols-4 gap-1">
          {forecast.map((hour, idx) => (
            <div key={idx} className="bg-[#15171e] rounded p-1 flex flex-col items-center justify-between border border-gray-800 h-14">
              <span className="text-[9px] font-bold text-gray-400">{hour.time}</span>
              <span className={`text-[10px] font-mono font-bold ${hour.rainProb > 30 ? 'text-[#007acc]' : 'text-gray-500'}`}>
                {hour.rainProb}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}