import { db } from "./db";
import { createPaymentLinkForClaim } from "./square";
import { sendFreeTeaserViaGHL, sendPaymentPromptViaGHL } from "./gohighlevel";
import { deliverClaim } from "./deliver";

export async function triggerClaimOutreach(claimId: string) {
  const claim = await db.claim.findUnique({
    where: { id: claimId },
    include: { lead: true, contractor: true },
  });
  if (!claim) throw new Error(`Claim ${claimId} not found`);

  if (claim.status !== "sent") return claim;

  const freeUsed = await db.claim.count({
    where: { contractorId: claim.contractorId, isFree: true },
  });
  const freeRemaining = claim.contractor.freeLeadsLimit - freeUsed;

  try {
    const from = process.env.GHL_SENDING_NUMBER;
    if (!from) throw new Error("GHL_SENDING_NUMBER is not set");

    if (freeRemaining > 0) {
      const { messageId } = await sendFreeTeaserViaGHL(claim.contractor, claim.lead, freeRemaining, from);
      return db.claim.update({
        where: { id: claim.id },
        data: { smsSid: messageId, sentFromNumber: from, deliveryError: null },
      });
    }

    const { url, orderId } = await createPaymentLinkForClaim(claim, claim.lead.priceCents);
    await db.claim.update({
      where: { id: claim.id },
      data: { status: "interested", interestedAt: new Date(), squareOrderId: orderId, squarePaymentLinkUrl: url },
    });

    const { messageId } = await sendPaymentPromptViaGHL(claim.contractor, claim.lead, url, from);
    return db.claim.update({
      where: { id: claim.id },
      data: { smsSid: messageId, sentFromNumber: from, deliveryError: null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send outreach";
    return db.claim.update({
      where: { id: claim.id },
      data: { deliveryError: message.slice(0, 300) },
    });
  }
}

export async function unlockFreeLead(claimId: string) {
  await db.claim.update({
    where: { id: claimId },
    data: { status: "paid", isFree: true, interestedAt: new Date(), paidAt: new Date() },
  });
  return deliverClaim(claimId);
}
