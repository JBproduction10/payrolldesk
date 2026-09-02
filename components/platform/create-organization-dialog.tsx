"use client";

import { useState } from "react";
import { Check, Copy, Mail } from "lucide-react";
import { toast } from "@/components/ui/toast";
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

interface InviteResult {
  name: string;
  email: string;
  inviteSent: boolean;
  inviteLink: string;
}

export function CreateOrganizationDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [promoterName, setPromoterName] = useState("");
  const [promoterEmail, setPromoterEmail] = useState("");
  const [hasTreasuryCompany, setHasTreasuryCompany] = useState(false);
  const [treasuryCompanyName, setTreasuryCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setOrgName("");
    setPromoterName("");
    setPromoterEmail("");
    setHasTreasuryCompany(false);
    setTreasuryCompanyName("");
    setError(null);
    setResult(null);
    setCopied(false);
  }

  const valid =
    orgName.trim() &&
    promoterName.trim() &&
    promoterEmail.trim() &&
    (!hasTreasuryCompany || treasuryCompanyName.trim());

  async function handleSubmit() {
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName,
          promoterName,
          promoterEmail,
          hasTreasuryCompany,
          treasuryCompanyName: hasTreasuryCompany ? treasuryCompanyName : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create the organization.");
        return;
      }
      setResult({
        name: promoterName.trim(),
        email: promoterEmail.trim(),
        inviteSent: !!data.invite?.sent,
        inviteLink: data.invite?.link ?? "",
      });
      onCreated();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>Add Promoter</Button>
      </DialogTrigger>
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Organization created</DialogTitle>
              <DialogDescription>
                {result.inviteSent
                  ? `An invite email was sent to ${result.email}.`
                  : `Couldn't send the invite email automatically — share this link with ${result.name} directly.`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2 text-sm">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{result.inviteLink}</span>
              <Button variant="ghost" size="icon" className="ml-auto shrink-0" onClick={handleCopy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add a promoter</DialogTitle>
              <DialogDescription>
                Creates the promoter&apos;s organization and sends them an invite to set up their
                own super admin account and schools.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="org-name">Organization name</Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Kalonji Group"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promoter-name">Promoter&apos;s name</Label>
                <Input
                  id="promoter-name"
                  value={promoterName}
                  onChange={(e) => setPromoterName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promoter-email">Promoter&apos;s email</Label>
                <Input
                  id="promoter-email"
                  type="email"
                  value={promoterEmail}
                  onChange={(e) => setPromoterEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="has-treasury">Has a treasury company</Label>
                  <p className="text-xs text-muted-foreground">
                    Centralizes finances across this promoter&apos;s schools.
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
