import Link from "next/link";
import { db } from "@/lib/db";

function summarize(claims: { status: string }[]) {
  const paid = claims.filter((c) => c.status === "delivered").length;
  const interested = claims.filter((c) => c.status === "interested").length;
  const sent = claims.filter((c) => c.status === "sent").length;
  return { paid, interested, sent, total: claims.length };
}

export default async function DashboardPage() {
  const leads = await db.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { claims: true },
    take: 50,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-sm text-muted mt-0.5">Most recent leads and how many contractors have bought in.</p>
        </div>
        <Link href="/leads/new" className="btn-primary">New lead</Link>
      </div>

      {leads.length === 0 && (
        <div className="card p-10 text-center text-muted text-sm">
          No leads yet. <Link href="/leads/new" className="text-accent underline">Add the first one.</Link>
        </div>
      )}

      <div className="card divide-y divide-line">
        {leads.map((lead) => {
          const s = summarize(lead.claims);
          return (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-paper/60 transition-colors"
            >
              <div>
                <div className="font-medium text-sm">
                  {lead.niche} — {lead.zip}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {lead.jobDetails.slice(0, 80)}
                  {lead.jobDetails.length > 80 ? "…" : ""}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="pill bg-green-50 text-accentDark">{s.paid} sold</span>
                <span className="pill bg-amber-50 text-amber-800">{s.interested} interested</span>
                <span className="pill bg-line/60 text-muted">{s.sent} pending</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
