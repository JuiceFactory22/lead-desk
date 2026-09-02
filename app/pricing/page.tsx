import { db } from "@/lib/db";
import PricingManager from "@/components/PricingManager";

export default async function PricingPage() {
  const rules = await db.pricingRule.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Pricing</h1>
      <p className="text-sm text-muted mb-6">
        Set what a lead costs per niche, job type, and area. When your team creates a lead, the app fills in
        the price automatically based on these rules — the most specific match (niche + job type + zip) wins
        over a more general one. Leads default to $35 if nothing matches.
      </p>
      <PricingManager initialRules={rules} />
    </div>
  );
}
