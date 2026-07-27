import { NextRequest, NextResponse } from "next/server";
import { revokeGrant } from "@/lib/oauth/client";
import { getOAuthConfig } from "@/lib/oauth/config";
import { clearToken } from "@/lib/oauth/token-cache";
import { clearAccessToken } from "@/lib/store/access-token-store";

/**
 * Disconnect: revoke the application's grant and drop both kinds of token held for the
 * organization — the consent token and any cached client-credentials token. The browser
 * removes the organization from localStorage afterwards.
 *
 * Idempotent — revoking an unknown or already-revoked grant succeeds, and a request with
 * no `grant_id` still clears the tokens. Repeated disconnects behave identically.
 *
 * Note: revocation stops NEW tokens being issued. An access token already minted stays
 * valid until it expires (up to one hour), because Soundlink verifies these JWTs
 * statelessly with no per-request grant lookup.
 */
export async function POST(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("organization_id");
  if (!organizationId) {
    return NextResponse.json(
      { error: "organization_id_required" },
      { status: 400 },
    );
  }

  const grantId = request.nextUrl.searchParams.get("grant_id");

  let revoked = false;
  let revokeError: string | undefined;

  if (grantId) {
    try {
      await revokeGrant(getOAuthConfig(), grantId);
      revoked = true;
    } catch (error) {
      // Reported, but not fatal: the local mapping is still removed so the demo cannot
      // get stuck showing an organization the user asked to disconnect.
      revokeError = error instanceof Error ? error.message : "revoke_failed";
      console.error("[oauth/disconnect]", revokeError);
    }
  }

  clearAccessToken(organizationId);
  clearToken(organizationId);

  return NextResponse.json({ ok: true, revoked, revokeError });
}
