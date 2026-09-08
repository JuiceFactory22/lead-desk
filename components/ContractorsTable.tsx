"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

type Contractor = {
  id: string;
  name: string;
  company: string | null;
  niches: string;
  baseZip: string;
  radiusMiles: number;
  freeLeadsLimit: number;
  active: boolean;
  createdAt: string;
  claims: { status: string; isFree: boolean }[];
};

type SortKey = "name" | "niches" | "coverage" | "freeUsed" | "paid" | "createdAt";

export default function ContractorsTable({ contractors }: { contractors: Contractor[] }) {
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
    let rows = contractors;
    if (q) {
      rows = rows.filter((c) =>
        [c.name, c.company, c.niches, c.baseZip]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return [...rows].sort((a, b) => {
      const freeA = a.claims.filter((cl) => cl.isFree).length;
      const freeB = b.claims.filter((cl) => cl.isFree).length;
      const paidA = a.claims.filter((cl) => cl.status === "delivered" && !cl.isFree).length;
      const paidB = b.claims.filter((cl) => cl.status === "delivered" && !cl.isFree).length;
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "name") { av = a.name; bv = b.name; }
      else if (sortKey === "niches") { av = a.niches; bv = b.niches; }
      else if (sortKey === "coverage") { av = a.radiusMiles; bv = b.radiusMiles; }
      else if (sortKey === "freeUsed") { av = freeA; bv = freeB; }
      else if (sortKey === "paid") { av = paidA; bv = paidB; }
      else if (sortKey === "createdAt") { av = a.createdAt; bv = b.createdAt; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [contractors, search, sortKey, sortDir]);

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
        placeholder="Search contractors by name, company, niche, or zip…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line">
            <tr>
              <SortHeader label="Name" sortField="name" />
              <SortHeader label="Niches" sortField="niches" />
              <SortHeader label="Coverage" sortField="coverage" />
              <SortHeader label="Free used" sortField="freeUsed" />
              <SortHeader label="Paid leads" sortField="paid" />
              <SortHeader label="Added" sortField="createdAt" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((c) => {
              const free = c.claims.filter((cl) => cl.isFree).length;
              const paid = c.claims.filter((cl) => cl.status === "delivered" && !cl.isFree).length;
              return (
                <tr key={c.id} className="hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/contractors/${c.id}`} className="font-medium hover:underline">
                      {c.name}{c.company ? ` — ${c.company}` : ""}
                    </Link>
                    {!c.active && <span className="pill bg-line/60 text-muted ml-2">Inactive</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">{c.niches}</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{c.radiusMiles}mi of {c.baseZip}</td>
                  <td className="px-4 py-3">{free}/{c.freeLeadsLimit}</td>
                  <td className="px-4 py-3">{paid}</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">No contractors match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
