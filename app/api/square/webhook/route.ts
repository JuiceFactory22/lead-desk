import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliverClaim } from "@/lib/deliver";
import { getClaimIdForOrder, verifySquareSignature } from "@/lib/square";
import { sendPaymentReceivedEmail } from "@/lib/gohighlevel";

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
        const claimed = await db.claim.updateMany({
          where: { id: claimId, status: { notIn: ["paid", "delivered"] } },
          data: { status: "paid", paidAt: new Date(), squarePaymentId: payment.id },
        });
        if (claimed.count > 0) {
          const claimWithRelations = await db.claim.findUnique({
            where: { id: claimId },
            include: { lead: true, contractor: true },
          });
          if (claimWithRelations) {
            try {
              await sendPaymentReceivedEmail(claimWithRelations.lead, claimWithRelations.contractor, claimWithRelations.lead.priceCents);
            } catch (err) {
              console.error("Failed to send payment notification email:", err);
            }
          }
          await deliverClaim(claimId);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
