import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, fleetContext } = body;

    // Récupération sécurisée de la clé depuis le fichier .env.local
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API Gemini non configurée sur le serveur." }, { status: 500 });
    }

    // Le fameux "System Prompt" (Contextualisation)
    const systemPrompt = `
      Tu es le Directeur de Stratégie (IA) d'une équipe de course d'Endurance.
      Voici le contexte actuel de la course :
      ${fleetContext}
      
      RÈGLES STRATÉGIQUES STRICTES :
      1. Ne jamais recommander un arrêt si l'essence est > 75%.
      2. Si l'essence est < 65% et qu'un FCY tombe, anticipe l'arrêt.
      3. Surveille les temps de roulage.
      
      CONTRAINTE : Sois tranchant, réponds comme un ingénieur à la radio en 4 phrases max.
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nIngénieur : ${prompt}` }] }]
      })
    });

    if (!response.ok) {
      throw new Error("Erreur de communication avec Google AI.");
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "Pas de réponse claire.";

    return NextResponse.json({ reply: answer });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}