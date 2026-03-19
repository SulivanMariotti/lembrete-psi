import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";

import { importWithMocks } from "../helpers/moduleLoader.mjs";

const repoRoot = resolve(import.meta.dirname, "../..");

const nextServerMock = `
export class NextResponse {
  constructor(body = null, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.headers = init.headers || {};
  }

  static json(body, init = {}) {
    return new NextResponse(body, init);
  }
}
`;

function createFile({ name, size = 10 }) {
  return {
    name,
    size,
    async arrayBuffer() {
      return new Uint8Array([1, 2, 3]).buffer;
    },
  };
}

test("rota de import bloqueia template inválido e mantém código estável", async () => {
  let auditPayload = null;

  const mod = await importWithMocks({
    entry: "src/app/api/admin/report/import/route.js",
    repoRoot,
    mocks: {
      "next/server": nextServerMock,
      "@/lib/server/requireAdmin": `export async function requireAdmin() { return { ok: true, uid: "admin-1", decoded: { email: "admin@test.com" } }; }`,
      "@/lib/server/adminError": `export function adminError({ err }) { return { status: 500, body: { ok: false, error: err?.message || "erro" } }; }`,
      "@/lib/server/rateLimit": `export async function rateLimit() { return { ok: true }; }`,
      "@/lib/server/auditLog": `export async function logAdminAudit(payload) { globalThis.__auditPayload = payload; }`,
      "@/lib/server/reportImportAnalysis": `
        export function parseSelectedCategory(value) { return Number(value || 1); }
        export async function analyzeReportImportFile() {
          const error = new Error("Template inválido");
          error.code = "invalid-template-headers";
          error.validation = { missingHeaders: ["Paciente"] };
          throw error;
        }
      `,
      "@/lib/server/reportImportSessions": `export async function createReportImportSession() { throw new Error("não deveria criar sessão"); }`,
      "@/lib/shared/reportImportTemplate": `export const REPORT_IMPORT_TEMPLATE = { acceptedExtensions: [".xlsx"], maxFileSizeBytes: 1000 };`,
    },
  });

  globalThis.__auditPayload = null;
  const response = await mod.POST({
    async formData() {
      return new Map([
        ["file", createFile({ name: "import.xlsx", size: 100 })],
        ["selectedCategory", "1"],
      ]);
    },
  });

  auditPayload = globalThis.__auditPayload;
  assert.equal(response.status, 400);
  assert.equal(response.body.code, "invalid-template-headers");
  assert.equal(auditPayload.status, "rejected");
  assert.equal(auditPayload.meta.reason, "invalid-template-headers");
});

test("rota de pdf bloqueia sessão de outro admin com HTTP 403", async () => {
  const mod = await importWithMocks({
    entry: "src/app/api/admin/report/pdf/route.js",
    repoRoot,
    mocks: {
      "next/server": nextServerMock,
      "@/lib/server/requireAdmin": `export async function requireAdmin() { return { ok: true, uid: "admin-1", decoded: { email: "admin@test.com" } }; }`,
      "@/lib/server/adminError": `export function adminError({ err }) { return { status: 500, body: { ok: false, error: err?.message || "erro" } }; }`,
      "@/lib/server/rateLimit": `export async function rateLimit() { return { ok: true }; }`,
      "@/lib/server/auditLog": `export async function logAdminAudit() {}`,
      "@/lib/server/reportImportSessions": `
        export async function getReportImportSession() {
          return { sessionId: "sess-1", adminUid: "admin-2", expiresAt: Date.now() + 60000, readyRows: [{ id: 1 }], summary: { totalRows: 1 }, selectedCategory: 1 };
        }
        export function assertReportImportSessionAccess(session, adminUid) {
          if (session.adminUid !== adminUid) {
            const error = new Error("forbidden");
            error.code = "report-import-session-forbidden";
            throw error;
          }
          return session;
        }
        export async function markReportImportSessionPdfGenerated() {}
      `,
      "@/lib/server/reportPdfBuilder": `export function buildReportPdf() { return Buffer.from("pdf"); }`,
    },
  });

  const response = await mod.POST({
    async json() {
      return { importSessionId: "sess-1" };
    },
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.code, "report-import-session-forbidden");
});

test("rota de cleanup devolve contagem de sessões expiradas removidas", async () => {
  let auditPayload = null;

  const mod = await importWithMocks({
    entry: "src/app/api/admin/report/import/cleanup/route.js",
    repoRoot,
    mocks: {
      "next/server": nextServerMock,
      "@/lib/server/requireAdmin": `export async function requireAdmin() { return { ok: true, uid: "admin-1", decoded: { email: "admin@test.com" } }; }`,
      "@/lib/server/adminError": `export function adminError({ err }) { return { status: 500, body: { ok: false, error: err?.message || "erro" } }; }`,
      "@/lib/server/rateLimit": `export async function rateLimit() { return { ok: true }; }`,
      "@/lib/server/auditLog": `export async function logAdminAudit(payload) { globalThis.__cleanupAudit = payload; }`,
      "@/lib/server/reportImportSessions": `export async function purgeExpiredReportImportSessions() { return { deleted: 3, scanned: 3 }; }`,
    },
  });

  globalThis.__cleanupAudit = null;
  const response = await mod.POST({
    async json() {
      return { limit: 25 };
    },
  });

  auditPayload = globalThis.__cleanupAudit;
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true, deleted: 3, scanned: 3 });
  assert.equal(auditPayload.meta.deleted, 3);
});
