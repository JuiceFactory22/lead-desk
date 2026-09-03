"use client";
import { useState, useEffect } from "react";

export function useRole() {
  const [role, setRole] = useState<"admin" | "employee" | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setRole(data.role))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return { role, isAdmin: role === "admin", loaded };
}
