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
        // 1. Appel du Timing
        const resTiming = await fetch('/api/timing', { cache: 'no-store' });
        if (resTiming.ok) {
          const data = await resTiming.json();
          if (isMounted && data) {
            setCars(data.cars || []);
            setStatus(String(data.context?.session?.track_state || ''));
            setContext(data.context || null);
            setError(null);
            
            // Si les messages sont dans le JSON directement, on les prend
            if (data.events) {
               setMessages(data.events.filter((e: any) => e.kind === 'RC_MESSAGE'));
            }
          }
        } else {
           if (isMounted) setError(`Erreur serveur Timing: ${resTiming.status}`);
        }

        // 2. Appel du XML Messages
        const resMessages = await fetch('/api/messages', { cache: 'no-store' });
        if (resMessages.ok) {
           const xmlText = await resMessages.text();
           // Si tu as une logique spécifique pour lire le XML, elle se fait ici.
        }

      } catch (err: any) {
        if (isMounted) setError(err.message || 'Erreur réseau');
      }
    };

    // Premier appel au chargement
    fetchAllData();
    
    // 🔒 VERROUILLAGE STRICT : 5000 ms (5 secondes)
    const intervalId = setInterval(fetchAllData, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [type]);

  return { cars, status, context, messages, error };
}