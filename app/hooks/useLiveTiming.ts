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
        
        // 🚀 URL DIRECTE DE RIS (Zéro Proxy)
        const targetUrl = `https://live.ris-timing.be/api/live-timing?uuid=00000000-0000-0000-0000-000000000005&t=${timestamp}`;

        const response = await fetch(targetUrl, { 
          cache: 'no-store',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (isMounted && data) {
            setCars(data.cars || []);
            setStatus(data.context?.session?.track_state || '');
            setContext(data.context || null);
            setError(null);
            if (data.events) {
               setMessages(data.events.filter((e: any) => e.kind === 'RC_MESSAGE'));
            }
          }
        } else {
            if (isMounted) setError(`Erreur RIS : ${response.status}`);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Erreur réseau');
      }
    };

    fetchAllData();
    // ⏱️ 5 SECONDES (Sécurité anti-ban)
    const intervalId = setInterval(fetchAllData, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [type]);

  return { cars, status, context, messages, error };
}