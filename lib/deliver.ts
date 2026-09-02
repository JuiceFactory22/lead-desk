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

  // Payment processors (Square included) can send the same "payment
  // completed" notification more than once by design, for
  // reliability -- without this guard, a duplicate webhook call
  // means a duplicate text.
  if (claim.status === "delivered") return claim;

  try {
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
