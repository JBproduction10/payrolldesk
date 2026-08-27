// lib/colors.ts
// Maps the brand color keys used on Client / Department records (see
// lib/seed.ts COLORS) to concrete Tailwind classes.

export const BRAND_COLOR_KEYS = [
  "pine",
  "gold",
  "olive",
  "pine-mid",
  "clay",
  "pine-deep",
] as const;

export type BrandColorKey = (typeof BRAND_COLOR_KEYS)[number];

interface Swatch {
  /** Solid background + white text — avatars, icon tiles, progress bars */
  solid: string;
  /** Soft tinted background + matching dark text — chips / badges */
  soft: string;
  /** Bar / chart color as a CSS var, for inline styles (recharts, width bars) */
  bar: string;
}

const SWATCHES: Record<BrandColorKey, Swatch> = {
  pine: {
    solid: "bg-brand-pine text-white",
    soft: "bg-brand-pine/12 text-brand-pine",
    bar: "var(--brand-pine)",
  },
  gold: {
    solid: "bg-brand-gold text-white",
    soft: "bg-brand-gold/18 text-[oklch(0.42_0.09_70)]",
    bar: "var(--brand-gold)",
  },
  olive: {
    solid: "bg-brand-olive text-white",
    soft: "bg-brand-olive/15 text-brand-olive",
    bar: "var(--brand-olive)",
  },
  "pine-mid": {
    solid: "bg-brand-pine-mid text-white",
    soft: "bg-brand-pine-mid/15 text-[oklch(0.4_0.09_155)]",
    bar: "var(--brand-pine-mid)",
  },
  clay: {
    solid: "bg-brand-clay text-white",
    soft: "bg-brand-clay/15 text-brand-clay",
    bar: "var(--brand-clay)",
  },
  "pine-deep": {
    solid: "bg-brand-pine-deep text-white",
    soft: "bg-brand-pine-deep/12 text-brand-pine-deep",
    bar: "var(--brand-pine-deep)",
  },
};

export function isBrandColor(key: string): key is BrandColorKey {
  return (BRAND_COLOR_KEYS as readonly string[]).includes(key);
}

export function swatch(key: string): Swatch {
  return isBrandColor(key) ? SWATCHES[key] : SWATCHES.pine;
}

/** Deterministic color for an item without its own color field (e.g. an employee row). */
export function colorForIndex(i: number): BrandColorKey {
  return BRAND_COLOR_KEYS[i % BRAND_COLOR_KEYS.length];
}

export function colorForString(value: string): BrandColorKey {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return colorForIndex(hash);
}
