"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function CreateOrganizationDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [hasTreasuryCompany, setHasTreasuryCompany] = useState(false);
  const [treasuryCompanyName, setTreasuryCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setName("");
    setHasTreasuryCompany(false);
    setTreasuryCompanyName("");
    setError(null);
  }

  const valid = name.trim() && (!hasTreasuryCompany || treasuryCompanyName.trim());

  async function handleSubmit() {
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          hasTreasuryCompany,
          treasuryCompanyName: hasTreasuryCompany ? treasuryCompanyName : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create the organization.");
        return;
      }
      setOpen(false);
      reset();
      onCreated();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button>Add Promoter</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a promoter</DialogTitle>
          <DialogDescription>
            Creates the organization. Once you switch to it, add its schools and team from the
            normal Clients and Team pages, same as any other promoter.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ben Group"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="has-treasury">Has a treasury company</Label>
              <p className="text-xs text-muted-foreground">
                Centralizes finances across this promoter's schools. Leave off if each school
                manages its own finances.
              </p>
            </div>
            <Switch
              id="has-treasury"
              checked={hasTreasuryCompany}
              onCheckedChange={setHasTreasuryCompany}
            />
          </div>
          {hasTreasuryCompany && (
            <div className="grid gap-2">
              <Label htmlFor="treasury-name">Treasury company name</Label>
              <Input
                id="treasury-name"
                value={treasuryCompanyName}
                onChange={(e) => setTreasuryCompanyName(e.target.value)}
                placeholder="e.g. Bonté Service"
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? "Creating…" : "Create organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
