const BASE_URL = "https://services.leadconnectorhq.com";
const TOKEN = process.env.GHL_PRIVATE_TOKEN;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
const API_VERSION = "2021-07-28";

function headers() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Version: API_VERSION,
    "Content-Type": "application/json",
  };
}

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

type LeadInfo = { name: string; phone: string; email: string | null; address: string; jobType: string | null; jobDetails: string; niche: string; zip: string };

function buildFullMessage(lead: LeadInfo) {
  return [
    `Lead Unlocked -- ${lead.niche} (${lead.zip})`,
    lead.jobType ? `Type: ${lead.jobType}` : null,
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    lead.email ? `Email: ${lead.email}` : null,
    `Address: ${lead.address}`,
    `Details: ${lead.jobDetails}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function buildFreeTeaser(lead: { niche: string; zip: string; jobType: string | null; jobDetails: string }, freeRemaining: number) {
  return [
    `New ${lead.niche} lead in ${lead.zip}${lead.jobType ? ` -- ${lead.jobType}` : ""}, matching your service area.`,
    lead.jobDetails,
    "",
    `You have ${freeRemaining} free lead${freeRemaining === 1 ? "" : "s"} left. Reply YES to get the full details.`,
  ].join("\n");
}

function buildPaymentPrompt(lead: { niche: string; zip: string; jobType: string | null; jobDetails: string }, paymentUrl: string) {
  return [
    `New ${lead.niche} lead in ${lead.zip}${lead.jobType ? ` -- ${lead.jobType}` : ""}, matching your service area.`,
    lead.jobDetails,
    "",
    `Unlock the
