import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testDatabaseUrl = "file:./prisma/test.db";

export async function setup() {
  process.env.DATABASE_URL = testDatabaseUrl;
  execSync("npx prisma db push --skip-generate", {
    cwd: root,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "pipe",
  });
}

export async function teardown() {
  // Test DB is gitignored (*.db); left on disk for local inspection.
}
