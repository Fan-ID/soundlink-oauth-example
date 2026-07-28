import { NextRequest, NextResponse } from "next/server";
import { fetchCampaign } from "@/lib/oauth/client";
import { getOAuthConfig } from "@/lib/oauth/config";
import { getOrgAccessToken } from "@/lib/oauth/org-token";

/**
 * One campaign's details.
 *
 *     GET /v1/campaigns/:campaignId
 *     Authorization: Bearer <access token>
 *
 * Needs `campaigns:read`. `organization_id` comes from the query because it selects the
 * token, not the campaign — the endpoint scopes the campaign to whoever the token belongs to,
 * and answers 404 for an id that organization does not own.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await params;

  const organizationId = request.nextUrl.searchParams.get("organization_id");
  if (!organizationId) {
    return NextResponse.json(
      { error: "organization_id_required" },
      { status: 400 },
    );
  }

  const config = getOAuthConfig();
  const token = await getOrgAccessToken(config, organizationId);
  if (!token.ok) {
    return NextResponse.json(
      { error: token.error, detail: token.detail },
      { status: 502 },
    );
  }

  try {
    const result = await fetchCampaign(config, token.accessToken, campaignId);

    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      body: result.body,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "campaign_request_failed";
    console.error("[campaign]", message);
    return NextResponse.json(
      { error: "campaign_request_failed", detail: message },
      { status: 502 },
    );
  }
}
