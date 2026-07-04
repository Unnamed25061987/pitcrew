import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15';
    
    const homeResponse = await fetch('https://live.ris-timing.be/funbe', {
      headers: { 'User-Agent': userAgent }
    });
    const cookies = homeResponse.headers.get('set-cookie') || '';

    const timestamp = new Date().getTime(); 
    const url = `https://live.ris-timing.be/messages.xml?t=${timestamp}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Referer': 'https://live.ris-timing.be/funbe',
        'Cookie': cookies
      }
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);
    const xmlText = await response.text();
    
    return new NextResponse(xmlText, {
      headers: { 'Content-Type': 'application/xml' }
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}