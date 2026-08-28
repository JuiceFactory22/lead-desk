"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(params.get("next") || "/");
      router.refresh();
    } else {
      setError("Wrong password");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <form onSubmit={onSubmit} className="card p-8 w-full max-w-sm">
        <h1 className="text-lg font-semibold mb-1">Lead Desk</h1>
        <p className="text-sm text-muted mb-6">Team access only.</p>
        <label className="label">Team password</label>
        <input
          type="password"
          className="input mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p className="text-sm text-warn mb-3">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Checking..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
