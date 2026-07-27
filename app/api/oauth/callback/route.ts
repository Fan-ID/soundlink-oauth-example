import { NextRequest, NextResponse } from "next/server";
import { decodeJwtPayload, exchangeAuthorizationCode } from "@/lib/oauth/client";
import { getOAuthConfig } from "@/lib/oauth/config";
import { saveAccessToken } from "@/lib/store/access-token-store";
import { consumePkceCookie } from "@/lib/store/pkce-cookie";

/**
 * Step 3 of connecting: Soundlink redirects here with `code`.
 *
 * The code is exchanged for a token **server-side** (the code verifier never touches the
 * browser). Two things come out of that exchange:
 *
 * 1. `organization_id` and `grant_id`, read straight from the token's claims — no extra API
 *    call, nothing about the organization prefetched. These are opaque identifiers, not
 *    credentials, so they are handed to the browser as query params and kept in
 *    localStorage (see lib/store/connected-orgs.ts).
 * 2. The access token itself, which is kept **server-side only**
 *    (see lib/store/access-token-store.ts). It is needed because `/oauth/userinfo` accepts
 *    only a token from this flow — a client-credentials token is rejected there.
 *
 * The token expires in an hour and there is no refresh token, so reconnecting is the only
 * way to get another one.
 */
function homeRedirect(params: Record<string, string>): NextResponse {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3005";
  const url = new URL("/", base);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // The user denied consent, or Soundlink rejected the request outright.
  const oauthError = searchParams.get("error");
  if (oauthError) {
    return homeRedirect({ error: oauthError });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    console.error("[oauth/callback] missing code/state", {
      params: Object.fromEntries(searchParams.entries()),
    });
    return homeRedirect({ error: "invalid_request" });
  }

  try {
    const config = getOAuthConfig();

    // The PKCE verifier and state were stored in a signed httpOnly cookie by
    // /api/oauth/connect. A mismatch means this is not the flow we started.
    const pkce = await consumePkceCookie(config.sessionSecret);
    if (!pkce || pkce.state !== state) {
      return homeRedirect({ error: "invalid_state" });
    }

    const token = await exchangeAuthorizationCode(config, {
      code,
      codeVerifier: pkce.codeVerifier,
    });

    // `organization_id` and `grant_id` are claims on the access token, so reading them
    // costs nothing extra.
    const claims = decodeJwtPayload(token.access_token);
    const organizationId =
      typeof claims?.organization_id === "string"
        ? claims.organization_id
        : undefined;
    const grantId =
      typeof claims?.grant_id === "string" ? claims.grant_id : undefined;

    if (!organizationId) {
      console.error("[oauth/callback] token missing organization_id claim");
      return homeRedirect({ error: "callback_failed" });
    }

    const scopes = token.scope?.trim() ? token.scope.trim().split(/\s+/) : [];

    // Kept so "Fetch userinfo" has a token that endpoint will actually accept.
    saveAccessToken(organizationId, {
      accessToken: token.access_token,
      scopes,
      expiresInSeconds: token.expires_in,
    });

    // The granted scopes and the token's expiry are not secrets, so they travel back with
    // the ids. That lets the UI describe the consent token on first paint without a request.
    return homeRedirect({
      connected: organizationId,
      ...(grantId ? { grant: grantId } : {}),
      ...(scopes.length > 0 ? { scopes: scopes.join(" ") } : {}),
      token_expires_at: new Date(
        Date.now() + token.expires_in * 1000,
      ).toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "callback_failed";
    console.error("[oauth/callback]", message);

    // Surface known OAuth error codes; anything else is reported generically.
    const known = [
      "invalid_grant",
      "invalid_client",
      "invalid_request",
      "invalid_token",
      "access_denied",
    ];
    return homeRedirect({
      error: known.includes(message) ? message : "callback_failed",
    });
  }
}
