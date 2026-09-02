"use client";
import { useState, useEffect } from "react";
import { NICHES, JOB_TYPES } from "./niches";

export function useCategories() {
  const [niches, setNiches] = useState<string[]>(NICHES as unknown as string[]);
  const [jobTypesByNiche, setJobTypesByNiche] = useState<Record<string, string[]>>(JOB_TYPES);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.niches?.length) setNiches(data.niches);
        if (data.jobTypesByNiche) setJobTypesByNiche(data.jobTypesByNiche);
      })
      .catch(() => {});
  }, []);

  return { niches, jobTypesByNiche };
}
