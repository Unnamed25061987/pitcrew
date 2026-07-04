import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    const timestamp = new Date().getTime(); 
    const url = `https://live.ris-timing.be/api/live-timing?uuid=00000000-0000-0000-0000-000000000005&t=${timestamp}`;

    // Le backend Next.js fait la requête : Zéro problème de CORS ici.
    // On met exactement l'empreinte de ton Firefox.
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'fr,fr-FR;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive',
        'Host': 'live.ris-timing.be',
        'Priority': 'u=0, i',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`RIS a bloqué la requête back-end (Statut ${response.status})`);
    }

    const data = await response.json();
    
    // On renvoie les données au front-end de ton application
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
    
  } catch (error: any) {
    console.error("Erreur API interne RIS :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}