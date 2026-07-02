"use client";
import React from 'react';

export default function RadarWidget() {
  const windyIframeUrl = "https://embed.windy.com/embed2.html?lat=50.4370&lon=5.9701&detailLat=50.4370&detailLon=5.9701&zoom=10&level=surface&overlay=rain&product=radar&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1";

  return (
    <div className="bg-[#1F2833] h-full rounded-lg border border-gray-700 shadow-xl overflow-hidden flex flex-col">
      <div className="flex justify-between items-center p-2 bg-[#15171e] shrink-0 border-b border-gray-800">
        <h3 className="text-[#66FCF1] font-bold text-sm tracking-wider flex items-center">
          <span className="mr-2">📡</span> RADAR SATELLITE ANIMÉ
        </h3>
        {/* Un bouton fictif pour imiter la fonction "Pop-out" (Ouvrir sur un autre écran) */}
        <button className="text-gray-500 hover:text-white transition" title="Ouvrir sur un autre écran">
          ↗️
        </button>
      </div>
      
      <div className="flex-1 relative bg-black">
        <iframe 
          src={windyIframeUrl} 
          className="absolute inset-0 w-full h-full border-none"
          title="Radar Météo Windy"
          loading="lazy"
        ></iframe>
      </div>
    </div>
  );
}