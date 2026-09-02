"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { CreateOrganizationDialog } from "@/components/platform/create-organization-dialog";
import type { Organization } from "@/lib/types";

export default function PromotersPage() {
  const [organizations, setOrganizations] = useState<Organization[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/platform/organizations", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        toast.add({ title: data.error || "Could not load promoters.", type: "error" });
        return;
      }
      setOrganizations(data.organizations);
    } catch {
      toast.add({ title: "Could not reach the server.", type: "error" });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleStatus(org: Organization) {
    const nextStatus = org.status === "active" ? "suspended" : "active";
    setBusyId(org.id);
    try {
      const res = await fetch(`/api/platform/organizations/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.add({ title: data.error || "Could not update the organization.", type: "error" });
        return;
      }
      toast.add({
        title: nextStatus === "suspended" ? `${org.name} suspended` : `${org.name} reactivated`,
        type: "success",
      });
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Promoters</h2>
          <p className="text-sm text-muted-foreground">
            Every promoter organization on Payroll Desk, and the schools they run.
          </p>
        </div>
        <CreateOrganizationDialog onCreated={load} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          {organizations === null ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : organizations.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No promoters yet — add the first one above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Treasury company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>
                      {org.hasTreasuryCompany ? org.treasuryCompanyName || "Yes" : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.status === "active" ? "default" : "destructive"}>
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(org.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === org.id}
                        onClick={() => toggleStatus(org)}
                      >
                        {org.status === "active" ? "Suspend" : "Reactivate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
