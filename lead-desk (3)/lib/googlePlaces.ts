// Places API (New) -- the legacy "Places API" is in maintenance mode,
// so this targets the current one. Text Search (New) can return the
// phone number directly via the field mask, so unlike the legacy API
// there's no separate "Place Details" call needed.
const KEY = process.env.GOOGLE_PLACES_API_KEY;
const FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber";

export type PlaceResult = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
};

// Text Search (New): "roofing contractors in 33101". Returns up to
// the first page of results (~20) -- plenty for a periodic top-up
// search, and keeps the API cost per run predictable.
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  if (!KEY) throw new Error("GOOGLE_PLACES_API_KEY is not set");

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Places search failed: ${data.error?.message || res.statusText}`);
  }

  const places = data.places || [];
  return places.map((p: any) => ({
    id: p.id,
    name: p.displayName?.text || "Unknown business",
    phone: p.internationalPhoneNumber || null,
    address: p.formattedAddress || null,
  }));
}
