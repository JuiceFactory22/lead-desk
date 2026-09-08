"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

type Lead = {
  id: string;
  niche: string;
  zip: string;
  city: string | null;
  state: string | null;
  jobType: string | null;
  jobDetails: string;
  priceCents: number;
  createdAt: string;
  claims: { status: string; isFree: boolean }[];
};

type SortKey = "niche" | "location" | "price" | "status" | "createdAt";

function summarize(claims: { status: string }[]) {
  const paid = claims.filter((c) => c.status === "delivered").length;
  const interested = claims.filter((c) => c.status === "interested").length;
  const sent = claims.filter((c) => c.status === "sent").length;
  return { paid, interested, sent };
}

export default function LeadsTable({ leads }: { leads: Lead[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = leads;
    if (q) {
      rows = rows.filter((l) =>
        [l.niche, l.zip, l.city, l.state, l.jobType, l.jobDetails]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return [...rows].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "niche") { av = a.niche; bv = b.niche; }
      else if (sortKey === "location") { av = a.city || a.zip; bv = b.city || b.zip; }
      else if (sortKey === "price") { av = a.priceCents; bv = b.priceCents; }
      else if (sortKey === "status") { av = summarize(a.claims).paid; bv = summarize(b.claims).paid; }
      else if (sortKey === "createdAt") { av = a.createdAt; bv = b.createdAt; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [leads, search, sortKey, sortDir]);

  function SortHeader({ label, sortField }: { label: string; sortField: SortKey }) {
    return (
      <th
        className="text-left text-xs font-medium text-muted px-4 py-2 cursor-pointer select-none hover:text-ink"
        onClick={() => toggleSort(sortField)}
      >
        {label} {sortKey === sortField && (sortDir === "asc" ? "↑" : "↓")}
      </th>
    );
  }

  return (
    <div>
      <input
        className="input mb-4"
        placeholder="Search leads by niche, city, zip, or job details…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line">
            <tr>
              <SortHeader label="Niche" sortField="niche" />
              <SortHeader label="Location" sortField="location" />
              <th className="text-left text-xs font-medium text-muted px-4 py-2">Job details</th>
              <SortHeader label="Price" sortField="price" />
              <SortHeader label="Status" sortField="status" />
              <SortHeader label="Added" sortField="createdAt" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((lead) => {
              const s = summarize(lead.claims);
              const location = lead.city ? `${lead.city}${lead.state ? `, ${lead.state}` : ""} ${lead.zip}` : lead.zip;
              return (
                <tr key={lead.id} className="hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                      {lead.niche}{lead.jobType ? ` — ${lead.jobType}` : ""}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{location}</td>
                  <td className="px-4 py-3 text-muted max-w-xs truncate">{lead.jobDetails}</td>
                  <td className="px-4 py-3">${(lead.priceCents / 100).toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {s.paid > 0 && <span className="pill bg-green-50 text-accentDark">{s.paid} sold</span>}
                      {s.interested > 0 && <span className="pill bg-amber-50 text-amber-800">{s.interested} interested</span>}
                      {s.sent > 0 && <span className="pill bg-line/60 text-muted">{s.sent} pending</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{new Date(lead.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">No leads match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
