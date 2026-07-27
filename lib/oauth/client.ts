import type { OAuthConfig } from "./config";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface UserinfoResponse {
  sub: string;
  organization_id: string;
  iss: string;
  email?: string;
}

export interface OAuthErrorBody {
  error?: string;
  error_description?: string;
}

/** Outcome of a bearer-authenticated call, including failures worth showing. */
export interface BearerCallResult {
  status: number;
  ok: boolean;
  body: unknown;
}

/** Read a response once, logging the raw payload and tolerating non-JSON bodies. */
async function readJson<T>(label: string, res: Response): Promise<T | OAuthErrorBody> {
  const raw = await res.text();
  console.log(`[${label}] raw response`, {
    status: res.status,
    ok: res.ok,
    body: raw,
  });
  try {
    return JSON.parse(raw) as T;
  } catch {
    return {} as OAuthErrorBody;
  }
}

export function buildAuthorizeUrl(
  config: OAuthConfig,
  params: { state: string; codeChallenge: string },
): string {
  const url = new URL(`${config.baseUrl}/api/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", config.scopes);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeAuthorizationCode(
  config: OAuthConfig,
  params: { code: string; codeVerifier: string },
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: params.codeVerifier,
  });

  const res = await fetch(`${config.apiBaseUrl}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const raw = await res.text();
  console.log("[oauth/token] raw response", {
    status: res.status,
    ok: res.ok,
    body: raw,
  });

  const json = (() => {
    try {
      return JSON.parse(raw) as TokenResponse | OAuthErrorBody;
    } catch {
      return {} as OAuthErrorBody;
    }
  })();

  if (!res.ok) {
    const err = json as OAuthErrorBody;
    throw new Error(err.error ?? `token_exchange_failed_${res.status}`);
  }

  return json as TokenResponse;
}

/**
 * Read the scope-backed profile data (`openid` → `sub`, `email` → `email`) for whichever
 * token is supplied.
 *
 * Returns the status instead of throwing: the demo shows the raw outcome, and a rejection
 * is as informative as a success here (see the `access_denied` note in the README).
 */
export async function fetchUserinfo(
  config: OAuthConfig,
  accessToken: string,
): Promise<BearerCallResult> {
  const res = await fetch(`${config.apiBaseUrl}/api/v1/oauth/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const body = await readJson<UserinfoResponse>("oauth/userinfo", res);

  return { status: res.status, ok: res.ok, body };
}

/** Decode JWT payload server-side only; does not verify signature. */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Machine-to-machine token: the client authenticates as itself with `client_id` +
 * `client_secret` and names the organization it wants to act for. Requires an existing,
 * non-revoked grant for that client + organization — this grant type never creates one.
 *
 * There is no refresh token, so renewing means calling this again.
 */
export async function requestClientCredentialsToken(
  config: OAuthConfig,
  organizationId: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    organization_id: organizationId,
    scope: config.scopes,
  });

  const res = await fetch(`${config.apiBaseUrl}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = await readJson<TokenResponse>("oauth/token:cc", res);

  if (!res.ok) {
    const err = json as OAuthErrorBody;
    throw new Error(err.error ?? `token_request_failed_${res.status}`);
  }

  return json as TokenResponse;
}

/**
 * Revoke this application's grant. Idempotent: a grant that is already revoked or
 * no longer known is treated as success so repeated disconnects behave the same.
 */
export async function revokeGrant(
  config: OAuthConfig,
  grantId: string,
): Promise<void> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_id: grantId,
  });

  const res = await fetch(`${config.apiBaseUrl}/api/v1/oauth/grants/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = await readJson<unknown>("oauth/grants/revoke", res);

  if (res.ok || res.status === 404) return;

  const err = json as OAuthErrorBody;
  if (err.error === "invalid_grant") return; // already revoked
  throw new Error(err.error ?? `revoke_failed_${res.status}`);
}
