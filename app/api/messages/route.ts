import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    const timestamp = new Date().getTime(); 
    // Adapte cette URL si elle est différente pour ton message.xml
    const url = `https://live.ris-timing.be/messages.xml?t=${timestamp}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);
    
    // On renvoie le texte XML brut, ton application sait le lire
    const xmlText = await response.text();
    return new NextResponse(xmlText, {
      headers: { 'Content-Type': 'application/xml' }
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}