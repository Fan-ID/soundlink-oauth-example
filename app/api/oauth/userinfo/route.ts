import { NextRequest, NextResponse } from "next/server";
import { fetchUserinfo } from "@/lib/oauth/client";
import { getOAuthConfig } from "@/lib/oauth/config";
import { getAccessToken } from "@/lib/store/access-token-store";

/**
 * Step 4: use the organization's access token to read the data its scopes allow.
 *
 *     GET /api/v1/oauth/userinfo
 *     Authorization: Bearer <access token>
 *
 * `openid` returns `sub`, `organization_id` and `iss`; `email` adds the address.
 *
 * The token used is the one from the consent callback, held server-side. That matters:
 * userinfo requires `grant_type=authorization_code`, so this is the only kind of token it
 * accepts. Nothing is minted here — if the stored token is gone or has expired there is no
 * refresh token to fall back on, and the organization has to be reconnected.
 */
export async function POST(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("organization_id");
  if (!organizationId) {
    return NextResponse.json(
      { error: "organization_id_required" },
      { status: 400 },
    );
  }

  const token = getAccessToken(organizationId);
  if (!token) {
    // Never stored, or lost to a server restart.
    return NextResponse.json({ error: "no_token" }, { status: 409 });
  }
  if (token.expired) {
    return NextResponse.json(
      { error: "token_expired", expiresAt: token.expiresAt },
      { status: 409 },
    );
  }

  try {
    const result = await fetchUserinfo(getOAuthConfig(), token.accessToken);

    // The upstream status is passed through as data, not as this route's status, so the UI
    // can render a rejection as an outcome rather than a crash.
    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      body: result.body,
      token: { expiresAt: token.expiresAt, scopes: token.scopes },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "userinfo_request_failed";
    console.error("[oauth/userinfo]", message);
    return NextResponse.json(
      { error: "userinfo_request_failed", detail: message },
      { status: 502 },
    );
  }
}
