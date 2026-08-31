import { db } from "@/lib/db";
import DiscoveredList from "@/components/DiscoveredList";

export default async function DiscoveredPage() {
  const discovered = await db.discoveredContractor.findMany({
    where: { status: "pending" },
    include: { territory: true },
    orderBy: { foundAt: "desc" },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Discovered contractors</h1>
      <p className="text-sm text-muted mb-6">
        Candidates found by the Places search for each territory, waiting on your review. Approving one adds
        them as a real contractor with that territory&apos;s niche and zips.
      </p>
      <DiscoveredList initialItems={discovered} />
    </div>
  );
}
