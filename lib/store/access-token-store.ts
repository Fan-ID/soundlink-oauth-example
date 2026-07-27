/**
 * Server-only store for the access tokens obtained from the authorization-code exchange,
 * keyed by organization id.
 *
 * Why it exists: `GET /api/v1/oauth/userinfo` accepts **only** a token whose `grant_type`
 * is `authorization_code`. Such a token is produced exactly once, during the consent
 * callback, so it has to be kept if the app wants to call userinfo later.
 *
 * Why in memory: an access token is a credential. Keeping it in a module-level Map keeps it
 * out of the browser and off disk. A restart drops it, and the organization must be
 * reconnected — the same thing that happens when it expires, so it is not a special case.
 *
 * Why there is no renewal: Soundlink issues no refresh tokens. When one of these expires
 * (one hour), the only way to get another is to run the consent flow again. A real
 * integration would face the same constraint and should plan for re-consent.
 */
interface StoredToken {
  accessToken: string;
  scopes: string[];
  /** Epoch ms. */
  expiresAt: number;
}

const tokens = new Map<string, StoredToken>();

/** Treat a token as unusable slightly early so it cannot lapse mid-request. */
const EXPIRY_SKEW_MS = 30_000;

export interface AccessTokenView {
  accessToken: string;
  scopes: string[];
  expiresAt: string;
  expired: boolean;
}

export function saveAccessToken(
  organizationId: string,
  token: { accessToken: string; scopes: string[]; expiresInSeconds: number },
): void {
  tokens.set(organizationId, {
    accessToken: token.accessToken,
    scopes: token.scopes,
    expiresAt: Date.now() + token.expiresInSeconds * 1000,
  });
}

/** The stored token for an organization, or null if it was never stored / lost. */
export function getAccessToken(organizationId: string): AccessTokenView | null {
  const stored = tokens.get(organizationId);
  if (!stored) return null;

  return {
    accessToken: stored.accessToken,
    scopes: stored.scopes,
    expiresAt: new Date(stored.expiresAt).toISOString(),
    expired: stored.expiresAt - EXPIRY_SKEW_MS <= Date.now(),
  };
}

/** Drop the token for an organization (used on disconnect). */
export function clearAccessToken(organizationId: string): void {
  tokens.delete(organizationId);
}
