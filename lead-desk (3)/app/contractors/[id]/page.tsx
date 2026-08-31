import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-line/60 text-muted",
  interested: "bg-amber-50 text-amber-800",
  declined: "bg-red-50 text-red-700",
  delivered: "bg-green-50 text-accentDark",
};

export default async function ContractorDetailPage({ params }: { params: { id: string } }) {
  const contractor = await db.contractor.findUnique({
    where: { id: params.id },
    include: { claims: { include: { lead: true }, orderBy: { sentAt: "desc" } } },
  });
  if (!contractor) notFound();

  const freeUsed = contractor.claims.filter((c) => c.isFree).length;
  const paidCount = contractor.claims.filter((c) => c.status === "delivered" && !c.isFree).length;
  const revenueCents = contractor.claims
    .filter((c) => c.status === "delivered" && !c.isFree)
    .reduce((sum, c) => sum + c.lead.priceCents, 0);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold">{contractor.name}{contractor.company ? ` — ${contractor.company}` : ""}</h1>
      <p className="text-sm text-muted mt-0.5 mb-6">{contractor.phone} · {contractor.niches} · {contractor.zips}</p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="card p-4">
          <div className="text-xs text-muted">Free trial</div>
          <div className="text-lg font-semibold">{freeUsed}/{contractor.freeLeadsLimit}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Paid leads</div>
          <div className="text-lg font-semibold">{paidCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Revenue</div>
          <div className="text-lg font-semibold">${(revenueCents / 100).toFixed(0)}</div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-muted mb-2">Lead history</h2>
      <div className="card divide-y divide-line">
        {contractor.claims.map((claim) => (
          <Link key={claim.id} href={`/leads/${claim.leadId}`} className="flex items-center justify-between px-5 py-3 hover:bg-paper/60">
            <div className="text-sm">{claim.lead.niche} — {claim.lead.zip}</div>
            <span className={`pill ${STATUS_STYLE[claim.status]}`}>{claim.status}{claim.isFree ? " (free)" : ""}</span>
          </Link>
        ))}
        {contractor.claims.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted">No leads sent yet.</div>
        )}
      </div>
    </div>
  );
}
