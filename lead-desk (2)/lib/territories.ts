import { db } from "./db";

// Finds which territory this lead belongs to (same niche + zip
// matching logic as contractor matching) and returns its assigned
// phone number -- that's the number every contractor in this
// niche/region gets texted from, so it stays recognizable to them.
// Falls back to whichever active territory is marked isDefault, then
// to GHL_FALLBACK_NUMBER as a last resort.
export async function pickFromNumberForLead(lead: { niche: string; zip: string }): Promise<string> {
  const niche = lead.niche.trim().toLowerCase();
  const zip = lead.zip.trim();

  const territories = await db.territory.findMany({ where: { active: true } });
  const match = territories.find((t) => {
    const niches = t.niches.split(",").map((n) => n.trim().toLowerCase());
    const zips = t.zips.split(",").map((z) => z.trim());
    return niches.includes(niche) && zips.includes(zip);
  });
  if (match) return match.phoneNumber;

  const fallback = territories.find((t) => t.isDefault);
  if (fallback) return fallback.phoneNumber;

  if (process.env.GHL_FALLBACK_NUMBER) return process.env.GHL_FALLBACK_NUMBER;

  throw new Error("No sending number available: add a territory in /territories or set GHL_FALLBACK_NUMBER");
}
