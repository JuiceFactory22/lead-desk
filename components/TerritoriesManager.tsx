"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCategories } from "@/lib/useCategories";

type Territory = {
  id: string;
  name: string;
  niches: string;
  zips: string;
  active: boolean;
};

export default function TerritoriesManager({ initialTerritories }: { initialTerritories: Territory[] }) {
  const router = useRouter();
  const [territories, setTerritories] = useState(initialTerritories);
  const [form, setForm] = useState({ name: "", zips: "" });
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [discoverResult, setDiscoverResult] = useState<{ id: string; added: number } | null>(null);
  const { niches } = useCategories();

  function toggleNiche(n: string) {
    setSelectedNiches((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  async function runDiscovery(id: string) {
    setRunningId(id);
    setDiscoverResult(null);
    const res = await fetch(`/api/territories/${id}/discover`, { method: "POST" });
    const data = await res.json();
    setRunningId(null);
    if (res.ok) {
      setDiscoverResult({ id, added: data.added });
      router.refresh();
    } else {
      setError(data.error || "Discovery failed");
    }
  }

  async function addTerritory(e: React.FormEvent) {
    e.preventDefault();
    if (selectedNiches.length === 0) {
      setError("Select at least one niche");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/territories", {
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
    setForm({ name: "", zips: "" });
    setSelectedNiches([]);
    router.refresh();
    setTerritories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/territories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    router.refresh();
    setTerritories((prev) => prev.map((t) => (t.id === id ? { ...t, active: !active } : t)));
  }

  return (
    <div className="space-y-6">
      <div className="card divide-y divide-line">
        {territories.map((t) => (
          <div key={t.id} className="px-5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-xs text-muted mt-0.5">{t.niches} · {t.zips}</div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {!t.active && <span className="pill bg-line/60 text-muted">Inactive</span>}
              <button className="btn-secondary py-1 px-2" disabled={runningId === t.id} onClick={() => runDiscovery(t.id)}>
                {runningId === t.id ? "Searching..." : "Run discovery"}
              </button>
              <button className="text-muted hover:text-ink px-2" onClick={() => toggleActive(t.id,
