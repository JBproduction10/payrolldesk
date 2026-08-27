// lib/academic.ts
//
// Enrollment structure for the "Add student" flow: Cycle → Classe, per the
// client's system (Complexe Scolaire La Bonté). The class lists below are
// sensible defaults for that system and can be edited here — they aren't
// enforced anywhere else, so changing them only affects the dropdown options
// offered when enrolling a student.

import type { Cycle } from "./types";

export const CYCLES: { value: Cycle; label: string }[] = [
  { value: "primaire", label: "Primaire" },
  { value: "orientation", label: "Cycle d'orientation" },
  { value: "superieur", label: "Cycle supérieur (Humanités)" },
];

export const CYCLE_CLASSES: Record<Cycle, string[]> = {
  primaire: [
    "1ère Primaire",
    "2ème Primaire",
    "3ème Primaire",
    "4ème Primaire",
    "5ème Primaire",
    "6ème Primaire",
  ],
  orientation: ["7ème CO", "8ème CO"],
  superieur: ["1ère Humanités", "2ème Humanités", "3ème Humanités", "4ème Humanités"],
};

export function cycleLabel(cycle: Cycle): string {
  return CYCLES.find((c) => c.value === cycle)?.label ?? cycle;
}
