"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCategories } from "@/lib/useCategories";

type PricingRule = {
  id: string;
  niche: string;
  jobType: string | null;
  zips: string | null;
  priceCents: number;
  active: boolean;
};

export default function PricingManager({ initialRules }: { initialRules: PricingRule[] }) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules);
  const [form, setForm] = useState({ niche: "", jobType: "", zips: "", price: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number } | null>(null);

  const { niches, jobTypesByNiche } = useCategories();
  const jobTypeOptions = jobTypesByNiche[form.niche] || [];

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    if (!form.niche || !form.price) {
      setError("Niche and price are required");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        niche: form.niche,
        jobType: form.jobType || null,
        zips: form.zips || null,
        priceCents: Math.round(Number(form.price) * 100),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    setForm({ niche: "", jobType: "", zips: "", price: "" });
    router.refresh();
    setRules((prev) => [data, ...prev]);
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/pricing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    router.refresh();
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, active: !active } : r)));
  }

  async function removeRule(id: string) {
    await fetch(`/api/pricing/${id}`, { method: "DELETE" });
    router.refresh();
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function syncFromSheet() {
    setSyncing(true);
    setSyncResult(null);
    setError("");
    const res = await fetch("/api/pricing/sync-from-sheet", { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    if (!res.ok) {
      setError(data.error || "Sync failed");
      return;
    }
    setSyncResult({ created: data.created, updated: data.updated });
    router.refresh();
    const refreshed = await fetch("/api/pricing").then((r) => r.json());
    setRules(refreshed);
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Sync defaults from Google Sheet</div>
          <div className="text-xs text-muted mt-0.5">
            Pulls Category/Service/Price rows in as defaults. Your area-specific overrides below are never touched.
          </div>
        </div>
        <button className="btn-secondary text-sm" disabled={syncing} onClick={syncFromSheet}>
          {syncing ? "Syncing..." : "Sync now"}
        </button>
      </div>
      {syncResult && (
        <p className="text-sm text-accentDark">
          Synced — {syncResult.created} new default{syncResult.created === 1 ? "" : "s"}, {syncResult.updated} updated.
        </p>
      )}

      <div className="card divide-y divide-line">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <div className="text-sm font-medium">
                {r.niche}{r.jobType ? ` — ${r.jobType}` : " — all services"}
              </div>
              <div className="text-xs text-muted mt-0.5">
                {r.zips ? `${r.zips} (override)` : "Applies everywhere (default)"} · ${(r.priceCents / 100).toFixed(0)} per contractor
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {!r.active && <span className="pill bg-line/60 text-muted">Inactive</span>}
              <button className="text-muted hover:text-ink px-2" onClick={() => toggleActive(r.id, r.active)}>
                {r.active ? "Deactivate" : "Activate"}
              </button>
              <button className="text-muted hover:text-warn px-2" onClick={() => removeRule(r.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted">
            No pricing rules yet — leads will default to $35 until you add some or sync from the sheet.
          </div>
        )}
      </div>

      <form onSubmit={addRule} className="card p-5 space-y-3">
        <div className="text-sm font-medium">Add an area override</div>
        <p className="text-xs text-muted">
          Leave zip codes blank to set/change a default here instead — same as syncing from the sheet, just manual.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Niche</label>
            <select
              className="input"
              value={form.niche}
              onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value, jobType: "" }))}
            >
              <option value="">Select a niche…</option>
              {niches.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Service / job type (optional)</label>
            <select
              className="input"
              value={form.jobType}
              onChange={(e) => setForm((f) => ({ ...f, jobType: e.target.value }))}
              disabled={jobTypeOptions.length === 0}
            >
              <option value="">All services</option>
              {jobTypeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Zip codes (optional — blank = applies everywhere)</label>
          <input
            className="input"
            placeholder="33101, 33130, 33133"
            value={form.zips}
            onChange={(e) => setForm((f) => ({ ...f, zips: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Price per contractor ($)</label>
          <input
            className="input"
            type="number"
            placeholder="35"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
        </div>
        {error && <p className="text-sm text-warn">{error}</p>}
        <button className="btn-primary" disabled={loading}>
          {loading ? "Adding..." : "Add rule"}
        </button>
      </form>
    </div>
  );
}
