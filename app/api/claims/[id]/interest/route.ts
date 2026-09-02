import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createPaymentLinkForClaim } from "@/lib/square";
import { deliverClaim } from "@/lib/deliver";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const claim = await db.claim.findUnique({
    where: { id: params.id },
    include: { lead: true, contractor: true },
  });
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (claim.status === "interested" && claim.squarePaymentLinkUrl) {
    return NextResponse.json({ free: false, checkoutUrl: claim.squarePaymentLinkUrl });
  }

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
    const updated = await deliverClaim(claim.id);
    return NextResponse.json({ free: true, claim: updated });
  }

  try {
    const { url, orderId } = await createPaymentLinkForClaim(claim, claim.lead.priceCents);

    await db.claim.update({
      where: { id: claim.id },
      data: { status: "interested", interestedAt: new Date(), squareOrderId: orderId, squarePaymentLinkUrl: url },
    });

    return NextResponse.json({ free: false, checkoutUrl: url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create payment link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
