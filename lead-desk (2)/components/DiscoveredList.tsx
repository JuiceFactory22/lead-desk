"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  territory: { name: string };
};

export default function DiscoveredList({ initialItems }: { initialItems: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function approve(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/discovered/${id}/approve`, { method: "POST" });
    setBusyId(null);
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      router.refresh();
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    await fetch(`/api/discovered/${id}/reject`, { method: "POST" });
    setBusyId(null);
    setItems((prev) => prev.filter((i) => i.id !== id));
    router.refresh();
  }

  if (items.length === 0) {
    return <div className="card px-5 py-10 text-center text-sm text-muted">Nothing waiting on review right now.</div>;
  }

  return (
    <div className="card divide-y divide-line">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm font-medium">{item.name}</div>
            <div className="text-xs text-muted mt-0.5">
              {item.phone || "No phone on file"}
              {item.address ? ` · ${item.address}` : ""}
            </div>
            <div className="text-xs text-muted mt-0.5">Found via {item.territory.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary text-xs py-1.5"
              disabled={busyId === item.id || !item.phone}
              onClick={() => approve(item.id)}
              title={!item.phone ? "No phone number — can't add as a contractor" : undefined}
            >
              Approve
            </button>
            <button
              className="text-xs text-muted hover:text-warn px-2"
              disabled={busyId === item.id}
              onClick={() => reject(item.id)}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
