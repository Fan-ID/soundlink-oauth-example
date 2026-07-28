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

/**
 * Read a response body, tolerating a non-JSON one.
 *
 * An empty object stands in for anything unparseable, so callers can branch on `res.ok` and
 * read an error code without guarding every access.
 */
async function readJson<T>(res: Response): Promise<T | OAuthErrorBody> {
  const raw = await res.text();
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

  const json = await readJson<TokenResponse>(res);

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

  const body = await readJson<UserinfoResponse>(res);

  return { status: res.status, ok: res.ok, body };
}

export type CampaignStatus =
  | "creating"
  | "active"
  | "paused"
  | "stopped"
  | "completed"
  | "failed"
  | "ended";

export interface Campaign {
  campaignId: string;
  organizationId: string;
  status: CampaignStatus;
  socialPlatform: string;
  dailyBudget: number;
  totalBudget: number;
  campaignDuration: number;
  /** Writes are only supported for generation 3. */
  generation: 1 | 2 | 3;
  createdAt: string;
  updatedAt: string;
}

/** The detail response: the list fields, plus one the summary omits. */
export interface CampaignDetail extends Campaign {
  strategyType?: string;
}

/**
 * Campaign totals for a date range.
 *
 * Snake_case because that is the wire format — unlike the campaign resources, which are
 * camelCase. `cpl`, `cpf` and `streams_per_listener` are derived server-side from the spend
 * and audience figures, so there is nothing to compute here.
 */
export interface MetricsOverview {
  listeners: number;
  streams: number;
  followers: number;
  /** Null when the platform did not report it. */
  impressions: number | null;
  ad_clicks: number | null;
  link_clicks: number | null;
  spend_media: number;
  spend_total: number;
  fees: number;
  currency: string;
  cpl: number;
  cpf: number;
  streams_per_listener: number;
}

export interface CampaignsPagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/** Envelope of `GET /v1/campaigns` — items and pagination live under `data`. */
export interface CampaignsResponse {
  data: { items: Campaign[]; pagination: CampaignsPagination };
  meta?: { requestId?: string };
}

/** Every campaign resource wraps its payload the same way. */
export interface DataEnvelope<T> {
  data: T;
  meta?: { requestId?: string };
}

/**
 * List the organization's campaigns.
 *
 * Needs `campaigns:read`. Unlike userinfo this is a public-API resource rather than an OAuth
 * endpoint, but it authenticates the same way — a bearer token for the organization.
 *
 * `sortBy`/`sortOrder` are left at their documented defaults (`createdAt` descending).
 * Returns the status rather than throwing, so a 401/403 can be shown as an outcome.
 */
export async function fetchCampaigns(
  config: OAuthConfig,
  accessToken: string,
  params: { page: number; pageSize: number },
): Promise<BearerCallResult> {
  const url = new URL(`${config.apiBaseUrl}/v1/campaigns`);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("pageSize", String(params.pageSize));

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const body = await readJson<CampaignsResponse>(res);

  return { status: res.status, ok: res.ok, body };
}

/** One campaign. Needs `campaigns:read`. 404s for an id the organization does not own. */
export async function fetchCampaign(
  config: OAuthConfig,
  accessToken: string,
  campaignId: string,
): Promise<BearerCallResult> {
  const res = await fetch(
    `${config.apiBaseUrl}/v1/campaigns/${encodeURIComponent(campaignId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  const body = await readJson<DataEnvelope<CampaignDetail>>(res);

  return { status: res.status, ok: res.ok, body };
}

/**
 * Campaign totals for a date range. Needs `metrics:read` — a different scope from the
 * campaign resources, so a token can be allowed one and refused the other.
 *
 * Omitting the dates lets the endpoint apply its own defaults: campaign start through today.
 */
export async function fetchCampaignMetrics(
  config: OAuthConfig,
  accessToken: string,
  campaignId: string,
  range: { startDate?: string; endDate?: string } = {},
): Promise<BearerCallResult> {
  const url = new URL(
    `${config.apiBaseUrl}/v1/campaigns/${encodeURIComponent(campaignId)}/metrics/overview`,
  );
  if (range.startDate) url.searchParams.set("startDate", range.startDate);
  if (range.endDate) url.searchParams.set("endDate", range.endDate);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const body = await readJson<DataEnvelope<MetricsOverview>>(res);

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
 * non-revoked grant for that client + organization — this grant type never creates one, so
 * consent has to have happened first.
 *
 * There is no refresh token, so renewing means calling this again. That is what makes the
 * stored `organization_id` enough to keep access alive indefinitely.
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

  const json = await readJson<TokenResponse>(res);

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

  const json = await readJson<unknown>(res);

  if (res.ok || res.status === 404) return;

  const err = json as OAuthErrorBody;
  if (err.error === "invalid_grant") return; // already revoked
  throw new Error(err.error ?? `revoke_failed_${res.status}`);
}
