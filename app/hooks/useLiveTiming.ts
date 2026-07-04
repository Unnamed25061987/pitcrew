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
        // 1. DATA JSON TIMING
        const resTiming = await fetch('/api/timing', { cache: 'no-store' });
        if (resTiming.ok) {
          const data = await resTiming.json();
          if (isMounted && data) {
            setCars(Array.isArray(data.cars) ? data.cars : []);
            setStatus(String(data.context?.session?.track_state || ''));
            setContext(data.context || null);
            setError(null);
            
            if (data.events) {
               setMessages(data.events.filter((e: any) => e.kind === 'RC_MESSAGE'));
            }
          }
        } else {
           if (isMounted) setError(`Erreur Timing: ${resTiming.status}`);
        }

        // 2. DATA MESSAGES XML
        const resMessages = await fetch('/api/messages', { cache: 'no-store' });
        if (resMessages.ok) {
           const xmlText = await resMessages.text();
           // Ton application gère le XML ici si besoin
        }

      } catch (err: any) {
        if (isMounted) setError(err.message || 'Erreur réseau');
      }
    };

    // Premier appel
    fetchAllData();
    
    // ⏱️ SÉCURITÉ ABSOLUE : 5 SECONDES 
    const intervalId = setInterval(fetchAllData, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [type]);

  return { cars, status, context, messages, error };
}