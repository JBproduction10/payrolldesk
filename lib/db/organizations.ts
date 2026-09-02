import { getDb } from "../mongodb";
import type { Organization } from "../types";

interface OrganizationDoc extends Omit<Organization, "id"> {
  _id: string;
}

function toOrganization(doc: OrganizationDoc): Organization {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

function organizationsCollection() {
  return getDb().then((db) => db.collection<OrganizationDoc>("organizations"));
}

/** Every promoter organization, newest first — for the super_admin's Promoters page. */
export async function listOrganizations(): Promise<Organization[]> {
  const orgs = await organizationsCollection();
  const rows = await orgs.find({}).sort({ createdAt: -1 }).toArray();
  return rows.map(toOrganization);
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  const orgs = await organizationsCollection();
  const doc = await orgs.findOne({ _id: id });
  return doc ? toOrganization(doc) : null;
}

export async function getOrganizationByOrgOwnerId(orgOwnerId: string): Promise<Organization | null> {
  const orgs = await organizationsCollection();
  const doc = await orgs.findOne({ orgOwnerId });
  return doc ? toOrganization(doc) : null;
}

/**
 * Creates a new promoter organization. `orgOwnerId` is the scoping key every
 * Client/Employee/etc. under it will use — for a brand-new org, that's just
 * its own id (self-anchored, no separate "owner account" needed). Pass an
 * explicit `orgOwnerId` only when adopting an *existing* set of scoped data
 * under a new Organization record (see scripts/backfill-organizations.ts).
 */
export async function createOrganization(params: {
  name: string;
  hasTreasuryCompany: boolean;
  treasuryCompanyName?: string;
  orgOwnerId?: string;
}): Promise<Organization> {
  const orgs = await organizationsCollection();
  const id = `org_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const doc: OrganizationDoc = {
    _id: id,
    name: params.name.trim(),
    orgOwnerId: params.orgOwnerId || id,
    hasTreasuryCompany: params.hasTreasuryCompany,
    treasuryCompanyName: params.hasTreasuryCompany
      ? params.treasuryCompanyName?.trim() || undefined
      : undefined,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  await orgs.insertOne(doc);
  return toOrganization(doc);
}

export async function setOrganizationStatus(
  id: string,
  status: Organization["status"],
): Promise<Organization | null> {
  const orgs = await organizationsCollection();
  const result = await orgs.findOneAndUpdate(
    { _id: id },
    { $set: { status } },
    { returnDocument: "after" },
  );
  return result ? toOrganization(result) : null;
}
