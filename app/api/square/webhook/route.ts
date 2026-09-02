import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliverClaim } from "@/lib/deliver";
import { getClaimIdForOrder, verifySquareSignature } from "@/lib/square";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature") || "";
  const notificationUrl = `${process.env.APP_URL}/api/square/webhook`;

  const valid = await verifySquareSignature(rawBody, signature, notificationUrl);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.type === "payment.updated") {
    const payment = event.data?.object?.payment;
    if (payment?.status === "COMPLETED" && payment.order_id) {
      const claimId = await getClaimIdForOrder(payment.order_id);
      if (claimId) {
        // Square sends this same "payment completed" event several
        // times within seconds of each other, by design, for
        // reliability. This update is atomic: only the call that
        // actually succeeds in moving the claim off its pre-payment
        // status proceeds to trigger delivery -- every other
        // concurrent duplicate call sees count 0 and stops right
        // here, instead of resetting the status and re-triggering a
        // second text.
        const claimed = await db.claim.updateMany({
          where: { id: claimId, status: { notIn: ["paid", "delivered"] } },
          data: { status: "paid", paidAt: new Date(), squarePaymentId: payment.id },
        });
        if (claimed.count > 0) {
          await deliverClaim(claimId);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
