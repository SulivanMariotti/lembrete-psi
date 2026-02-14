import { getAuth } from "firebase/auth";

/**
 * adminFetch
 *
 * Wrapper para chamadas aos endpoints /api/admin/*.
 * - Injeta Authorization: Bearer <Firebase idToken>
 * - Não usa segredos em NEXT_PUBLIC_*.
 */

export async function adminFetch(url, options = {}) {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Você não está autenticado no Admin.");
  }

  const idToken = await user.getIdToken();

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${idToken}`);

  return fetch(url, {
    ...options,
    headers,
  });
}
