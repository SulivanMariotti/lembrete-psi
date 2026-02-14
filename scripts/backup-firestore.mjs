#!/usr/bin/env node
/**
 * Backup local do Firestore (SEM bucket / SEM custo de Storage).
 *
 * - Exporta coleções principais em JSONL compactado (.jsonl.gz)
 * - Um arquivo por coleção + manifest.json
 * - NÃO faz restore (apenas backup). Restore manual pode ser feito via script futuro.
 *
 * Uso:
 *   npm run backup:local
 *   npm run backup:local -- --out ./backups/meu-backup
 *   npm run backup:local -- --collections users,appointments
 *   npm run backup:local -- --all
 *
 * ENV suportadas (ordem de prioridade):
 * - FIREBASE_ADMIN_SERVICE_ACCOUNT_B64 (recomendado)
 * - FIREBASE_ADMIN_SERVICE_ACCOUNT (JSON string)
 * - SERVICE_ACCOUNT_JSON_PATH (caminho local para serviceAccount.json)
 *
 * Observação: este script faz leituras no Firestore (pode consumir cota).
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

import { initializeApp, cert, getApps } from "firebase-admin/app";
import {
  getFirestore,
  FieldPath,
  Timestamp,
  GeoPoint,
} from "firebase-admin/firestore";

// ---------- tiny .env loader (sem dependências) ----------
function loadDotEnvIfPresent() {
  const candidates = [".env.local", ".env"]; // na raiz do projeto
  for (const file of candidates) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx < 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      // remove aspas simples/duplas no valor
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] == null) process.env[key] = val;
    }
  }
}

// ---------- args ----------
function parseArgs(argv) {
  const out = { outDir: null, collections: null, all: false, batch: 500 };
  const args = [...argv];
  while (args.length) {
    const a = args.shift();
    if (a === "--all") out.all = true;
    else if (a === "--out") out.outDir = args.shift();
    else if (a?.startsWith("--out=")) out.outDir = a.split("=")[1];
    else if (a === "--collections") out.collections = String(args.shift() || "");
    else if (a?.startsWith("--collections=")) out.collections = a.split("=")[1];
    else if (a === "--batch") out.batch = Number(args.shift() || "500") || 500;
    else if (a?.startsWith("--batch=")) out.batch = Number(a.split("=")[1] || "500") || 500;
  }
  return out;
}

function safeNowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

// ---------- admin init ----------
function getServiceAccountFromEnvOrFile() {
  const b64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_B64;
  if (b64) {
    const json = Buffer.from(b64, "base64").toString("utf-8");
    return JSON.parse(json);
  }

  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (raw) {
    return JSON.parse(raw);
  }

  const p = process.env.SERVICE_ACCOUNT_JSON_PATH;
  if (p && fs.existsSync(p)) {
    const json = fs.readFileSync(p, "utf-8");
    return JSON.parse(json);
  }

  throw new Error(
    "Missing service account. Set FIREBASE_ADMIN_SERVICE_ACCOUNT_B64 or FIREBASE_ADMIN_SERVICE_ACCOUNT or SERVICE_ACCOUNT_JSON_PATH"
  );
}

function ensureAdmin() {
  if (getApps().length) return;
  const serviceAccount = getServiceAccountFromEnvOrFile();
  initializeApp({ credential: cert(serviceAccount) });
}

// ---------- serializers ----------
function toPlain(val) {
  if (val == null) return val;
  if (val instanceof Timestamp) {
    return {
      __type: "timestamp",
      seconds: val.seconds,
      nanoseconds: val.nanoseconds,
      iso: val.toDate().toISOString(),
    };
  }
  if (val instanceof GeoPoint) {
    return {
      __type: "geopoint",
      latitude: val.latitude,
      longitude: val.longitude,
    };
  }
  if (typeof val === "bigint") {
    return { __type: "bigint", value: val.toString() };
  }
  if (Buffer.isBuffer(val)) {
    return { __type: "bytes", base64: val.toString("base64") };
  }
  if (Array.isArray(val)) return val.map(toPlain);
  if (typeof val === "object") {
    // DocumentReference: tem "path" e "id"
    if (typeof val.path === "string" && typeof val.id === "string") {
      return { __type: "ref", path: val.path };
    }
    const out = {};
    for (const [k, v] of Object.entries(val)) out[k] = toPlain(v);
    return out;
  }
  return val;
}

// ---------- backup core ----------
async function backupCollection(db, colName, outDir, batchSize) {
  const colRef = db.collection(colName);
  const docId = FieldPath.documentId();
  const filePath = path.join(outDir, `${colName}.jsonl.gz`);
  const gzip = zlib.createGzip({ level: zlib.constants.Z_BEST_SPEED });
  const outStream = fs.createWriteStream(filePath);
  gzip.pipe(outStream);

  const header = {
    __meta: {
      collection: colName,
      createdAt: new Date().toISOString(),
      format: "jsonl",
    },
  };
  gzip.write(JSON.stringify(header) + "\n");

  let lastId = null;
  let total = 0;

  while (true) {
    let q = colRef.orderBy(docId).limit(batchSize);
    if (lastId) q = q.startAfter(lastId);
    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const line = {
        id: doc.id,
        path: doc.ref.path,
        data: toPlain(doc.data()),
      };
      gzip.write(JSON.stringify(line) + "\n");
      total += 1;
    }

    lastId = snap.docs[snap.docs.length - 1].id;
  }

  gzip.end();
  await new Promise((resolve, reject) => {
    outStream.on("close", resolve);
    outStream.on("error", reject);
  });

  return { collection: colName, documents: total, file: path.basename(filePath) };
}

async function main() {
  loadDotEnvIfPresent();

  const args = parseArgs(process.argv.slice(2));
  ensureAdmin();
  const db = getFirestore();

  const defaultCollections = [
    "config",
    "users",
    "subscribers",
    "appointments",
    "attendance_logs",
    "patient_notes",
    "history",
    "admins",
  ];

  let collections = defaultCollections;
  if (args.collections) {
    collections = String(args.collections)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (args.all) {
    const cols = await db.listCollections();
    collections = cols.map((c) => c.id);
  }

  const outDir = path.resolve(
    args.outDir || path.join(process.cwd(), "backups", `firestore_${safeNowStamp()}`)
  );
  fs.mkdirSync(outDir, { recursive: true });

  console.log("\n=== Lembrete Psi — Backup local do Firestore ===");
  console.log("Output:", outDir);
  console.log("Collections:", collections.join(", "));
  console.log("Batch size:", args.batch);
  console.log("\nIniciando...\n");

  const manifest = {
    createdAt: new Date().toISOString(),
    outDir,
    batchSize: args.batch,
    collections: [],
  };

  for (const col of collections) {
    try {
      console.log(`→ Exportando: ${col}`);
      const res = await backupCollection(db, col, outDir, args.batch);
      manifest.collections.push(res);
      console.log(`  ✓ ${col}: ${res.documents} docs → ${res.file}`);
    } catch (e) {
      console.warn(`  ⚠ Falhou em ${col}:`, e?.message || e);
      manifest.collections.push({ collection: col, error: String(e?.message || e) });
    }
  }

  const manifestPath = path.join(outDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  // Atualiza um "sinal de vida" no Firestore para o painel Admin.
  // ✅ NÃO grava caminhos locais (privacidade). Apenas metadata (timestamp + contagens).
  try {
    const backupId = path.basename(outDir);
    const cols = Array.isArray(manifest.collections) ? manifest.collections : [];
    const successCols = cols.filter((c) => typeof c?.documents === "number" && !c?.error);
    const errorCols = cols.filter((c) => !!c?.error);
    const docsTotal = successCols.reduce((acc, c) => acc + Number(c.documents || 0), 0);

    await db
      .collection("system")
      .doc("health")
      .set(
        {
          lastBackup: {
            mode: "local",
            id: backupId,
            at: new Date(),
            ok: errorCols.length === 0,
            collectionsTotal: cols.length,
            collectionsOk: successCols.length,
            collectionsError: errorCols.length,
            documentsTotal: docsTotal,
          },
          updatedAt: new Date(),
        },
        { merge: true }
      );

    console.log("\n✓ Firestore atualizado: system/health.lastBackup");
  } catch (e) {
    console.warn("\n⚠ Não foi possível atualizar system/health no Firestore:", e?.message || e);
  }
  console.log("\nConcluído.");
  console.log("Manifest:", manifestPath);
  console.log("\nDica: mova a pasta de backup para um local seguro (Drive/HD externo).\n");
}

main().catch((e) => {
  console.error("\nBackup falhou:", e?.stack || e);
  process.exit(1);
});
