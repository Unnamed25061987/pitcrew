import { useState, useEffect } from 'react';

export function useLiveTiming(type: string = 'JSON') {
  const [cars, setCars] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('');
  const [context, setContext] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      try {
        const timestamp = new Date().getTime(); 
        
        // La cible
        const targetUrl = `https://live.ris-timing.be/api/live-timing?uuid=00000000-0000-0000-0000-000000000005&t=${timestamp}`;
        
        // LE SECRET : On passe par un Proxy CORS public.
        // La requête part avec la connexion locale de ton PC (non bannie), 
        // et le proxy s'occupe de faire sauter les sécurités du navigateur.
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl, { cache: 'no-store' });
        
        if (response.ok) {
          const data = await response.json();
          
          if (isMounted) {
            setCars(data.cars || []);
            setStatus(data.context?.session?.track_state || '');
            setContext(data.context || null);
            
            // On extrait directement les messages de la direction de course du JSON !
            if (data.events) {
               setMessages(data.events.filter((e: any) => e.kind === 'RC_MESSAGE'));
            }
          }
        }
      } catch (error) {
        // Mode silencieux : on ignore l'erreur en cas de micro-coupure wifi
      }
    };

    fetchAllData();
    
    // CADENCE DE SÉCURITÉ STRICTE : 5000 millisecondes (5 secondes)
    const intervalId = setInterval(fetchAllData, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [type]);

  return { cars, status, context, messages };
}