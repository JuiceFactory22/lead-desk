import twilio from "twilio";
import { db } from "./db";
import { pickFromNumberForLead } from "./territories";

function client() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

function buildMessage(lead: { name: string; phone: string; email: string | null; address: string; jobDetails: string; niche: string; zip: string }) {
  return [
    `Lead unlocked -- ${lead.niche} (${lead.zip})`,
    lead.name,
    lead.phone,
    lead.email || null,
    lead.address,
    "",
    lead.jobDetails,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

// The single trigger this whole system exists for: payment clears ->
// this runs immediately -> contractor has the full lead in hand with
// no human in the loop. Called from the Stripe webhook and from the
// free-trial unlock path (both are "payment events" from the
// contractor's point of view, one just costs $0).
export async function deliverClaim(claimId: string) {
  const claim = await db.claim.findUnique({
    where: { id: claimId },
    include: { lead: true, contractor: true },
  });
  if (!claim) throw new Error(`Claim ${claimId} not found`);

  const body = buildMessage(claim.lead);

  try {
    const from = await pickFromNumberForLead(claim.lead);
    const msg = await client().messages.create({
      to: claim.contractor.phone,
      from,
      body,
    });
    return db.claim.update({
      where: { id: claimId },
      data: {
        status: "delivered",
        deliveredAt: new Date(),
        smsSid: msg.sid,
        sentFromNumber: from,
        deliveryError: null,
      },
    });
  } catch (err) {
    // Payment already succeeded -- never lose that. Just flag that the
    // automatic send failed so the team can see it and text manually.
    const message = err instanceof Error ? err.message : "Failed to send text";
    return db.claim.update({
      where: { id: claimId },
      data: { deliveryError: message.slice(0, 300) },
    });
  }
}
