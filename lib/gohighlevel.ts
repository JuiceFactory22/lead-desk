const BASE_URL = "https://services.leadconnectorhq.com";
const TOKEN = process.env.GHL_PRIVATE_TOKEN;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
// GHL's API is versioned by a header, not the URL -- this pins us to
// a known-working version instead of silently picking up breaking
// changes.
const API_VERSION = "2021-07-28";

function headers() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Version: API_VERSION,
    "Content-Type": "application/json",
  };
}

// GHL sends SMS to a Contact, not a raw phone number, so a contractor
// has to exist as a Contact first. "upsert" means: create them if
// they're new, or just return the existing one if we've already sent
// them a lead before -- safe to call every time.
async function upsertContact(name: string, phone: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/contacts/upsert`, {
    method: "POST",
