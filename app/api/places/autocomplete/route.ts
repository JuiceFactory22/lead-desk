import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get("input") || "";

  if (!input || input.length < 3 || !KEY) {
    return NextResponse.json({ predictions: [] });
  }

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:us&types=address&key=${KEY}`
  );
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return NextResponse.json({ predictions: [], error: data.status });
  }

  const predictions = (data.predictions || []).map((p: { place_id: string; description: string }) => ({
    placeId: p.place_id,
    description: p.description,
  }));

  return NextResponse.json({ predictions });
}
