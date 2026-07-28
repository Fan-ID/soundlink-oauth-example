import { NextRequest, NextResponse } from "next/server";
import { fetchCampaigns } from "@/lib/oauth/client";
import { getOAuthConfig } from "@/lib/oauth/config";
import { getOrgAccessToken } from "@/lib/oauth/org-token";

/**
 * List one organization's campaigns.
 *
 *     GET /v1/campaigns?page=&pageSize=
 *     Authorization: Bearer <access token>
 *
 * Needs `campaigns:read`. The token is minted from the stored `organization_id` rather than
 * taken from the consent callback — see lib/oauth/org-token.ts for why.
 *
 * The token stays on the server; the browser only ever sees the campaigns.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const organizationId = params.get("organization_id");
  if (!organizationId) {
    return NextResponse.json(
      { error: "organization_id_required" },
      { status: 400 },
    );
  }

  // Clamped here rather than forwarded blindly: the endpoint rejects anything outside these
  // bounds with a 400, and a demo should not turn a stale link into an error page.
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(params.get("pageSize")) || 10),
  );

  const config = getOAuthConfig();
  const token = await getOrgAccessToken(config, organizationId);
  if (!token.ok) {
    return NextResponse.json(
      { error: token.error, detail: token.detail },
      { status: 502 },
    );
  }

  try {
    const result = await fetchCampaigns(config, token.accessToken, {
      page,
      pageSize,
    });

    // The upstream status is passed through as data, not as this route's status, so the UI
    // can render a rejection as an outcome rather than a crash.
    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      body: result.body,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "campaigns_request_failed";
    console.error("[campaigns]", message);
    return NextResponse.json(
      { error: "campaigns_request_failed", detail: message },
      { status: 502 },
    );
  }
}
