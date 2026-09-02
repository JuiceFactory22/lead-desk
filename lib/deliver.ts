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
  // completed" notification several times within seconds of each
  // other, by design, for reliability. A plain read-then-check can't
  // fully protect against that -- two calls can both read "not yet
  // delivered" before either one finishes updating it. This update
  // is atomic at the database level: only the one call that actually
  // succeeds in flipping paid -> delivered proceeds to send. Every
  // other concurrent call gets count 0 and skips.
  const claimed = await db.claim.updateMany({
    where: { id: claimId, status: "paid" },
    data: { status: "delivered", deliveredAt: new Date() },
  });
  if (claimed.count === 0) {
    return db.claim.findUnique({ where: { id: claimId } });
  }

  try {
    const from = process.env.GHL_SENDING_NUMBER;
    if (!from) throw new Error("GHL_SENDING_NUMBER is not set");

    const { messageId } = await sendLeadInfoViaGHL(claim.contractor, claim.lead, from);
    return db.claim.update({
      where: { id: claimId },
      data: { smsSid: messageId, sentFromNumber: from, deliveryError: null },
    });
  } catch (err) {
    // The text itself failed after we'd already claimed it -- drop
    // back to "paid" so the retry button can claim it again, rather
    // than getting stuck "delivered" with no text ever sent.
    const message = err instanceof Error ? err.message : "Failed to send text";
    return db.claim.update({
      where: { id: claimId },
      data: { status: "paid", deliveryError: message.slice(0, 300) },
    });
  }
}
