import { useState, useEffect } from 'react';

// Coordonnées de Spa-Francorchamps par défaut
const LAT = 50.4370;
const LON = 5.9701;

export function useWeather() {
  const [weather, setWeather] = useState<any>(null);
  const [status, setStatus] = useState('CONNECTING...');
  const [forecast, setForecast] = useState<any[]>([]);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // API Open-Meteo : On demande la météo actuelle + les prévisions par heure
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,precipitation&timezone=auto`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Erreur Météo");
        const data = await response.json();

        setWeather(data.current);

        // Extraction des prévisions pour les 4 prochaines heures
        const nextHours = [];
        for (let i = 1; i <= 4; i++) {
          nextHours.push({
            time: new Date(data.hourly.time[i]).getHours() + "h",
            temp: data.hourly.temperature_2m[i],
            rainProb: data.hourly.precipitation_probability[i],
            rainVol: data.hourly.precipitation[i]
          });
        }
        setForecast(nextHours);
        setStatus('🟢 RADAR ACTIF');

      } catch (error) {
        setStatus('🔴 RADAR HORS LIGNE');
      }
    };

    fetchWeather();
    // La météo ne change pas à la seconde, on actualise toutes les 5 minutes (300000 ms)
    const intervalId = setInterval(fetchWeather, 300000);
    return () => clearInterval(intervalId);
  }, []);

  return { weather, forecast, status };
}