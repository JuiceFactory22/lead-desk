const BASE_URL = "https://services.leadconnectorhq.com";
const TOKEN = process.env.GHL_PRIVATE_TOKEN;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
// GHL's API is versioned by a header, not the URL -- this pins us to
// a known-working version instead of silently picking up breaking
// changes.
const API_VERSION = "2021-07-28";

console.log("GHL_TOKEN_DEBUG", { length: TOKEN?.length, startsWithPit: TOKEN?.startsWith("pit-"), locationIdLength: LOCATION_ID?.length });

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
    headers: headers(),
    body: JSON.stringify({ locationId: LOCATION_ID, name, phone }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GHL contact upsert failed: ${JSON.stringify(data)}`);
  return data.contact.id as string;
}

function buildMessage(lead: { name: string; phone: string; email: string | null; address: string; jobDetails: string; niche: string; zip: string }) {
  return [
    `Lead Unlocked -- ${lead.niche} (${lead.zip})`,
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    lead.email ? `Email: ${lead.email}` : null,
    `Address: ${lead.address}`,
    `Details: ${lead.jobDetails}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

// Sends the full lead info to a contractor through GoHighLevel,
// using your existing registered number/campaign rather than a
// separate Twilio A2P registration. `fromNumber` lets a specific
// territory number send it, same idea as before.
export async function sendLeadInfoViaGHL(
  contractor: { name: string; phone: string },
  lead: { name: string; phone: string; email: string | null; address: string; jobDetails: string; niche: string; zip: string },
  fromNumber: string
): Promise<{ messageId: string }> {
  const contactId = await upsertContact(contractor.name, contractor.phone);

  const res = await fetch(`${BASE_URL}/conversations/messages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      type: "SMS",
      contactId,
      message: buildMessage(lead),
      fromNumber,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GHL send message failed: ${JSON.stringify(data)}`);
  return { messageId: data.messageId || data.id || "sent" };
}
