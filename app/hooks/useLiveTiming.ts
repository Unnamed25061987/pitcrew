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
        // ON APPELLE NOTRE PROPRE API (Zéro problème de CORS)
        const response = await fetch('/api/ris', { cache: 'no-store' });
        
        if (response.ok) {
          const data = await response.json();
          
          if (isMounted && data) {
            setCars(data.cars || []);
            setStatus(data.context?.session?.track_state || '');
            setContext(data.context || null);
            setError(null);
            
            // Extraction directe des messages
            if (data.events) {
               setMessages(data.events.filter((e: any) => e.kind === 'RC_MESSAGE'));
            }
          }
        } else {
            if (isMounted) setError(`Erreur relais interne : ${response.status}`);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Erreur réseau interne');
      }
    };

    fetchAllData();
    
    // CADENCE STRICTE ET PACIFIÉE : 5 SECONDES
    const intervalId = setInterval(fetchAllData, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [type]);

  return { cars, status, context, messages, error };
}