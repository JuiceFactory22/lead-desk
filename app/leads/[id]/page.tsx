import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import ClaimList from "@/components/ClaimList";
import CopyBlock from "@/components/CopyBlock";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await db.lead.findUnique({
    where: { id: params.id },
    include: { claims: { include: { contractor: true }, orderBy: { sentAt: "asc" } } },
  });
  if (!lead) notFound();

  const firstName = lead.name.split(" ")[0];
  const niceType = lead.jobType ? `${lead.jobType} — ` : "";
  const teaserText = `New ${lead.niche} lead near ${lead.zip}.\n${niceType}${lead.jobDetails}\nInterested? Reply YES and I'll send the full details.`;
  const fullText = `${lead.name}\n${lead.phone}${lead.email ? `\n${lead.email}` : ""}\n${lead.address}\n\n${niceType}${lead.jobDetails}`;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">
          {lead.niche} — {lead.zip}
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
