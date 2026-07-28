import { NextRequest, NextResponse } from "next/server";
import { fetchCampaignMetrics } from "@/lib/oauth/client";
import { getOAuthConfig } from "@/lib/oauth/config";
import { getOrgAccessToken } from "@/lib/oauth/org-token";

/** YYYY-MM-DD, the only shape the endpoint accepts. */
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * One campaign's metric totals.
 *
 *     GET /v1/campaigns/:campaignId/metrics/overview?startDate=&endDate=
 *     Authorization: Bearer <access token>
 *
 * Needs `metrics:read` — a different scope from the campaign itself, so this can 403 while
 * the campaign loads fine. Dates are optional; omitted, the endpoint uses campaign start
 * through today.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await params;
  const query = request.nextUrl.searchParams;

  const organizationId = query.get("organization_id");
  if (!organizationId) {
    return NextResponse.json(
      { error: "organization_id_required" },
      { status: 400 },
    );
  }

  // Dropped rather than forwarded when malformed, so a bad date falls back to the endpoint's
  // default range instead of returning a 400.
  const startDate = query.get("startDate");
  const endDate = query.get("endDate");
  const range = {
    ...(startDate && DATE.test(startDate) ? { startDate } : {}),
    ...(endDate && DATE.test(endDate) ? { endDate } : {}),
  };

  const config = getOAuthConfig();
  const token = await getOrgAccessToken(config, organizationId);
  if (!token.ok) {
    return NextResponse.json(
      { error: token.error, detail: token.detail },
      { status: 502 },
    );
  }

  try {
    const result = await fetchCampaignMetrics(
      config,
      token.accessToken,
      campaignId,
      range,
    );

    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      body: result.body,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "metrics_request_failed";
    console.error("[metrics]", message);
    return NextResponse.json(
      { error: "metrics_request_failed", detail: message },
      { status: 502 },
    );
  }
}
