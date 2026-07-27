import { NextRequest, NextResponse } from "next/server";
import { decodeJwtPayload } from "@/lib/oauth/client";
import { getOAuthConfig } from "@/lib/oauth/config";
import { getClientCredentialsToken } from "@/lib/oauth/token-cache";

/** Claims Soundlink puts in a client-credentials access token. */
const REPORTED_CLAIMS = [
  "sub",
  "client_id",
  "organization_id",
  "scopes",
  "grant_id",
  "grant_type",
  "iss",
  "aud",
  "iat",
  "exp",
] as const;

/**
 * Generate a token with `grant_type=client_credentials`:
 *
 *     POST /api/v1/oauth/token
 *     grant_type=client_credentials&client_id=…&client_secret=…&organization_id=…
 *
 * This is what the stored `organization_id` unlocks — the app authenticates as itself, with
 * no user present and no browser redirect. Requires an existing grant for this client and
 * organization, which only the consent flow creates.
 *
 * Soundlink issues no refresh tokens, so renewal is just asking again; `?force=1` skips the
 * cache so that is observable without waiting an hour.
 *
 * `client_secret` stays on the server, and the response carries the token's decoded claims
 * and expiry only — never the token value.
 *
 * Note this token cannot call `/oauth/userinfo`: that endpoint requires
 * `grant_type=authorization_code` and answers `403 access_denied` here whatever the scopes.
 * "Fetch scope data" therefore uses the consent token instead (see ../userinfo/route.ts).
 */
export async function POST(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("organization_id");
  if (!organizationId) {
    return NextResponse.json(
      { error: "organization_id_required" },
      { status: 400 },
    );
  }

  const force = request.nextUrl.searchParams.get("force") === "1";

  try {
    const token = await getClientCredentialsToken(
      getOAuthConfig(),
      organizationId,
      { force },
    );

    // Decoded, not verified: tokens are HS256-signed with a server-side secret and there is
    // no JWKS endpoint, so a client can read the claims but cannot check the signature.
    const payload = decodeJwtPayload(token.accessToken) ?? {};
    const claims: Record<string, unknown> = {};
    for (const claim of REPORTED_CLAIMS) {
      if (payload[claim] !== undefined) claims[claim] = payload[claim];
    }

    return NextResponse.json({
      ok: true,
      refreshed: token.refreshed,
      tokenType: "Bearer",
      scopes: token.scopes,
      expiresAt: token.expiresAt,
      claims,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "token_request_failed";
    console.error("[oauth/token]", message);
    return NextResponse.json(
      { error: "token_request_failed", detail: message },
      { status: 502 },
    );
  }
}
