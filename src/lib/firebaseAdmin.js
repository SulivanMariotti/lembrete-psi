/**
 * Firebase Admin wrapper (Turbopack-safe)
 *
 * Why:
 * - Next.js (Turbopack) can panic when bundling the legacy default import:
 *     import admin from "firebase-admin";
 * - Using the modular Admin SDK entry points avoids that class of crash.
 *
 * This file intentionally mimics the old "admin" shape used across the project:
 * - admin.apps.length
 * - admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
 * - admin.auth().verifyIdToken(...)
 * - admin.firestore().collection(...)
 * - admin.firestore.FieldValue.serverTimestamp()
 * - admin.messaging().send(...)
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function getServiceAccount() {
  const b64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_B64;
  if (b64) {
    const json = Buffer.from(b64, "base64").toString("utf-8");
    return JSON.parse(json);
  }

  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("Missing FIREBASE_ADMIN_SERVICE_ACCOUNT(_B64) env var");
  }

  return JSON.parse(raw);
}

function ensureAdmin() {
  if (getApps().length) return;
  const serviceAccount = getServiceAccount();
  initializeApp({ credential: cert(serviceAccount) });
}

// Functions that behave like the classic namespaced SDK.
function auth() {
  ensureAdmin();
  return getAuth();
}

function firestore() {
  ensureAdmin();
  return getFirestore();
}
firestore.FieldValue = FieldValue;
firestore.Timestamp = Timestamp;

function messaging() {
  ensureAdmin();
  return getMessaging();
}

const admin = {
  get apps() {
    return getApps();
  },
  initializeApp,
  credential: { cert },
  auth,
  firestore,
  messaging,
};

export default admin;
export { FieldValue, Timestamp };
