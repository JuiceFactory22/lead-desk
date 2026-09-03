"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCategories } from "@/lib/useCategories";

type ParsedRow = { name: string; phone: string; city: string };

export default function ImportContractorsPage() {
  const router = useRouter();
  const { niches } = useCategories();
  const [niche, setNiche] = useState("");
  const [radiusMiles, setRadiusMiles] = useState("40");
  const [freeLeadsLimit, setFreeLeadsLimit] = useState("3");
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");

  function parse() {
    setError("");
    setResult(null);
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed: ParsedRow[] = [];
    for (const line of lines) {
      const cells = line.split("\t").map((c) => c.trim());
      if (cells[0]?.toLowerCase() === "name") continue;
      const [name, phone, city] = cells;
      if (!name || !phone || !city) continue;
      parsed.push({ name, phone, city });
    }
    setRows(parsed);
  }

  async function doImport() {
    if (!niche) {
      setError("Niche is required");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/contractors/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        niche,
        radiusMiles: Number(radiusMiles),
        freeLeadsLimit: Number(freeLeadsLimit),
        rows,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Import failed");
      return;
    }
    setResult(data);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Bulk import contractors</h1>
      <p className="text-sm text-muted mb-6">
        Paste Name, Phone, and City columns together -- mix as many different cities as you want in one paste,
        each row carries its own location. No automatic texts get sent for contractors added this way.
      </p>

      <div className="card p-5 space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Niche</label>
            <select className="input" value={niche} onChange={(e) => setNiche(e.target.value)}>
              <option value="">Select a niche…</option>
              {niches.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Radius (miles)</label>
            <input className="input" type="number" value={radiusMiles} onChange={(e) => setRadiusMiles(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Free trial leads</label>
          <input className="input" type="number" value={freeLeadsLimit} onChange={(e) => setFreeLeadsLimit(e.target.value)} />
        </div>
        <div>
          <label className="label">Paste Name + Phone + City columns (one contractor per line)</label>
          <textarea
            className="input min-h-40 font-mono text-xs"
            placeholder={"Mike Torres\t305-555-0101\tMiami, FL\nDana Kessler\t305-555-0102\tTampa, FL"}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
        </div>
        <button className="btn-secondary" onClick={parse}>Preview</button>
      </div>

      {rows.length > 0 && !result && (
        <div className="card p-5 mb-6">
          <div className="text-sm font-medium mb-3">{rows.length} contractor{rows.length === 1 ? "" : "s"} ready to import</div>
          <div className="max-h-64 overflow-y-auto text-xs divide-y divide-line">
            {rows.map((r, i) => (
              <div key={i} className="py-2 flex justify-between">
                <span>{r.name} · {r.phone}</span>
                <span className="text-muted">{r.city}</span>
              </div>
            ))}
          </div>
          <button className="btn-primary mt-4" disabled={loading} onClick={doImport}>
            {loading ? "Importing..." : `Import ${rows.length} contractor${rows.length === 1 ? "" : "s"}`}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-warn">{error}</p>}

      {result && (
        <div className="card p-5 space-y-2">
          <p className="text-sm text-accentDark">
            Imported {result.created}, skipped {result.skipped} (already existed).
          </p>
          {result.errors.length > 0 && (
            <div className="text-xs text-warn space-y-1">
              {result.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
          <button className="btn-secondary" onClick={() => router.push("/contractors")}>
            Go to Contractors
          </button>
        </div>
      )}
    </div>
  );
}
