import { db } from "@/lib/db";
import TerritoriesManager from "@/components/TerritoriesManager";

export default async function TerritoriesPage() {
  const territories = await db.territory.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Search areas</h1>
      <p className="text-sm text-muted mb-6">
        Used only by contractor discovery — a niche + set of zip codes to search for new contractors via
        Google Places. Doesn&apos;t affect lead matching or which number delivers a lead; that&apos;s
        radius-based and always uses one number, respectively.
      </p>
      <TerritoriesManager initialTerritories={territories} />
    </div>
  );
}
