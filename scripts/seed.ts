// scripts/seed.ts
//
// Self-heals a freshly-dropped (or brand-new) database: makes sure the demo
// login users exist, then makes sure each of their workspaces has data.
// Safe to run repeatedly — everything here is upsert/insert-if-missing, so
// running it against a database that's already seeded is a no-op.
//
// Run directly with `npm run seed`, or it runs automatically before
// `npm run dev` (see the "predev" script in package.json) so a dropped
// MongoDB self-heals the next time you start the dev server.

import { config as loadEnv } from "dotenv";
import path from "node:path";

// Next.js auto-loads .env / .env.local for the app itself, but this script
// runs outside the Next runtime, so it needs to load the same files
// explicitly. Load .env first, then .env.local on top (so .env.local can
// still override), matching Next's own precedence.
loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  if (!process.env.MONGODB_URI) {
    // Don't block `npm run dev` for someone who hasn't configured Mongo
    // yet — just skip. Running `npm run seed` directly after adding
    // MONGODB_URI to .env.local will pick it up on the next attempt.
    console.warn(
      "MONGODB_URI is not set — skipping demo data seed. Add it to .env.local (see .env.example), then run `npm run seed`.",
    );
    process.exit(0);
  }

  // Imported after env vars are loaded, since lib/mongodb.ts reads
  // MONGODB_URI at module-eval time.
  const { seedDemoUsers } = await import("../lib/db/seed-users");
  const { getWorkspace, saveWorkspace } = await import("../lib/db/workspace");
  const { buildInitialState } = await import("../lib/seed");
  const { seedHistory } = await import("../lib/seed-history");

  console.log("Seeding demo users...");
  const users = await seedDemoUsers();
  console.log(`  ${users.length} demo user(s) present.`);

  // Every demo user shares one workspace, keyed by the admin's id
  // (orgOwnerId) — this matches how the app looks up a workspace on login.
  // getWorkspace() creates an *empty* workspace by default for any org that
  // doesn't have one yet (real promoters start blank) — so for the demo
  // org specifically, we check first and, if it's genuinely new, replace
  // that empty workspace with the full demo dataset.
  const orgOwnerId = "u_demo_admin";
  console.log("Ensuring demo workspace data...");
  const existing = await getWorkspace(orgOwnerId);
  const isFreshlyCreated = existing.clients.length === 0;
  const state = isFreshlyCreated
    ? await (async () => {
        const demo = seedHistory(buildInitialState());
        await saveWorkspace(orgOwnerId, demo);
        return demo;
      })()
    : existing;
  console.log(
    `  Workspace ready: ${state.clients.length} client(s), ${state.employees.length} employee(s), ${state.students.length} student(s).`,
  );

  console.log("\nDone. Demo login: admin@payrolldesk.demo / Demo123!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
