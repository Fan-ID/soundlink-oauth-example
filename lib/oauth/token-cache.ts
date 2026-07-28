import { requestClientCredentialsToken } from "./client";
import type { OAuthConfig } from "./config";

/**
 * Server-only cache of **client-credentials** tokens, keyed by organization.
 *
 * Separate from lib/store/access-token-store.ts on purpose — these are two different kinds
 * of token, and what they can do differs:
 *
 *   - this file: minted on demand from client_id + client_secret + organization_id.
 *     Renewable forever, and what the public API resources accept.
 *   - access-token-store: the token from consent. The only one userinfo accepts, and it
 *     cannot be renewed.
 *
 * This is why a partner only needs to persist `organization_id`: with it, access outlives
 * any single token. Caching keeps repeat requests off the token endpoint, which is
 * rate-limited per client.
 */
interface CachedToken {
  accessToken: string;
  scopes: string[];
  /** Epoch ms. */
  expiresAt: number;
}

const cache = new Map<string, CachedToken>();

/** Re-request slightly before expiry so a token cannot lapse mid-request. */
const EXPIRY_SKEW_MS = 30_000;

export interface ClientCredentialsToken {
  accessToken: string;
  scopes: string[];
  expiresAt: string;
  /** True when this call performed a fresh token request. */
  refreshed: boolean;
}

/**
 * Return a usable token for the organization, minting one when the cached token is missing
 * or expired.
 */
export async function getClientCredentialsToken(
  config: OAuthConfig,
  organizationId: string,
): Promise<ClientCredentialsToken> {
  const cached = cache.get(organizationId);
  if (cached && cached.expiresAt - EXPIRY_SKEW_MS > Date.now()) {
    return {
      accessToken: cached.accessToken,
      scopes: cached.scopes,
      expiresAt: new Date(cached.expiresAt).toISOString(),
      refreshed: false,
    };
  }

  const token = await requestClientCredentialsToken(config, organizationId);
  const expiresAt = Date.now() + token.expires_in * 1000;
  const scopes = token.scope?.trim() ? token.scope.trim().split(/\s+/) : [];
  cache.set(organizationId, {
    accessToken: token.access_token,
    scopes,
    expiresAt,
  });

  return {
    accessToken: token.access_token,
    scopes,
    expiresAt: new Date(expiresAt).toISOString(),
    refreshed: true,
  };
}

/** Drop any cached token for the organization (used on disconnect). */
export function clearToken(organizationId: string): void {
  cache.delete(organizationId);
}
