import { db } from "./db";
import { sendLeadInfoViaGHL } from "./gohighlevel";

// The single trigger this whole system exists for: payment clears ->
// this runs immediately -> contractor has the full lead in hand with
// no human in the loop. Called from the Square webhook and from the
// free-trial unlock path (both are "payment events" from the
// contractor's point of view, one just costs $0).
export async function deliverClaim(claimId: string) {
  const claim = await db.claim.findUnique({
    where: { id: claimId },
    include: { lead: true, contractor: true },
  });
  if (!claim) throw new Error(`Claim ${claimId} not found`);

  try {
    // One single number for every delivery text -- CallRail's local
    // numbers already handle the "get a good response rate" job on
    // the opt-in text; by the time someone's paid, the number on the
    // delivery text doesn't need to do any more persuading.
    const from = process.env.GHL_SENDING_NUMBER;
    if (!from) throw new Error("GHL_SENDING_NUMBER is not set");

    const { messageId } = await sendLeadInfoViaGHL(claim.contractor, claim.lead, from);
    return db.claim.update({
      where: { id: claimId },
      data: {
        status: "delivered",
        deliveredAt: new Date(),
        smsSid: messageId,
        sentFromNumber: from,
        deliveryError: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send text";
    return db.claim.update({
      where: { id: claimId },
      data: { deliveryError: message.slice(0, 300) },
    });
  }
}
