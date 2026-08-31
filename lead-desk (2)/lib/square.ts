const ENV = process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
const BASE_URL = ENV === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
const TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;

function headers() {
  return {
    "Square-Version": "2024-08-21",
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  };
}

// Creates a Square order carrying the claim id as its reference_id
// (this is how the webhook later figures out which claim got paid),
// then wraps it in a hosted Payment Link the team can text over.
export async function createPaymentLinkForClaim(claim: { id: string; lead: { niche: string; zip: string; jobDetails: string }; }, priceCents: number) {
  const orderRes = await fetch(`${BASE_URL}/v2/orders`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      idempotency_key: `order-${claim.id}`,
      order: {
        location_id: LOCATION_ID,
        reference_id: claim.id,
        line_items: [
          {
            name: `${claim.lead.niche} lead — ${claim.lead.zip}`,
            quantity: "1",
            base_price_money: { amount: priceCents, currency: "USD" },
          },
        ],
      },
    }),
  });
  const orderData = await orderRes.json();
  if (!orderRes.ok) throw new Error(`Square order failed: ${JSON.stringify(orderData)}`);

  const linkRes = await fetch(`${BASE_URL}/v2/online-checkout/payment-links`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      idempotency_key: `link-${claim.id}`,
      order_id: orderData.order.id,
    }),
  });
  const linkData = await linkRes.json();
  if (!linkRes.ok) throw new Error(`Square payment link failed: ${JSON.stringify(linkData)}`);

  return { url: linkData.payment_link.url as string, orderId: orderData.order.id as string };
}

// Given an order id from a webhook payload, looks up the claim id we
// stashed as reference_id when the order was created.
export async function getClaimIdForOrder(orderId: string): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/v2/orders/${orderId}`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) return null;
  return data.order?.reference_id || null;
}

// Square signs webhooks as base64(hmac_sha256(signature_key, notification_url + raw_body)).
export async function verifySquareSignature(rawBody: string, signatureHeader: string, notificationUrl: string) {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "";
  const crypto = await import("crypto");
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(notificationUrl + rawBody);
  const expected = hmac.digest("base64");
  return expected === signatureHeader;
}
