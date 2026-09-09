"use client";
import { useState, useEffect, useRef } from "react";

type Prediction = { placeId: string; description: string };

export default function AddressAutocomplete({
  value,
  onChange,
  onZipFound,
}: {
  value: string;
  onChange: (value: string) => void;
  onZipFound?: (zip: string) => void;
}) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (value.trim().length < 4) {
      setPredictions([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/places/autocomplete?input=${encodeURIComponent(value)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          setPredictions(data.predictions || []);
          setOpen(true);
        })
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [value]);

  async function selectPrediction(p: Prediction) {
    onChange(p.description);
    setOpen(false);
    setPredictions([]);
    if (onZipFound) {
      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(p.placeId)}`);
      const data = await res.json();
      if (data.zip) onZipFound(data.zip);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        className="input"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        autoComplete="off"
        placeholder="Start typing an address…"
      />
      {open && predictions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full card max-h-56 overflow-y-auto divide-y divide-line">
          {predictions.map((p) => (
            <button
              key={p.placeId}
              type="button"
              className="block w-full text-left px-3 py-2 text-sm hover:bg-paper/60"
              onClick={() => selectPrediction(p)}
            >
              {p.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
