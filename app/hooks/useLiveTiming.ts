import { useState, useEffect } from 'react';

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
        const timestamp = new Date().getTime(); 
        
        // 1. L'URL cible de RIS
        const targetUrl = `https://live.ris-timing.be/api/live-timing?uuid=00000000-0000-0000-0000-000000000005&t=${timestamp}`;
        
        // 2. Le super Proxy qui fait sauter le CORS et les pare-feux
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

        // La requête part de ton PC, passe par le proxy, et revient proprement
        const response = await fetch(proxyUrl, { cache: 'no-store' });
        
        if (response.ok) {
          const data = await response.json();
          
          if (isMounted && data) {
            setCars(data.cars || []);
            setStatus(data.context?.session?.track_state || '');
            setContext(data.context || null);
            setError(null); // Plus d'erreur !
            
            if (data.events) {
               setMessages(data.events.filter((e: any) => e.kind === 'RC_MESSAGE'));
            }
          }
        } else {
            if (isMounted) setError(`Proxy a renvoyé : ${response.status}`);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Erreur réseau');
      }
    };

    fetchAllData();
    
    // SÉCURITÉ CONSERVÉE : On rafraîchit toutes les 5 secondes
    const intervalId = setInterval(fetchAllData, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [type]);

  return { cars, status, context, messages, error };
}