
/**
 * purgeAttendanceLogs.cjs (v3 ascii-only)
 *
 * Deletes ALL documents from a Firestore collection (default: attendance_logs).
 *
 * Why v3:
 * - Some Windows environments may throw "SyntaxError: Invalid or unexpected token"
 *   if the file contains non-ascii characters. This version is ASCII-only.
 *
 * Usage:
 *   node scripts/purgeAttendanceLogs.cjs --yes
 *   node scripts/purgeAttendanceLogs.cjs --collection=attendance_logs --yes
 *   node scripts/purgeAttendanceLogs.cjs --collection=history --yes
 *   node scripts/purgeAttendanceLogs.cjs --collection=audit_logs --yes
 *
 * Credentials:
 * - The script tries to read FIREBASE_ADMIN_SERVICE_ACCOUNT_B64 or FIREBASE_ADMIN_SERVICE_ACCOUNT
 *   from .env.local or .env at the project root (process.cwd()).
 * - If not found, you can set FIREBASE_ADMIN_KEYFILE to a local JSON key file path.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = String(line || "").trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("#")) continue;

      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;

      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();

      // Strip wrapping quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }

      // Do not overwrite existing env
      if (process.env[key] == null) process.env[key] = val;
    }
  } catch (_) {
    // ignore
  }
}

function loadProjectEnv() {
  const cwd = process.cwd();
  loadEnvFile(path.join(cwd, ".env.local"));
  loadEnvFile(path.join(cwd, ".env"));
}

function getServiceAccount() {
  loadProjectEnv();

  const b64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_B64;
  if (b64) {
    const json = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json);
  }

  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (raw) return JSON.parse(raw);

  const keyFile = process.env.FIREBASE_ADMIN_KEYFILE || "";
  if (keyFile && fs.existsSync(keyFile)) {
    return JSON.parse(fs.readFileSync(keyFile, "utf8"));
  }

  throw new Error(
    "Missing credentials. Put FIREBASE_ADMIN_SERVICE_ACCOUNT_B64 or FIREBASE_ADMIN_SERVICE_ACCOUNT " +
      "in .env.local (project root), or set FIREBASE_ADMIN_KEYFILE to a JSON key file path."
  );
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { yes: false, collection: "attendance_logs" };

  for (const a of args) {
    if (a === "--yes" || a === "-y") out.yes = true;
    else if (a.indexOf("--collection=") === 0) out.collection = a.split("=", 2)[1] || out.collection;
  }
  return out;
}

async function deleteCollection(db, collectionPath, batchSize) {
  const colRef = db.collection(collectionPath);
  let deletedTotal = 0;

  // Use limit + batch delete loop (works in all environments)
  while (true) {
    const snap = await colRef.limit(batchSize).get();
    if (snap.empty) break;

    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();

    deletedTotal += snap.size;
    console.log("Deleted " + deletedTotal + " docs from " + collectionPath + "...");
  }

  return deletedTotal;
}

async function main() {
  const args = parseArgs();

  if (!args.yes) {
    console.log("WARNING: This will permanently delete ALL documents in the collection:");
    console.log("  " + args.collection);
    console.log("");
    console.log("Run again with:");
    console.log("  node scripts/purgeAttendanceLogs.cjs --collection=" + args.collection + " --yes");
    process.exit(0);
  }

  const serviceAccount = getServiceAccount();

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  const db = admin.firestore();
  console.log("Project: " + (serviceAccount.project_id || "(unknown)"));
  console.log("Deleting collection: " + args.collection);

  const n = await deleteCollection(db, args.collection, 400);
  console.log("DONE. Deleted " + n + " documents from " + args.collection + ".");
}

main().catch((err) => {
  console.error("purge failed:", err && err.stack ? err.stack : err);
  process.exit(1);
});
