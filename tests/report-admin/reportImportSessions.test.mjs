import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";

import { importWithMocks } from "../helpers/moduleLoader.mjs";

const repoRoot = resolve(import.meta.dirname, "../..");

const firebaseAdminMock = `
const Timestamp = {
  fromDate(date) {
    return { toMillis: () => date.getTime(), toDate: () => date };
  },
  fromMillis(ms) {
    return { toMillis: () => ms, toDate: () => new Date(ms) };
  },
};

const FieldValue = {
  serverTimestamp() {
    return { __type: "serverTimestamp" };
  },
  increment(value) {
    return { __type: "increment", value };
  },
};

const admin = {
  firestore() {
    return {
      collection() {
        throw new Error("firestore collection não deveria ser usado neste teste");
      },
      batch() {
        throw new Error("firestore batch não deveria ser usado neste teste");
      },
    };
  },
};

admin.firestore.Timestamp = Timestamp;
admin.firestore.FieldValue = FieldValue;

export default admin;
`;

test("assertReportImportSessionAccess protege posse e expiração da sessão", async () => {
  const mod = await importWithMocks({
    entry: "src/lib/server/reportImportSessions.js",
    repoRoot,
    mocks: {
      "@/lib/firebaseAdmin": firebaseAdminMock,
    },
  });

  const validSession = {
    sessionId: "sess-1",
    adminUid: "admin-1",
    expiresAt: Date.now() + 60_000,
    selectedCategory: 1,
    summary: { totalRows: 2 },
    previewRows: [],
    assumptions: [],
  };

  assert.equal(mod.isReportImportSessionExpired(validSession), false);
  assert.equal(mod.assertReportImportSessionAccess(validSession, "admin-1"), validSession);

  assert.throws(
    () => mod.assertReportImportSessionAccess(validSession, "admin-2"),
    (error) => error?.code === "report-import-session-forbidden"
  );

  assert.throws(
    () => mod.assertReportImportSessionAccess({ ...validSession, expiresAt: Date.now() - 1 }, "admin-1"),
    (error) => error?.code === "report-import-session-expired"
  );
});

test("mapReportImportSessionToClient e política de cleanup preservam o contrato do preview", async () => {
  const mod = await importWithMocks({
    entry: "src/lib/server/reportImportSessions.js",
    repoRoot,
    mocks: {
      "@/lib/firebaseAdmin": firebaseAdminMock,
    },
  });

  const mapped = mod.mapReportImportSessionToClient({
    sessionId: "sess-2",
    expiresAt: 123456789,
    selectedCategory: 2,
    selectedTemplate: { id: "template-1", name: "Modelo 1" },
    summary: { totalRows: 5 },
    matchSummary: { ready: 3 },
    previewRows: [{ rowIndex: 2 }],
    assumptions: ["Teste"],
    fileName: "arquivo.xlsx",
    fileSize: 456,
  });

  assert.deepEqual(mapped, {
    importSessionId: "sess-2",
    expiresAt: 123456789,
    selectedCategory: 2,
    selectedTemplate: { id: "template-1", name: "Modelo 1" },
    summary: { totalRows: 5 },
    matchSummary: { ready: 3 },
    previewRows: [{ rowIndex: 2 }],
    assumptions: ["Teste"],
    file: { name: "arquivo.xlsx", size: 456 },
  });

  assert.deepEqual(mod.getReportImportSessionCleanupPolicy(), {
    ttlMinutes: 30,
    opportunisticCleanupLimit: 10,
    manualCleanupBatchLimit: 25,
    recommendedManualFrequency: "1x por dia útil ou antes de uma rodada grande de importações.",
    recommendedManualActor: "admin",
  });

  const expiry = mod.buildReportImportSessionExpiry(15);
  assert.equal(typeof expiry.toMillis(), "number");
});
