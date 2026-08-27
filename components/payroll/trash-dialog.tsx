"use client";

import { useState, type ReactElement } from "react";
import { Trash2, Undo2 } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface TrashRow {
  id: string;
  name: string;
  deletedAt?: string | null;
  meta?: string;
}

/**
 * Shows soft-deleted records for one table (employees, students, or
 * clients) with a one-click Restore. Deletes never actually erase data —
 * this is the "undo" side of that: a place to find and bring back anything
 * removed, on purpose or by accident, without needing the database.
 */
export function TrashDialog({
  trigger,
  title,
  emptyLabel,
  rows,
  onRestore,
}: {
  trigger: ReactElement;
  title: string;
  emptyLabel: string;
  rows: TrashRow[];
  onRestore: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-4 text-muted-foreground" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Deleted records stay here until you restore them — nothing is erased.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2"
              >
                <div className="min-w-0 leading-tight">
                  <div className="truncate font-medium text-foreground">{row.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.meta ? `${row.meta} · ` : ""}
                    {row.deletedAt ? `deleted ${timeAgo(row.deletedAt)}` : "deleted"}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onRestore(row.id);
                    toast.add({ title: `Restored ${row.name}`, type: "success" });
                  }}
                >
                  <Undo2 data-icon="inline-start" />
                  Restore
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
