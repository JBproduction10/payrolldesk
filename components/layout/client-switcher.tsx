"use client";

import Link from "next/link";
import { ChevronDown, Check, Plus } from "lucide-react";
import { usePayroll } from "@/lib/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { swatch } from "@/lib/colors";

export function ClientSwitcher() {
  const { clients, activeClient, setActiveClient } = usePayroll();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-w-0 items-center gap-2.5 rounded-xl px-1.5 py-1 text-left outline-none hover:bg-muted">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${swatch(activeClient.color).solid}`}
        >
          {activeClient.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="hidden min-w-0 leading-tight sm:block">
          <div className="truncate text-sm font-semibold text-foreground">
            {activeClient.name}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {activeClient.description}
          </div>
        </div>
        <ChevronDown className="ml-1 hidden size-4 shrink-0 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="start">
        <DropdownMenuLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Switch client
        </DropdownMenuLabel>
        {clients.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => setActiveClient(c.id)}
            className="gap-2.5 px-2 py-2"
          >
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${swatch(c.color).solid}`}
            >
              {c.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium text-foreground">
                {c.name}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {c.description}
              </div>
            </div>
            {c.id === activeClient.id && (
              <Check className="size-4 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/clients" />} className="gap-2.5">
          <Plus className="size-4" />
          Manage clients
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
