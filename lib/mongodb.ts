import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "payroll_desk";

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Returns a cached MongoClient connection promise. In development this is
 * stashed on `globalThis` so hot-reloading doesn't open a new connection
 * pool on every module reload.
 *
 * Throws only when actually called without MONGODB_URI configured — importing
 * this module is always safe, so pages that don't touch the database never
 * fail just because Mongo isn't set up yet.
 */
export function getMongoClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to your .env.local — see .env.example.",
    );
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const c = await getMongoClientPromise();
  const db = c.db(dbName);
  await ensureIndexes(db);
  return db;
}

// Guards against creating the same indexes on every request — this only
// actually hits MongoDB once per server process (createIndex is otherwise
// idempotent, but there's no reason to round-trip for it every time).
let indexesEnsured: Promise<void> | null = null;

function ensureIndexes(db: Db): Promise<void> {
  if (!indexesEnsured) {
    indexesEnsured = Promise.all([
      db.collection("users").createIndex({ email: 1 }, { unique: true }),
      db.collection("notifications").createIndex({ orgOwnerId: 1, userId: 1, createdAt: -1 }),
      db.collection("notifications").createIndex({ id: 1 }, { unique: true }),
    ])
      .then(() => undefined)
      .catch((err) => {
        console.error("Could not ensure indexes:", err);
        indexesEnsured = null; // let the next call retry
      });
  }
  return indexesEnsured;
}
