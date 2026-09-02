// scripts/backfill-organizations.ts
//
// One-time migration for multi-promoter support. Before this, a
// "super_admin" account *was* the workspace — there was no separate
// Organization record. This script creates one for every super_admin
// that's missing it, so it shows up in the Promoters page, without
// touching any of its existing data (Clients, Employees, etc. keep working
// off the same orgOwnerId they always have).
//
// If you ran an earlier version of this script, it stored the field as
// "ownerId" — this run renames it to "orgOwnerId" automatically first, so
// re-running is safe and is exactly how you fix that.
//
// Safe to run repeatedly — skips any super_admin that already has an
// Organization.
//
// Usage:
//   npx tsx scripts/backfill-organizations.ts
//   npx tsx scripts/backfill-organizations.ts "Kapenga Group"
//   npx tsx scripts/backfill-organizations.ts "Kapenga Group" "Bonté Service"
//
// The name arguments only apply when exactly one super_admin needs
// backfilling. With more than one, every organization gets a default name
// based on the account's name — rename afterwards by editing the
// "organizations" collection directly in Mongo.

import { config as loadEnv } from "dotenv";
import path from "node:path";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set — add it to .env.local first.");
    process.exit(1);
  }

  const [explicitOrgName, explicitTreasuryName] = process.argv.slice(2);

  // Imported after env vars are loaded, since lib/mongodb.ts reads
  // MONGODB_URI at module-eval time.
  const { getDb } = await import("../lib/mongodb");
  const { getOrganizationByOrgOwnerId, createOrganization } = await import(
    "../lib/db/organizations"
  );
  const { listUserIdsByRole } = await import("../lib/db/users");

  const db = await getDb();

  // Fix up any organizations created by an earlier version of this script,
  // which used the field name "ownerId" instead of "orgOwnerId".
  const renamed = await db
    .collection("organizations")
    .updateMany({ ownerId: { $exists: true } }, { $rename: { ownerId: "orgOwnerId" } });
  if (renamed.modifiedCount > 0) {
    console.log(`Migrated ${renamed.modifiedCount} organization(s) from "ownerId" to "orgOwnerId".`);
  }

  const superAdmins = await db
    .collection<import("../lib/db/users").UserDoc>("users")
    .find({ role: "super_admin" })
    .toArray();

  if (superAdmins.length === 0) {
    console.log("No super_admin accounts found — nothing to backfill.");
    process.exit(0);
  }

  console.log(`Found ${superAdmins.length} super_admin account(s).`);
  if (superAdmins.length > 1 && explicitOrgName) {
    console.warn(
      `More than one super_admin exists — the name "${explicitOrgName}" will only be used for the first one missing an Organization. Every other one gets a default name.`,
    );
  }

  let created = 0;
  let skipped = 0;
  let explicitNameUsed = false;

  for (const admin of superAdmins) {
    const existing = await getOrganizationByOrgOwnerId(admin._id);
    if (existing) {
      console.log(`  Skipping ${admin.email} — already has Organization "${existing.name}".`);
      skipped++;
      continue;
    }

    // Only apply the CLI-provided name to the first account actually
    // backfilled in this run, so running this against a multi-promoter
    // database doesn't silently give every organization the same name.
    const useExplicitName = !explicitNameUsed;
    const name = useExplicitName && explicitOrgName ? explicitOrgName : `${admin.name}'s Organization`;
    if (useExplicitName && explicitOrgName) explicitNameUsed = true;

    // Auto-detect whether this promoter already has a treasury company by
    // checking for any "treasury"-role team member under their workspace —
    // that role only ever gets assigned when a treasury company exists.
    const treasuryUserIds = await listUserIdsByRole(admin._id, ["treasury"]);
    const hasTreasuryCompany = treasuryUserIds.length > 0;

    // orgOwnerId = admin._id here (not a fresh self-anchored id) because
    // this promoter's Clients/Employees/etc. already exist scoped to that
    // id — we're just giving that existing scope an Organization record,
    // not creating a new one.
    const organization = await createOrganization({
      name,
      orgOwnerId: admin._id,
      hasTreasuryCompany,
      treasuryCompanyName:
        hasTreasuryCompany && useExplicitName ? explicitTreasuryName : undefined,
    });

    console.log(
      `  Created Organization "${organization.name}" for ${admin.email}${
        hasTreasuryCompany ? " (has a treasury company)" : ""
      }.`,
    );
    created++;
  }

  console.log(`\nDone. ${created} created, ${skipped} already had one.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
