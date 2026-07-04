import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
    
    let cookies = '';
    try {
        const homeResponse = await fetch('https://live.ris-timing.be/funbe', {
          headers: { 'User-Agent': userAgent },
          cache: 'no-store'
        });
        cookies = homeResponse.headers.get('set-cookie') || '';
    } catch (e) {
        // On ignore silencieusement si la récupération du cookie échoue
    }

    const timestamp = new Date().getTime(); 
    const url = `https://live.ris-timing.be/api/live-timing?uuid=00000000-0000-0000-0000-000000000005&t=${timestamp}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'application/json',
        'Referer': 'https://live.ris-timing.be/funbe',
        'Cookie': cookies
      },
      cache: 'no-store'
    });

    // SÉCURITÉ ANTI-500 : Si RIS bloque, on renvoie une erreur "propre" gérable par React
    if (!response.ok) {
        return NextResponse.json({ cars: [], error_api: `Code Serveur RIS: ${response.status}` }, { status: 200 });
    }
    
    const text = await response.text();
    try {
        const data = JSON.parse(text);
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ cars: [], error_api: "JSON illisible (blocage Cloudflare ?)" }, { status: 200 });
    }
    
  } catch (error: any) {
    return NextResponse.json({ cars: [], error_api: error.message }, { status: 200 });
  }
}