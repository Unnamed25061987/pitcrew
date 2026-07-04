import { useState, useEffect } from 'react';

export function useLiveTiming(type: string = 'JSON') {
  const [cars, setCars] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('');
  const [context, setContext] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  // 🟢 ON RESTAURE LA VARIABLE ERROR ICI POUR LE LEADERBOARD
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      try {
        const timestamp = new Date().getTime(); 
        
        // La cible brute
        const targetUrl = `https://live.ris-timing.be/api/live-timing?uuid=00000000-0000-0000-0000-000000000005&t=${timestamp}`;
        
        // Le Proxy CORS 
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl, { cache: 'no-store' });
        
        if (response.ok) {
          const data = await response.json();
          
          if (isMounted) {
            setCars(data.cars || []);
            setStatus(data.context?.session?.track_state || '');
            setContext(data.context || null);
            setError(null); // Tout va bien, pas d'erreur
            
            if (data.events) {
               setMessages(data.events.filter((e: any) => e.kind === 'RC_MESSAGE'));
            }
          }
        } else {
            if (isMounted) setError(`Erreur serveur Proxy ou RIS : ${response.status}`);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Erreur réseau de lecture');
      }
    };

    fetchAllData();
    
    // CADENCE DE SÉCURITÉ STRICTE : 5000 millisecondes
    const intervalId = setInterval(fetchAllData, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [type]);

  // 🟢 ON RENVOIE BIEN L'ERREUR POUR QUE LE RESTE DE L'APP FONCTIONNE
  return { cars, status, context, messages, error };
}