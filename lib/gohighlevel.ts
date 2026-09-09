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

async function upsertEmailContact(name: string, email: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/contacts/upsert`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ locationId: LOCATION_ID, name, email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GHL contact upsert failed: ${JSON.stringify(data)}`);
  return data.contact.id as string;
}

type LeadInfo = { name: string; phone: string; email: string | null; address: string; jobType: string | null; jobDetails: string; niche: string; zip: string; city: string | null; state: string | null };

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const ACRONYM_NICHES = new Set(["adu"]);
function nicheLabel(niche: string): string {
  const key = niche.trim().toLowerCase();
  return ACRONYM_NICHES.has(key) ? key.toUpperCase() : titleCase(niche);
}

function locationLabel(lead: { zip: string; city: string | null; state: string | null }): string {
  return lead.city ? `${lead.city}${lead.state ? `, ${lead.state}` : ""} ${lead.zip}` : lead.zip;
}

function polish(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function buildFullMessage(lead: LeadInfo) {
  return [
    "OK! Here's the full info for this one —",
    "",
    `Service Area: ${locationLabel(lead)}`,
    `Service Type: ${nicheLabel(lead.niche)}${lead.jobType ? ` - ${lead.jobType}` : ""}`,
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    lead.email ? `Email: ${lead.email}` : null,
    `Address: ${lead.address}`,
    `Details: ${polish(lead.jobDetails)}`,
    "",
    "Good luck! Let me know if you have any questions. And we will let you know next time a lead comes in.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function buildFreeTeaser(
  lead: { niche: string; zip: string; city: string | null; state: string | null; jobType: string | null; jobDetails: string },
  freeRemaining: number,
  freeLeadsLimit: number
) {
  return [
    `Hey, it's Krystelle! We have a new ${nicheLabel(lead.niche)} lead that looks like it fits your service area —`,
    "",
    `Service Area: ${locationLabel(lead)}`,
    lead.jobType ? `Service Type: ${lead.jobType}` : null,
    `Job Details: ${polish(lead.jobDetails)}`,
    "",
    `Just a reminder — we give you ${freeLeadsLimit} free lead${freeLeadsLimit === 1 ? "" : "s"} to start. You have ${freeRemaining} FREE lead${freeRemaining === 1 ? "" : "s"} left.`,
    "",
    `Just let me know if you want to redeem a free lead and I'll send all the details. Or you can pass and wait for something that's a better fit for you. Thanks!`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function buildPaymentPrompt(
  lead: { niche: string; zip: string; city: string | null; state: string | null; jobType: string | null; jobDetails: string },
  paymentUrl: string
) {
  return [
    `Hey, it's Krystelle! We have a new ${nicheLabel(lead.niche)} lead that looks like it fits your service area —`,
    "",
    `Service Area: ${locationLabel(lead)}`,
    lead.jobType ? `Service Type: ${lead.jobType}` : null,
    `Job Details: ${polish(lead.jobDetails)}`,
    "",
    `You already used all your free leads — but use this link to get the FULL contact details. Good luck! I hope you win the job.`,
    "",
    paymentUrl,
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
  lead: { niche: string; zip: string; city: string | null; state: string | null; jobType: string | null; jobDetails: string },
  freeRemaining: number,
  freeLeadsLimit: number,
  fromNumber: string
): Promise<{ messageId: string }> {
  return sendSMS(contractor, buildFreeTeaser(lead, freeRemaining, freeLeadsLimit), fromNumber);
}

export async function sendPaymentPromptViaGHL(
  contractor: { name: string; phone: string },
  lead: { niche: string; zip: string; city: string | null; state: string | null; jobType: string | null; jobDetails: string },
  paymentUrl: string,
  fromNumber: string
): Promise<{ messageId: string }> {
  return sendSMS(contractor, buildPaymentPrompt(lead, paymentUrl), fromNumber);
}

async function sendTeamEmail(subject: string, html: string): Promise<void> {
  const notifyEmails = (process.env.LEAD_NOTIFY_EMAIL || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (notifyEmails.length === 0) throw new Error("LEAD_NOTIFY_EMAIL is not set");

  for (const notifyEmail of notifyEmails) {
    const contactId = await upsertEmailContact("Lead Desk Notifications", notifyEmail);
    const res = await fetch(`${BASE_URL}/conversations/messages`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ type: "Email", contactId, subject, html, emailTo: notifyEmail }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`GHL send email failed for ${notifyEmail}: ${JSON.stringify(data)}`);
  }
}

export async function sendLeadDistributedEmail(lead: LeadInfo, contractors: { name: string }[]): Promise<void> {
  const subject = `Lead Distributed — ${nicheLabel(lead.niche)} (${locationLabel(lead)}) — ${contractors.length} contractor${contractors.length === 1 ? "" : "s"}`;
  const html = [
    `<p>A new lead just went out to ${contractors.length} contractor${contractors.length === 1 ? "" : "s"} already in the system.</p>`,
    `<p><strong>${nicheLabel(lead.niche)}${lead.jobType ? ` — ${lead.jobType}` : ""} (${locationLabel(lead)})</strong></p>`,
    `<p>Name: ${lead.name}<br>Phone: ${lead.phone}${lead.email ? `<br>Email: ${lead.email}` : ""}<br>Address: ${lead.address}</p>`,
    `<p>${polish(lead.jobDetails)}</p>`,
    contractors.length > 0
      ? `<p>Sent to: ${contractors.map((c) => c.name).join(", ")}</p>`
      : `<p>No contractors matched in the system yet -- reach out manually to contractors not yet added.</p>`,
  ].join("");
  return sendTeamEmail(subject, html);
}

export async function sendReplyReceivedEmail(params: { fromPhone: string; body: string; contractorName: string | null }): Promise<void> {
  const subject = `Reply Received${params.contractorName ? ` — ${params.contractorName}` : ""}`;
  const html = [
    `<p>Inbound text received${params.contractorName ? ` from <strong>${params.contractorName}</strong>` : " from an unrecognized number"}.</p>`,
    `<p>From: ${params.fromPhone}</p>`,
    `<p>Message: "${params.body}"</p>`,
  ].join("");
  return sendTeamEmail(subject, html);
}

export async function sendPaymentReceivedEmail(lead: LeadInfo, contractor: { name: string }, priceCents: number): Promise<void> {
  const subject = `Payment Received — ${nicheLabel(lead.niche)} (${locationLabel(lead)}) — $${(priceCents / 100).toFixed(0)}`;
  const html = [
    `<p><strong>${contractor.name}</strong> just paid $${(priceCents / 100).toFixed(0)} for a lead.</p>`,
    `<p>${nicheLabel(lead.niche)}${lead.jobType ? ` — ${lead.jobType}` : ""} (${locationLabel(lead)})</p>`,
    `<p>Lead: ${lead.name} — ${lead.phone}</p>`,
  ].join("");
  return sendTeamEmail(subject, html);
}
