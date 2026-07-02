import { NextResponse } from 'next/server';

export async function GET() {
  // On utilise l'URL JSON qui est beaucoup plus riche en événements
  const URL_JSON = "https://live.ris-timing.be/api/live-timing?uuid=00000000-0000-0000-0000-000000000005";

  try {
    const response = await fetch(URL_JSON, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache',
        'Referer': 'https://live.ris-timing.be/'
      },
      cache: 'no-store' // Jamais de cache pour du temps réel !
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Erreur RIS : ${response.status}` }, { status: response.status });
    }

    const data = await response.json();

    // 1. Extraction du Statut de la Piste (RUNNING, FCY, RED...)
    const trackStatus = data.context?.session?.track_state || "UNKNOWN";

    // 2. Extraction et Formatage du temps restant (depuis les ms)
    const remainMs = data.context?.session?.clock?.remaining_ms || 0;
    const totalSec = Math.floor(remainMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const remainStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    // 3. Extraction des Messages de Direction de Course (RC_MESSAGE, SLOW ZONE, etc.)
    let messagesList: string[] = [];
    if (data.events && Array.isArray(data.events)) {
      data.events.forEach((ev: any) => {
        // On attrape tous les messages officiels
        if (ev.message) {
          messagesList.push(ev.message);
        }
      });
    }
    // S'il y a plusieurs messages (ex: FCY + SLOW ZONE 1), on les sépare par un " ⚠️ "
    const finalMessage = messagesList.length > 0 ? messagesList.join(' ⚠️ ') : "";

    return NextResponse.json({
      trackStatus: trackStatus.toUpperCase(),
      remain: remainStr,
      message: finalMessage
    });

  } catch (error: any) {
    console.error("🔴 CRASH API MESSAGES :", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}