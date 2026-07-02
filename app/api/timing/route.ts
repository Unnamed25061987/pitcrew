import { NextResponse } from 'next/server';

export async function GET() {
  // L'URL cible (dans la V2 finale, on pourra passer ça en paramètre dynamique)
  const URL_JSON = "https://live.ris-timing.be/api/live-timing?uuid=00000000-0000-0000-0000-000000000005";

  try {
    // 🎭 LA SESSION FURTIVE : On se fait passer pour Chrome sur Windows
    const response = await fetch(URL_JSON, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Connection': 'keep-alive',
        'Referer': 'https://live.ris-timing.be/', // On fait croire qu'on vient de leur propre site !
        'Cache-Control': 'no-cache'
      },
      // IMPORTANT : On force Next.js à ne jamais mettre en cache cette requête (Live Timing = temps réel)
      cache: 'no-store' 
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Rejet du serveur RIS : ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}