import Link from "next/link";
import { db } from "@/lib/db";
import LeadsTable from "@/components/LeadsTable";

export default async function DashboardPage() {
  const leads = await db.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { claims: true },
    take: 500,
  });

  const serialized = leads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-sm text-muted mt-0.5">Search, sort, and click into any lead.</p>
        </div>
        <Link href="/leads/new" className="btn-primary">New lead</Link>
      </div>

      {leads.length === 0 ? (
        <div className="card p-10 text-center text-muted text-sm">
          No leads yet. <Link href="/leads/new" className="text-accent underline">Add the first one.</Link>
        </div>
      ) : (
        <LeadsTable leads={serialized} />
      )}
    </div>
  );
}
