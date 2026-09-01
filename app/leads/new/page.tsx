"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { NICHES } from "@/lib/niches";

export default function NewLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "", zip: "",
    niche: "", jobDetails: "", source: "", priceCents: "3500",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ matchedCount: number } | null>(null);
  const [error, setError] = useState("");

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    setResult(data);
    setTimeout(() => router.push(`/leads/${data.id}`), 1200);
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold mb-1">New lead</h1>
      <p className="text-sm text-muted mb-6">
        Same info your team already collects on the call. Matching contractors get added automatically.
      </p>

      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Caller name</label>
            <input className="input" required value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" required value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Email (optional)</label>
          <input className="input" value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>

        <div>
          <label className="label">Address</label>
          <input className="input" required value={form.address} onChange={(e) => update("address", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Zip code</label>
            <input className="input" required value={form.zip} onChange={(e) => update("zip", e.target.value)} />
          </div>
          <div>
            <label className="label">Niche</label>
            <select className="input" required value={form.niche} onChange={(e) => update("niche", e.target.value)}>
              <option value="">Select a niche…</option>
              {NICHES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Job details</label>
          <textarea
            className="input min-h-24"
            required
            value={form.jobDetails}
            onChange={(e) => update("jobDetails", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Source</label>
            <input className="input" placeholder="Which site/campaign" value={form.source} onChange={(e) => update("source", e.target.value)} />
          </div>
          <div>
            <label className="label">Price per contractor ($)</label>
            <input
              className="input"
              type="number"
              value={Number(form.priceCents) / 100}
              onChange={(e) => update("priceCents", String(Math.round(Number(e.target.value) * 100)))}
            />
          </div>
        </div>

        {error && <p className="text-sm text-warn">{error}</p>}
        {result && (
          <p className="text-sm text-accentDark">
            Lead created — matched {result.matchedCount} contractor{result.matchedCount === 1 ? "" : "s"}. Redirecting…
          </p>
        )}

        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Saving..." : "Create lead & match contractors"}
        </button>
      </form>
    </div>
  );
}
