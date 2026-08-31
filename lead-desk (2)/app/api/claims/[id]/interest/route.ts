import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createPaymentLinkForClaim } from "@/lib/square";
import { deliverClaim } from "@/lib/deliver";

// Called by the team when a contractor replies "yes" to the CallRail
// text. Decides whether this is one of their free trial leads or a
// paid one, and either unlocks immediately or returns a Square
// payment link to send them.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const claim = await db.claim.findUnique({
    where: { id: params.id },
    include: { lead: true, contractor: true },
  });
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const freeUsed = await db.claim.count({
    where: { contractorId: claim.contractorId, isFree: true },
  });
  const freeRemaining = claim.contractor.freeLeadsLimit - freeUsed;

  if (freeRemaining > 0) {
    await db.claim.update({
      where: { id: claim.id },
      data: {
        status: "paid",
        isFree: true,
        interestedAt: new Date(),
        paidAt: new Date(),
      },
    });
    // Free trial leads get the same instant, automatic text as a paid
    // lead -- there's no reason a $0 unlock should be slower than a
    // real payment.
    const updated = await deliverClaim(claim.id);
    return NextResponse.json({ free: true, claim: updated });
  }

  await db.claim.update({
    where: { id: claim.id },
    data: { status: "interested", interestedAt: new Date() },
  });

  const { url, orderId } = await createPaymentLinkForClaim(claim, claim.lead.priceCents);

  await db.claim.update({
    where: { id: claim.id },
    data: { squareOrderId: orderId },
  });

  return NextResponse.json({ free: false, checkoutUrl: url });
}
