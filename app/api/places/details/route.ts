import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("placeId") || "";

  if (!placeId || !KEY) {
    return NextResponse.json({ address: null, zip: null });
  }

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,address_components&key=${KEY}`
  );
  const data = await res.json();

  if (data.status !== "OK" || !data.result) {
    return NextResponse.json({ address: null, zip: null });
  }

  const components: { long_name: string; types: string[] }[] = data.result.address_components || [];
  const zipComponent = components.find((c) => c.types.includes("postal_code"));

  return NextResponse.json({
    address: data.result.formatted_address as string,
    zip: zipComponent?.long_name ?? null,
  });
}
