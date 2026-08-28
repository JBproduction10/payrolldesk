export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];

// Congolese French-speaking audience by default; English stays available
// as a secondary option via the language switcher in the topbar.
export const defaultLocale: Locale = "fr";

export const LOCALE_COOKIE = "pd-locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
