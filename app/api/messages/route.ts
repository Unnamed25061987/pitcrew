import { NextResponse } from 'next/server';

export async function GET() {
  // On renvoie un tableau vide instantanément, sans interroger RIS !
  // Ça évite le bannissement IP et les erreurs 403.
  return NextResponse.json([]);
}