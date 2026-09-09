import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import ClaimList from "@/components/ClaimList";
import CopyBlock from "@/components/CopyBlock";

const ACRONYM_NICHES = new Set(["adu"]);
function nicheLabel(niche: string): string {
  const key = niche.trim().toLowerCase();
  return ACRONYM_NICHES.has(key) ? key.toUpperCase() : niche.charAt(0).toUpperCase() + niche.slice(1);
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await db.lead.findUnique({
    where: { id: params.id },
    include: { claims: { include: { contractor: true }, orderBy: { sentAt: "asc" } } },
  });
  if (!lead) notFound();

  const firstName = lead.name.split(" ")[0];
  const niche = nicheLabel(lead.niche);
  const locationLabel = lead.city ? `${lead.city}${lead.state ? `, ${lead.state}` : ""} ${lead.zip}` : lead.zip;

  const teaserText = [
    `Hey, it's Krystelle! We have a new ${niche} lead that looks like it fits your service area —`,
    "",
    `Service Area: ${locationLabel}`,
    lead.jobType ? `Service Type: ${lead.jobType}` : null,
    `Job Details: ${lead.jobDetails}`,
    "",
    "Interested? Just let me know and I'll send you the full details.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const fullText = [
    "OK! Here's the full info for this one —",
    "",
    `Service Area: ${locationLabel}`,
    `Service Type: ${niche}${lead.jobType ? ` - ${lead.jobType}` : ""}`,
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    lead.email ? `Email: ${lead.email}` : null,
    `Address: ${lead.address}`,
    `Details: ${lead.jobDetails}`,
    "",
    "Good luck! Let me know if you have any questions. And we will let you know next time a lead comes in.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">
          {lead.niche} — {locationLabel}
          {lead.jobType && <span className="text-muted font-normal"> · {lead.jobType}</span>}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          ${(lead.priceCents / 100).toFixed(0)} per contractor · added {new Date(lead.createdAt).toLocaleDateString()}
          {lead.source ? ` · from ${lead.source}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <CopyBlock label={`Teaser (safe to text before payment) — ${firstName}`} text={teaserText} />
        <CopyBlock label="Full info (only send after a claim shows delivered)" text={fullText} warn />
      </div>

      <h2 className="text-sm font-semibold text-muted mb-2">Contractors</h2>
      <ClaimList claims={lead.claims} />
    </div>
  );
}
