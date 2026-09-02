const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export type SheetPriceRow = { niche: string; jobType: string | null; priceCents: number };

export async function fetchPricingFromSheet(): Promise<SheetPriceRow[]> {
  if (!SHEET_ID) throw new Error("GOOGLE_SHEET_ID is not set");
  if (!API_KEY) throw new Error("GOOGLE_PLACES_API_KEY is not set");

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A2:C1000?key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(`Sheet fetch failed: ${JSON.stringify(data)}`);

  const rows: string[][] = data.values || [];

  return rows
    .filter((r) => r[0] && r[2])
    .map((r) => ({
      niche: r[0].trim().toLowerCase(),
      jobType: r[1]?.trim() || null,
      priceCents: Math.round(Number(r[2]) * 100),
    }))
    .filter((r) => !Number.isNaN(r.priceCents));
}
