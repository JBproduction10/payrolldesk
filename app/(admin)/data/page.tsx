"use client";

import { PageHeader } from "@/components/payroll/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrashPanel } from "@/components/payroll/trash-panel";
import { AuditTrailPanel } from "@/components/payroll/audit-trail-panel";
import { ExportPanel } from "@/components/payroll/export-panel";

export default function DataSafetyPage() {
  return (
    <>
      <PageHeader
        title="Data & Safety"
        description="Undo deletes, see who changed what, and export a full backup any time."
      />

      <Tabs defaultValue="trash">
        <TabsList>
          <TabsTrigger value="trash">Trash</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>
        <TabsContent value="trash" className="mt-5">
          <TrashPanel />
        </TabsContent>
        <TabsContent value="audit" className="mt-5">
          <AuditTrailPanel />
        </TabsContent>
        <TabsContent value="export" className="mt-5">
          <ExportPanel />
        </TabsContent>
      </Tabs>
    </>
  );
}
