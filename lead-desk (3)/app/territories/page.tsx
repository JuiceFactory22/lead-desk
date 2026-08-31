import { db } from "@/lib/db";
import TerritoriesManager from "@/components/TerritoriesManager";

export default async function TerritoriesPage() {
  const territories = await db.territory.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Territories</h1>
      <p className="text-sm text-muted mb-6">
        Each territory is a niche + set of zip codes with one phone number assigned to it — e.g. &quot;South
        Florida Roofing&quot; sends from a 305 number. Every lead that falls in a territory&apos;s niche and
        zips texts contractors from that same number. Add these as you go; nothing needs to be pre-filled.
      </p>
      <TerritoriesManager initialTerritories={territories} />
    </div>
  );
}
