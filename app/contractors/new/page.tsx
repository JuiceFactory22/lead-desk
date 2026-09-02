"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { NICHES } from "@/lib/niches";

export default function NewContractorPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", company: "", phone: "", email: "",
    baseZip: "", radiusMiles: "25", freeLeadsLimit: "2", notes: "",
  });
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [backfilled, setBackfilled] = useState<number | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleNiche(n: string) {
    setSelectedNiches((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedNiches.length === 0) {
      setError("Select at least one niche");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/contractors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, niches: selectedNiches.join(",") }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    if (data.backfilledLeadCount > 0) {
      setBackfilled(data.backfilledLeadCount);
      setTimeout(() => router.push("/contractors"), 1400);
      return;
    }
    router.push("/contractors");
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold mb-1">Add contractor</h1>
      <p className="text-sm text-muted mb-6">They'll be matched to any new lead in the right niche that falls within their service radius.</p>

      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input className="input" required value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <label className="label">Company</label>
            <input className="input" value={form.company} onChange={(e) => update("company", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Phone</label>
            <input className="input" required value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Niches</label>
          <div className="flex flex-wrap gap-3">
            {NICHES.map((n) => (
              <label key={n} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={selectedNiches.includes(n)} onChange={() => toggleNiche(n)} />
                {n}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Home base zip code</label>
            <input className="input" required placeholder="33101" value={form.baseZip} onChange={(e) => update("baseZip", e.target.value)} />
            <p className="text-xs text-muted mt-1">Where they're based -- coverage is a radius from here, not a hand-picked list of zips.</p>
          </div>
          <div>
            <label className="label">Service radius (miles)</label>
            <input className="input" type="number" value={form.radiusMiles} onChange={(e) => update("radiusMiles", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Free trial leads</label>
          <input className="input" type="number" value={form.freeLeadsLimit} onChange={(e) => update("freeLeadsLimit", e.target.value)} />
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-16" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </div>

        {error && <p className="text-sm text-warn">{error}</p>}
        {backfilled !== null && (
          <p className="text-sm text-accentDark">
            Also matched to {backfilled} lead{backfilled === 1 ? "" : "s"} from the last 24 hours. Redirecting…
          </p>
        )}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Saving..." : "Add contractor"}
        </button>
      </form>
    </div>
  );
}
