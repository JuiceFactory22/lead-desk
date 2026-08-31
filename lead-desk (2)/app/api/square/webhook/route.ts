import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliverClaim } from "@/lib/deliver";
import { getClaimIdForOrder, verifySquareSignature } from "@/lib/square";

// Square requires the raw body + the exact notification URL to verify
// the signature, so this reads text() instead of json().
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
        await db.claim.update({
          where: { id: claimId },
          data: { status: "paid", paidAt: new Date(), squarePaymentId: payment.id },
        });
        await deliverClaim(claimId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
