import { getAuth } from "firebase/auth";

/**
 * adminFetch
 *
 * Wrapper para chamadas aos endpoints /api/admin/*.
 * - Injeta Authorization: Bearer <Firebase idToken>
 * - Retry seguro (apenas GET/HEAD) em falhas transitórias (502/503/504) ou erro de rede.
 * - Não usa segredos em NEXT_PUBLIC_*.
 */

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldRetry({ method, status }) {
  const m = String(method || "GET").toUpperCase();
  if (!(m === "GET" || m === "HEAD")) return false;
  return status === 502 || status === 503 || status === 504;
}

export async function adminFetch(url, options = {}) {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Você não está autenticado no Admin.");
  }

  const idToken = await user.getIdToken();

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${idToken}`);

  const method = String(options.method || "GET").toUpperCase();

  const maxAttempts = (method === "GET" || method === "HEAD") ? 2 : 1;

  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        method,
        headers,
      });

      if (attempt < maxAttempts && shouldRetry({ method, status: res.status })) {
        await sleep(250 * attempt);
        continue;
      }

      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts) {
        await sleep(250 * attempt);
        continue;
      }
      throw lastErr;
    }
  }

  // should not reach
  throw lastErr || new Error("Falha ao chamar API.");
}
