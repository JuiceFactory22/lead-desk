// Single source of truth for niche names -- used by the lead form
// (single-select) and contractor/territory forms (multi-select).
// Keeping this in one place means "roofing" is always spelled and
// matched the same way everywhere; add to this list as the business
// expands into new niches.
export const NICHES = ["roofing", "gutters", "insulation"] as const;

// Job types within a niche, e.g. a roofing lead is an inspection, a
// repair, or a full replacement. Purely categorization today -- it
// doesn't affect contractor matching, just what shows on the lead
// and in the texts. A niche with no entry here just skips the field.
export const JOB_TYPES: Record<string, string[]> = {
  roofing: ["Inspection", "Repair", "Replacement/New Roof"],
};
