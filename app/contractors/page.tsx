import Link from "next/link";
import { db } from "@/lib/db";
import ContractorsTable from "@/components/ContractorsTable";

export default async function ContractorsPage() {
  const contractors = await db.contractor.findMany({
    orderBy: { createdAt: "desc" },
    include: { claims: true },
  });

  const serialized = contractors.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }));

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

      {contractors.length === 0 ? (
        <div className="card p-10 text-center text-muted text-sm">No contractors yet.</div>
      ) : (
        <ContractorsTable contractors={serialized} />
      )}
    </div>
  );
}
