import { NextResponse } from 'next/server';

export async function GET() {
  const TARGET_URL = 'https://live.ris-timing.be/api/live-timing?uuid=00000000-0000-0000-0000-000000000005';

  try {
    const response = await fetch(TARGET_URL, {
      method: 'GET',
      headers: {
        // C'est ici qu'on trompe la vigilance du serveur RIS
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      // Important pour Next.js (App Router) : forcer le serveur à ne pas mettre cette route en cache statique
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Erreur serveur RIS: ${response.status}`);
    }

    const data = await response.json();

    // On renvoie la donnée au format JSON à notre frontend
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Erreur de récupération LiveTiming API:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer le livetiming' },
      { status: 500 }
    );
  }
}