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

/** All promoter organizations, newest first — for the platform admin's list view. */
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

/** The Organization a given promoter (super_admin) owns — one-to-one via ownerId. */
export async function getOrganizationByOwnerId(ownerId: string): Promise<Organization | null> {
  const orgs = await organizationsCollection();
  const doc = await orgs.findOne({ ownerId });
  return doc ? toOrganization(doc) : null;
}

export async function createOrganization(params: {
  name: string;
  ownerId: string;
  hasTreasuryCompany: boolean;
  treasuryCompanyName?: string;
}): Promise<Organization> {
  const orgs = await organizationsCollection();
  const doc: OrganizationDoc = {
    _id: `org_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    name: params.name.trim(),
    ownerId: params.ownerId,
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
