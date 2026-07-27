import { requestClientCredentialsToken } from "./client";
import type { OAuthConfig } from "./config";

/**
 * Server-only cache of **client-credentials** tokens, keyed by organization.
 *
 * Separate from lib/store/access-token-store.ts on purpose — these are two different kinds
 * of token and only one of them can call userinfo:
 *
 *   - this file: minted on demand from client_id + client_secret + organization_id.
 *     Renewable forever, but no endpoint accepts it yet.
 *   - access-token-store: the token from consent. Accepted by userinfo, not renewable.
 *
 * Caching keeps repeat clicks off the token endpoint, which is rate-limited per client.
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
 * or expired. Pass `force` to mint even when the cached one is still valid — that is how
 * renewal is demonstrated without waiting out the full hour.
 */
export async function getClientCredentialsToken(
  config: OAuthConfig,
  organizationId: string,
  options: { force?: boolean } = {},
): Promise<ClientCredentialsToken> {
  const cached = cache.get(organizationId);
  if (
    !options.force &&
    cached &&
    cached.expiresAt - EXPIRY_SKEW_MS > Date.now()
  ) {
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
