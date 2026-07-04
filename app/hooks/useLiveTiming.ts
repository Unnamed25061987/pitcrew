import { useState, useEffect } from 'react';

// Fonction de traduction Python -> React pour les chronos
const msToChrono = (ms: number | undefined | null) => {
  if (!ms) return "-:--.---";
  const minutes = Math.floor(ms / 60000);
  const seconds = (ms % 60000) / 1000;
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
};

// Fonction de traduction Python -> React pour les écarts
const formatGap = (gapsInfo: any) => {
    if (!gapsInfo || !gapsInfo.toLeader) return "Leader";
    const laps = gapsInfo.toLeader.laps;
    const ms = gapsInfo.toLeader.ms;
    if (laps > 0) return `+${laps} Trs`;
    if (ms > 0) return `+${(ms/1000).toFixed(3)}s`;
    return "Leader";
};

export function useLiveTiming(type: string = 'JSON') {
  const [cars, setCars] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('');
  const [context, setContext] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      try {
        const resTiming = await fetch('/api/timing', { cache: 'no-store' });
        
        if (resTiming.ok) {
          const data = await resTiming.json();
          
          if (isMounted) {
            // Gestion de l'erreur propre qu'on a créée dans l'API
            if (data.error_api) {
                setError(`API RIS: ${data.error_api}`);
            } else if (data && data.cars) {
                
              // 🚀 C'EST ICI QUE TOUT SE JOUE : TRADUCTION EXACTE COMME EN PYTHON
              const formattedCars = data.cars.map((c: any) => {
                const lapInfo = c.lap || {};
                return {
                  num: String(c.car_number || "").trim(),
                  pos: c.position || "-",
                  team: String(c.team || "").trim(),
                  driver: String(c.driver || "-").trim(),
                  laps: lapInfo.lap_number || 0,
                  gap: formatGap(c.gaps),
                  lastLap: msToChrono(lapInfo.lap_time_ms),
                  bestLap: msToChrono(lapInfo.best_lap_ms),
                  s1: lapInfo.s1_best_ms ? (lapInfo.s1_best_ms / 1000).toFixed(2) : "-",
                  s2: lapInfo.s2_best_ms ? (lapInfo.s2_best_ms / 1000).toFixed(2) : "-",
                  s3: lapInfo.s3_best_ms ? (lapInfo.s3_best_ms / 1000).toFixed(2) : "-",
                  car_state: lapInfo.car_state || c.car_state || c.state || 'RUN'
                };
              });

              setCars(formattedCars);
              setStatus(String(data.context?.session?.track_state || ''));
              setContext(data.context || null);
              setError(null);
              
              if (data.events) {
                 setMessages(data.events.filter((e: any) => e.kind === 'RC_MESSAGE'));
              }
            }
          }
        }
      } catch (err: any) {
        if (isMounted) setError('Erreur réseau locale');
      }
    };

    fetchAllData();
    const intervalId = setInterval(fetchAllData, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [type]);

  return { cars, status, context, messages, error };
}