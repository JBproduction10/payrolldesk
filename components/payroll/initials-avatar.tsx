import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { swatch, type BrandColorKey } from "@/lib/colors";

const SIZES = {
  sm: "size-7 text-[11px]",
  default: "size-9 text-xs",
  lg: "size-11 text-sm",
};

export function InitialsAvatar({
  name,
  color,
  size = "default",
  className,
}: {
  name: string;
  color: BrandColorKey | string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        SIZES[size],
        swatch(color).solid,
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
