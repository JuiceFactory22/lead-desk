// Single source of truth for niche names -- used by the lead form
// (single-select) and contractor/territory forms (multi-select).
// Keeping this in one place means "roofing" is always spelled and
// matched the same way everywhere; add to this list as the business
// expands into new niches.
export const NICHES = ["roofing", "gutters", "insulation"] as const;
