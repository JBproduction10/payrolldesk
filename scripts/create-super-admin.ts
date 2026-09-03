// scripts/create-super-admin.ts
//
// Creates the one super_admin account directly in MongoDB — an alternative
// to going through the /setup page in the browser. Useful for scripted
// deploys, or if you'd rather not expose /setup at all.
//
// Same one-time lock as /setup: refuses if any account already exists.
//
// Usage:
//   npx tsx scripts/create-super-admin.ts "Your Name" you@example.com "a strong password"

import { config as loadEnv } from "dotenv";
import path from "node:path";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set — add it to .env.local first.");
    process.exit(1);
  }

  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.error(
      'Usage: npx tsx scripts/create-super-admin.ts "Your Name" you@example.com "a strong password"',
    );
    process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("That doesn't look like a valid email address.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password should be at least 8 characters.");
    process.exit(1);
  }

  // Imported after env vars are loaded, since lib/mongodb.ts reads
  // MONGODB_URI at module-eval time.
  const bcrypt = (await import("bcryptjs")).default;
  const { hasAnyUser, createBootstrapAdmin } = await import("../lib/db/users");

  if (await hasAnyUser()) {
    console.error(
      "An account already exists — this only ever creates the very first one, same as /setup. Nothing was changed.",
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await createBootstrapAdmin({ name, email: email.toLowerCase().trim(), passwordHash });

  console.log(`Created super_admin: ${admin.name} <${admin.email}>`);
  console.log("You can log in with this email and the password you passed in.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to create super_admin:", err);
  process.exit(1);
});
