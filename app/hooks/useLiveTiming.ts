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
        // 🚀 C'EST ICI LA MAGIE : On interroge TON hébergement web
        const targetUrl = `https://TON-VRAI-SITE.com/ris.php`;

        const response = await fetch(targetUrl, { cache: 'no-store' });
        
        if (response.ok) {
          const data = await response.json();
          if (isMounted && data && data.cars) {
            setCars(data.cars);
            setStatus(data.context?.session?.track_state || '');
            setContext(data.context || null);
            setError(null);
            if (data.events) {
               setMessages(data.events.filter((e: any) => e.kind === 'RC_MESSAGE'));
            }
          }
        } else {
            if (isMounted) setError(`Erreur pont PHP : ${response.status}`);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Erreur réseau');
      }
    };

    fetchAllData();
    // ⏱️ 5 SECONDES : Parfait pour l'endurance
    const intervalId = setInterval(fetchAllData, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [type]);

  return { cars, status, context, messages, error };
}