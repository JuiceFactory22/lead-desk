import Link from "next/link";
import { db } from "@/lib/db";

export default async function ContractorsPage() {
  const contractors = await db.contractor.findMany({
    orderBy: { createdAt: "desc" },
    include: { claims: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Contractors</h1>
        </div>
            <div className="flex items-center gap-2">
          <Link href="/contractors/import" className="btn-secondary">Bulk import</Link>
          <Link href="/contractors/new" className="btn-primary">Add contractor</Link>
        </div>
      </div>

      <div className="card divide-y divide-line">
        {contractors.map((c) => {
          const paid = c.claims.filter((cl) => cl.status === "delivered" && !cl.isFree).length;
          const free = c.claims.filter((cl) => cl.isFree).length;
          return (
            <Link key={c.id} href={`/contractors/${c.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-paper/60">
              <div>
                <div className="text-sm font-medium">{c.name}{c.company ? ` — ${c.company}` : ""}</div>
                <div className="text-xs text-muted mt-0.5">{c.niches} · within {c.radiusMiles}mi of {c.baseZip}</div>
              </div>
              <div className="text-xs text-muted">
                {free}/{c.freeLeadsLimit} free used · {paid} paid leads
              </div>
            </Link>
          );
        })}
        {contractors.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-muted">No contractors yet.</div>
        )}
      </div>
    </div>
  );
}
