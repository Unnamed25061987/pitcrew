import { useState, useEffect, useRef } from 'react';
import { LiveCar } from '../components/dashboard/LiveLeaderboard'; // Importation de l'interface

export function useLiveTiming(format = 'JSON') {
  const [cars, setCars] = useState<LiveCar[]>([]);
  const [status, setStatus] = useState('CONNECTING...');
  const [error, setError] = useState<string | null>(null);

  // 🧠 LA MÉMOIRE DU LOGICIEL (pour calculer l'essence et la tendance)
  const previousLapsRef = useRef<Record<string, number>>({});
  const pitStopTrackerRef = useRef<Record<string, { lastPitLap: number, estimatedMaxLaps: number }>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (format === 'JSON') {
          // On appelle notre propre API Next.js (qui contourne le CORS)
          const response = await fetch('/api/timing');
          
          if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
          const data = await response.json();
          
          const parsedCars: LiveCar[] = (data.cars || []).map((car: any) => {
            const lap = car.lap || {};
            const gaps = car.gaps?.toLeader || {};
            const carNumStr = String(car.car_number);
            const currentLapCount = lap.lap_number || 0;
            const currentLapMs = lap.lap_time_ms || 0;
            
            // ----------------------------------------------------
            // 1. CALCUL DE LA TENDANCE (CHRONO)
            // ----------------------------------------------------
            let trend: 'improving' | 'worsening' | 'stable' = 'stable';
            let trendValue = "0.000";
            
            const prevLapMs = previousLapsRef.current[carNumStr];
            if (prevLapMs && currentLapMs > 0 && prevLapMs > 0) {
              const diffMs = currentLapMs - prevLapMs;
              trendValue = Math.abs(diffMs / 1000).toFixed(3);
              if (diffMs < -100) trend = 'improving'; // Il a gagné plus d'un dixième
              else if (diffMs > 100) trend = 'worsening'; // Il a perdu plus d'un dixième
            }
            // Sauvegarde du chrono actuel pour la prochaine boucle
            if (currentLapMs > 0) previousLapsRef.current[carNumStr] = currentLapMs;

            // ----------------------------------------------------
            // 2. ESTIMATION DU FUEL (Détection des Pit Stops)
            // ----------------------------------------------------
            if (!pitStopTrackerRef.current[carNumStr]) {
              // Initialisation (on estime un relais moyen à 25 tours au hasard pour les adversaires)
              pitStopTrackerRef.current[carNumStr] = { lastPitLap: currentLapCount, estimatedMaxLaps: 25 };
            }
            
            // Détection basique d'arrêt aux stands : le chrono est absurdement long (> 4 minutes) ou un indicateur JSON est présent
            const stopsCount = car.stops?.count || 0;
            const pitTracker = pitStopTrackerRef.current[carNumStr];
            
            // Si le temps au tour est énorme ou si la donnée RIS indique un pit_in
            if (currentLapMs > 240000 || lap.pit_in_time) {
              pitTracker.lastPitLap = currentLapCount; // Remise à zéro ! (Plein de carburant)
            }

            const lapsSincePit = Math.max(0, currentLapCount - pitTracker.lastPitLap);
            let fuelPct = 100 - ((lapsSincePit / pitTracker.estimatedMaxLaps) * 100);
            fuelPct = Math.max(0, Math.min(100, Math.round(fuelPct))); // On garde entre 0 et 100%

            // ----------------------------------------------------
            // 3. FORMATAGE DES TEXTES CLASSIQUES
            // ----------------------------------------------------
            let gapStr = "Leader";
            if (gaps.laps > 0) gapStr = `+${gaps.laps} Laps`;
            else if (gaps.ms > 0) gapStr = `+${(gaps.ms / 1000).toFixed(3)}s`;

            const msToChrono = (ms: number) => {
              if (!ms) return "-:--.---";
              const m = Math.floor(ms / 60000);
              const s = ((ms % 60000) / 1000).toFixed(3);
              return `${m}:${s.padStart(6, '0')}`;
            };

            return {
              pos: car.position,
              num: carNumStr,
              team: car.team,
              driver: car.driver,
              laps: currentLapCount,
              gap: gapStr,
              lastLap: msToChrono(currentLapMs),
              bestLap: msToChrono(lap.best_lap_ms),
              s1: lap.s1_ms ? (lap.s1_ms / 1000).toFixed(3) : '-',
              s2: lap.s2_ms ? (lap.s2_ms / 1000).toFixed(3) : '-',
              s3: lap.s3_ms ? (lap.s3_ms / 1000).toFixed(3) : '-',
              fuelPct: fuelPct,
              trend: trend,
              trendValue: trendValue
            };
          });

          setCars(parsedCars.sort((a, b) => a.pos - b.pos));
          setStatus('🟢 LIVE (JSON)');
          setError(null);
        }
      } catch (err: any) {
        setStatus('🔴 OFFLINE');
        setError(err.message);
      }
    };

    fetchData();
    // Actualisation très rapide pour suivre les secteurs !
    const intervalId = setInterval(fetchData, 2000);
    return () => clearInterval(intervalId);
  }, [format]);

  return { cars, status, error };
}