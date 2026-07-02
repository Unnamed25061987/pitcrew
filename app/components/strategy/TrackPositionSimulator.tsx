"use client";
import React, { useState, useMemo } from 'react';

// Faux classement reçu du RIS Timing (en secondes d'écart avec le leader)
const mockLeaderboard = [
  { pos: 1, num: '7', team: 'Notre Écurie', driver: 'Pilote A', gapToLeader: 0 },
  { pos: 2, num: '23', team: 'Rival Racing', driver: 'Pilote X', gapToLeader: 15 },
  { pos: 3, num: '88', team: 'Speedster', driver: 'Pilote Y', gapToLeader: 42 },
  { pos: 4, num: '9', team: 'Trafic Lent', driver: 'Amateur 1', gapToLeader: 68 },
  { pos: 5, num: '12', team: 'Midfield', driver: 'Pilote Z', gapToLeader: 85 },
];

export default function TrackPositionSimulator() {
  // Paramètres de l'arrêt
  const [pitTransitTime, setPitTransitTime] = useState(30); // Temps PitIn -> PitOut (vitesse limitée)
  const [stationaryTime, setStationaryTime] = useState(35); // Temps immobilisé (essence/pneus)
  
  // On cible notre voiture (ex: la numéro 7)
  const myCarNum = '7';
  const totalPitLoss = pitTransitTime + stationaryTime;

  // Algorithme de prédiction
  const predictedReEntry = useMemo(() => {
    // 1. Trouver notre voiture
    const myCar = mockLeaderboard.find(c => c.num === myCarNum);
    if (!myCar) return [];

    // 2. Calculer notre NOUVEL écart virtuel avec le leader si on s'arrête maintenant
    const myNewVirtualGap = myCar.gapToLeader + totalPitLoss;

    // 3. Recréer le classement avec notre nouvelle position
    const projectedBoard = mockLeaderboard.map(car => {
      if (car.num === myCarNum) {
        return { ...car, virtualGap: myNewVirtualGap, isMe: true };
      }
      // On assume que les autres gardent leur écart actuel pour simplifier
      return { ...car, virtualGap: car.gapToLeader, isMe: false };
    });

    // 4. Trier le nouveau classement
    projectedBoard.sort((a, b) => a.virtualGap - b.virtualGap);
    return projectedBoard;
  }, [pitTransitTime, stationaryTime]);

  return (
    <div className="bg-[#1F2833] rounded-lg p-6 border border-gray-700 shadow-xl">
      <h3 className="text-xl text-[#66FCF1] font-bold mb-4 flex items-center">
        <span className="mr-2">🔮</span> PRÉDICTEUR DE RETOUR EN PISTE (TRAFIC)
      </h3>

      {/* Contrôles du Pit Stop */}
      <div className="flex space-x-6 mb-6 p-4 bg-[#0B0C10] rounded border border-gray-800">
        <div>
          <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Transit Pitlane (s)</label>
          <input 
            type="number" 
            value={pitTransitTime}
            onChange={(e) => setPitTransitTime(Number(e.target.value) || 0)}
            className="bg-[#1F2833] border border-gray-600 rounded p-2 text-white w-24 text-center focus:border-[#45A29E] outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Temps Arrêt Box (s)</label>
          <input 
            type="number" 
            value={stationaryTime}
            onChange={(e) => setStationaryTime(Number(e.target.value) || 0)}
            className="bg-[#1F2833] border border-gray-600 rounded p-2 text-[#ffaa00] font-bold w-24 text-center focus:border-[#45A29E] outline-none"
          />
        </div>
        <div className="flex items-end pb-2">
          <div className="text-sm">
            <span className="text-gray-400">Total Pit Loss: </span>
            <span className="text-xl font-bold text-red-400 ml-2">{totalPitLoss} sec</span>
          </div>
        </div>
      </div>

      {/* Affichage du Trafic Projeté */}
      <div className="relative">
        {/* Ligne temporelle verticale (décorative) */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-700"></div>

        <ul className="space-y-3 relative z-10">
          {predictedReEntry.map((car, index) => {
            
            // Calcul de l'écart relatif avec notre voiture à la sortie
            const myCarProjected = predictedReEntry.find(c => c.isMe);
            const relativeGap = myCarProjected ? (myCarProjected.virtualGap - car.virtualGap) : 0;
            
            let gapText = "";
            let gapColor = "";
            
            if (car.isMe) {
              gapText = "SORTIE DES STANDS";
              gapColor = "text-[#66FCF1]";
            } else if (relativeGap > 0) {
              gapText = `${relativeGap.toFixed(1)}s DEVANT NOUS`;
              gapColor = relativeGap < 5 ? "text-red-500" : "text-gray-400"; // Alerte trafic !
            } else {
              gapText = `${Math.abs(relativeGap).toFixed(1)}s DERRIÈRE NOUS`;
              gapColor = Math.abs(relativeGap) < 5 ? "text-[#ffaa00]" : "text-gray-400"; // Attention à la pression
            }

            return (
              <li key={car.num} className={`flex items-center p-3 rounded border ${car.isMe ? 'bg-[#1a383d] border-[#45A29E]' : 'bg-[#0B0C10] border-gray-800'}`}>
                <div className={`w-12 text-center font-black text-xl ${car.isMe ? 'text-[#66FCF1]' : 'text-gray-500'}`}>
                  P{index + 1}
                </div>
                <div className="flex-1 ml-4">
                  <div className="flex items-center">
                    <span className="font-bold text-white mr-2">#{car.num}</span>
                    <span className="text-sm text-gray-300">{car.team}</span>
                  </div>
                  <div className="text-xs text-gray-500">{car.driver}</div>
                </div>
                <div className={`text-sm font-bold tracking-wider ${gapColor}`}>
                  {gapText}
                  {Math.abs(relativeGap) < 5 && !car.isMe && <span className="ml-2 text-xl animate-pulse">⚠️</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

    </div>
  );
}