import { Mail, MessageCircle, Loader2, Check, X } from "lucide-react";
import type { Channel, DeliveryRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

const CHANNEL_ICON: Record<Channel, typeof Mail> = {
  email: Mail,
  whatsapp: MessageCircle,
};

const STATE_STYLE: Record<DeliveryRecord["state"], string> = {
  pending: "bg-muted text-muted-foreground",
  queued: "bg-brand-gold/20 text-[oklch(0.42_0.09_70)]",
  sending: "bg-brand-pine-mid/15 text-brand-pine-mid",
  sent: "bg-success/12 text-success",
  failed: "bg-destructive/10 text-destructive",
};

export function DeliveryChannels({
  delivery,
}: {
  delivery: Partial<Record<Channel, DeliveryRecord>>;
}) {
  const channels = Object.entries(delivery) as Array<[Channel, DeliveryRecord]>;

  return (
    <div className="flex items-center gap-1.5">
      {channels.map(([ch, record]) => {
        const Icon = CHANNEL_ICON[ch];
        return (
          <span
            key={ch}
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium",
              STATE_STYLE[record.state],
            )}
          >
            {record.state === "sending" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : record.state === "sent" ? (
              <Check className="size-3" />
            ) : record.state === "failed" ? (
              <X className="size-3" />
            ) : (
              <Icon className="size-3" />
            )}
            {ch === "whatsapp" ? "WhatsApp" : "Email"}
          </span>
        );
      })}
    </div>
  );
}
