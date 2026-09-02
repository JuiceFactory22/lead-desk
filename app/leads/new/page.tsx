"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NICHES, JOB_TYPES } from "@/lib/niches";

export default function NewLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "", zip: "",
    niche: "", jobType: "", jobDetails: "", source: "", priceCents: "",
  });
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ matchedCount: number } | null>(null);
  const [error, setError] = useState("");

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateNiche(value: string) {
    setForm((f) => ({ ...f, niche: value, jobType: "" }));
  }

  const jobTypeOptions = JOB_TYPES[form.niche] || [];

  useEffect(() => {
    if (!form.niche || !form.zip) {
      setSuggestedPrice(null);
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({ niche: form.niche, zip: form.zip });
    if (form.jobType) params.set("jobType", form.jobType);
    fetch(`/api/pricing/lookup?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setSuggestedPrice(data.priceCents ?? null))
      .catch(() => {});
    return () => controller.abort();
  }, [form.niche, form.jobType, form.zip]);

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
            <select className="input" required value={form.niche} onChange={(e) => updateNiche(e.target.value)}>
              <option value="">Select a niche…</option>
              {NICHES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        {jobTypeOptions.length > 0 && (
          <div>
            <label className="label">Job type</label>
            <select className="input" required value={form.jobType} onChange={(e) => update("jobType", e.target.value)}>
              <option value="">Select a job type…</option>
              {jobTypeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

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
              placeholder={suggestedPrice != null ? String(suggestedPrice / 100) : "35"}
              value={form.priceCents ? String(Number(form.priceCents) / 100) : ""}
              onChange={(e) => update("priceCents", e.target.value ? String(Math.round(Number(e.target.value) * 100)) : "")}
            />
            {suggestedPrice != null && !form.priceCents && (
              <p className="text-xs text-muted mt-1">
                Using your configured price: ${(suggestedPrice / 100).toFixed(0)}
              </p>
            )}
            {suggestedPrice == null && form.niche && form.zip && !form.priceCents && (
              <p className="text-xs text-muted mt-1">
                No pricing rule matches yet — will default to $35. Set one up on the Pricing page.
              </p>
            )}
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
