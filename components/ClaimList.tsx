"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Claim = {
  id: string;
  status: string;
  isFree: boolean;
  deliveryError: string | null;
  sentFromNumber: string | null;
  squarePaymentLinkUrl: string | null;
  contractor: { id: string; name: string; company: string | null; phone: string };
};

const STATUS_LABEL: Record<string, string> = {
  sent: "Sent, awaiting reply",
  interested: "Interested — payment link sent",
  declined: "Declined",
  paid: "Paid — sending text…",
  delivered: "Paid & texted automatically",
};

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-line/60 text-muted",
  interested: "bg-amber-50 text-amber-800",
  declined: "bg-red-50 text-red-700",
  paid: "bg-amber-50 text-amber-800",
  delivered: "bg-green-50 text-accentDark",
};

export default function ClaimList({ claims }: { claims: Claim[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [linkFor, setLinkFor] = useState<Record<string, string>>({});
  const [errorFor, setErrorFor] = useState<Record<string, string>>({});

  async function markInterested(claimId: string) {
    setBusyId(claimId);
    setErrorFor((prev) => ({ ...prev, [claimId]: "" }));
    try {
      const res = await fetch(`/api/claims/${claimId}/interest`, { method: "POST" });
      const data = await res.json();
      setBusyId(null);
      if (!res.ok) {
        setErrorFor((prev) => ({ ...prev, [claimId]: data.error || "Something went wrong" }));
        return;
      }
      if (data.checkoutUrl) {
        setLinkFor((prev) => ({ ...prev, [claimId]: data.checkoutUrl }));
      }
      router.refresh();
    } catch {
      setBusyId(null);
      setErrorFor((prev) => ({ ...prev, [claimId]: "Network error -- try again" }));
    }
  }

  async function decline(claimId: string) {
    setBusyId(claimId);
    await fetch(`/api/claims/${claimId}/decline`, { method: "POST" });
    setBusyId(null);
    router.refresh();
  }

  async function retryDelivery(claimId: string) {
    setBusyId(claimId);
    await fetch(`/api/claims/${claimId}/redeliver`, { method: "POST" });
    setBusyId(null);
    router.refresh();
  }

  if (claims.length === 0) {
    return <p className="text-sm text-muted">No contractors matched this niche + zip yet.</p>;
  }

  return (
    <div className="card divide-y divide-line">
      {claims.map((claim) => (
        <div key={claim.id} className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">
                {claim.contractor.name}
                {claim.contractor.company ? ` — ${claim.contractor.company}` : ""}
              </div>
              <div className="text-xs text-muted mt-0.5">{claim.contractor.phone}</div>
              {claim.sentFromNumber && (
                <div className="text-xs text-muted mt-0.5">Texted from {claim.sentFromNumber}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`pill ${STATUS_STYLE[claim.status]}`}>
                {STATUS_LABEL[claim.status]}
                {claim.isFree ? " (free)" : ""}
              </span>
              {claim.status === "sent" && (
                <>
                  <button
                    className="btn-secondary text-xs py-1.5"
                    disabled={busyId === claim.id}
                    onClick={() => markInterested(claim.id)}
                  >
                    {busyId === claim.id ? "Working..." : "Mark interested"}
                  </button>
                  <button
                    className="text-xs text-muted hover:text-warn px-2"
                    disabled={busyId === claim.id}
                    onClick={() => decline(claim.id)}
                  >
                    Decline
                  </button>
                </>
              )}
            </div>
          </div>
          {errorFor[claim.id] && (
            <div className="mt-2 text-xs bg-red-50 border border-red-200 text-red-800 rounded-md px-3 py-2">
              {errorFor[claim.id]}
            </div>
          )}
          {(linkFor[claim.id] || claim.squarePaymentLinkUrl) && (
            <div className="mt-2 text-xs bg-paper border border-line rounded-md px-3 py-2 flex items-center justify-between gap-3">
              <span className="truncate">{linkFor[claim.id] || claim.squarePaymentLinkUrl}</span>
              <button
                className="text-accent underline shrink-0"
                onClick={() =>
                  navigator.clipboard.writeText((linkFor[claim.id] || claim.squarePaymentLinkUrl) as string)
                }
              >
                Copy link
              </button>
            </div>
          )}
          {claim.deliveryError && (
            <div className="mt-2 text-xs bg-red-50 border border-red-200 text-red-800 rounded-md px-3 py-2 flex items-center justify-between gap-3">
              <span>Automatic text failed: {claim.deliveryError}. They paid — send the info manually, then retry.</span>
              <button
                className="underline shrink-0"
                disabled={busyId === claim.id}
                onClick={() => retryDelivery(claim.id)}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
