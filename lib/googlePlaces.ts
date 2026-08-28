const KEY = process.env.GOOGLE_PLACES_API_KEY;

type PlaceSearchResult = { place_id: string; name: string; formatted_address?: string };
type PlaceDetails = { name: string; formatted_phone_number?: string; formatted_address?: string };

// Text Search: "roofing contractors in 33101". Returns up to the
// first page of results (~20) -- plenty for a periodic top-up search,
// and keeps the API cost per run predictable.
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  if (!KEY) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Places search failed: ${data.status} ${data.error_message || ""}`);
  }
  return data.results || [];
}

// Text Search doesn't include phone numbers -- a separate Details
// call per place is required to get formatted_phone_number.
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!KEY) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  const fields = "name,formatted_phone_number,formatted_address";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK") return null;
  return data.result;
}
