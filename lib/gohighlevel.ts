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

// Capitalizes the niche for display -- stored lowercase ("roofing")
// but should read as "Roofing" in a text.
function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Job details are free-typed by the team -- this just makes sure
// they read as a proper sentence (capitalized, ends with punctuation)
// without rewriting the actual content.
function polish(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function buildFullMessage(lead: LeadInfo) {
  return [
    `Lead Unlocked — ${titleCase(lead.niche)} (${lead.zip})`,
    lead.jobType ? `Type: ${lead.jobType}` : null,
    "",
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    lead.email ? `Email: ${lead.email}` : null,
    `Address: ${lead.address}`,
    "",
    `Details: ${polish(lead.jobDetails)}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function buildFreeTeaser(lead: { niche: string; zip: string; jobType: string | null; jobDetails: string }, freeRemaining: number) {
  return [
    `New ${titleCase(lead.niche)} Lead — ${lead.zip}`,
    lead.jobType ? `Type: ${lead.jobType}` : null,
    "",
    polish(lead.jobDetails),
    "",
    `You have ${freeRemaining} free lead${freeRemaining === 1 ? "" : "s"} remaining. Reply YES to unlock the full details.`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function buildPaymentPrompt(lead: { niche: string; zip: string; jobType: string | null; jobDetails: string }, paymentUrl: string) {
  return [
    `New ${titleCase(lead.niche)} Lead — ${lead.zip}`,
    lead.jobType ? `Type: ${lead.jobType}` : null,
    "",
    polish(lead.jobDetails),
    "",
    `Unlock the full details: ${paymentUrl}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

async function sendSMS(contractor: { name: string; phone: string }, message: string, fromNumber: string): Promise<{ messageId: string }> {
  const contactId = await upsertContact(contractor.name, contractor.phone);

  const res = await fetch(`${BASE_URL}/conversations/messages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ type: "SMS", contactId, message, fromNumber }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GHL send message failed: ${JSON.stringify(data)}`);
  return { messageId: data.messageId || data.id || "sent" };
}

export async function sendLeadInfoViaGHL(
  contractor: { name: string; phone: string },
  lead: LeadInfo,
  fromNumber: string
): Promise<{ messageId: string }> {
  return sendSMS(contractor, buildFullMessage(lead), fromNumber);
}

export async function sendFreeTeaserViaGHL(
  contractor: { name: string; phone: string },
  lead: { niche: string; zip: string; jobType: string | null; jobDetails: string },
  freeRemaining: number,
  fromNumber: string
): Promise<{ messageId: string }> {
  return sendSMS(contractor, buildFreeTeaser(lead, freeRemaining), fromNumber);
}

export async function sendPaymentPromptViaGHL(
  contractor: { name: string; phone: string },
  lead: { niche: string; zip: string; jobType: string | null; jobDetails: string },
  paymentUrl: string,
  fromNumber: string
): Promise<{ messageId: string }> {
  return sendSMS(contractor, buildPaymentPrompt(lead, paymentUrl), fromNumber);
}
