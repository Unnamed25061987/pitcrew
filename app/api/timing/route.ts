import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15';
    
    // ÉTAPE 1 : On va chercher le cookie de session exactement comme ton Python
    const homeResponse = await fetch('https://live.ris-timing.be/funbe', {
      headers: { 'User-Agent': userAgent }
    });
    const cookies = homeResponse.headers.get('set-cookie') || '';

    // ÉTAPE 2 : On fait la requête avec le cookie et le Referer !
    const timestamp = new Date().getTime(); 
    const url = `https://live.ris-timing.be/api/live-timing?uuid=00000000-0000-0000-0000-000000000005&t=${timestamp}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'fr-be,fr-FR;q=0.9,en-US;q=0.8',
        'Referer': 'https://live.ris-timing.be/funbe', // LE SECRET EST ICI
        'Cookie': cookies // ET ICI
      }
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}