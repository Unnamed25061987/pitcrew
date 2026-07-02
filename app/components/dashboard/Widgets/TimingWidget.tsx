"use client";
import React from 'react';
// On importe notre nouveau moteur d'acquisition !
import { useLiveTiming } from '../../../hooks/useLiveTiming';

export default function TimingWidget() {
  // On allume le moteur ! (Il récupère le JSON en fond)
  const { cars, status } = useLiveTiming('JSON');

  // Si on a des données, on prend la première voiture (P1), sinon on met des valeurs par défaut
  const p1Car = cars.length > 0 ? cars[0] : null;

  return (
    <div className="bg-[#1F2833] h-full rounded-lg p-4 flex flex-col justify-between border border-gray-700 shadow-lg overflow-hidden relative">
      
      {/* Voyant de connexion réseau (petit point vert/rouge en haut à droite) */}
      <div className="absolute top-2 right-2 text-[10px] font-mono text-gray-500">
        {status}
      </div>

      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[#66FCF1] font-bold text-sm tracking-wider flex items-center">
          <span className="mr-2">⏱️</span> LEADER TIMING
        </h3>
        <span className="bg-[#00ff66] text-black text-xs font-black px-2 py-1 rounded">
          P {p1Car?.pos || '-'}
        </span>
      </div>

      {/* Info du Pilote et de la voiture */}
      <div className="text-center mb-2">
        <p className="text-white font-bold">{p1Car?.driver || 'En attente...'}</p>
        <p className="text-gray-400 text-xs uppercase">#{p1Car?.num || '-'} • {p1Car?.team || '-'}</p>
      </div>

      <div className="text-center my-2 flex-1 flex flex-col justify-center">
        <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">Dernier Tour (T{p1Car?.laps || 0})</p>
        <p className="text-4xl font-mono font-bold text-white tracking-tight">
          {p1Car?.lastLap || '-:--.---'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-700 pt-3">
        <div className="bg-[#0B0C10] rounded py-1 border border-gray-800">
          <p className="text-gray-500 text-[10px] font-bold">SECTEUR 1</p>
          <p className="text-white font-mono text-sm font-bold">{p1Car?.s1 || '-'}</p>
        </div>
        <div className="bg-[#0B0C10] rounded py-1 border border-gray-800">
          <p className="text-gray-500 text-[10px] font-bold">SECTEUR 2</p>
          <p className="text-white font-mono text-sm font-bold">{p1Car?.s2 || '-'}</p>
        </div>
        <div className="bg-[#0B0C10] rounded py-1 border border-gray-800">
          <p className="text-gray-500 text-[10px] font-bold">SECTEUR 3</p>
          <p className="text-white font-mono text-sm font-bold">{p1Car?.s3 || '-'}</p>
        </div>
      </div>
      
    </div>
  );
}