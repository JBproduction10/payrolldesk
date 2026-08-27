"use client";

import { Check } from "lucide-react";
import { BRAND_COLOR_KEYS, swatch, type BrandColorKey } from "@/lib/colors";
import { cn } from "@/lib/utils";

export function ColorSwatchPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: BrandColorKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {BRAND_COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-label={key}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg transition-transform",
            swatch(key).solid,
            value === key
              ? "ring-2 ring-foreground/70 ring-offset-2 ring-offset-background"
              : "hover:scale-105",
          )}
        >
          {value === key && <Check className="size-4" />}
        </button>
      ))}
    </div>
  );
}
