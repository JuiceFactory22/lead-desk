"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { NICHES, JOB_TYPES } from "@/lib/niches";

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

  const jobTypeOptions = JOB_TYPES[form.niche] || [];

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
