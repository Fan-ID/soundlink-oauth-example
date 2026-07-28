import type { OAuthConfig } from "./config";
import { getClientCredentialsToken } from "./token-cache";
import { getAccessToken } from "@/lib/store/access-token-store";

/** Either a usable token, or the reason there is none. `ok` discriminates the two. */
export type OrgToken =
  | { ok: true; accessToken: string }
  | { ok: false; error: string; detail: string };

/**
 * The token every organization-scoped resource route uses.
 *
 * Minted from `client_id` + `client_secret` + `organization_id` and cached until nearly
 * expired, so access does not depend on how long ago the user consented. Falls back to the
 * consent token when minting is refused — a client without the `client_credentials` grant
 * can still read for the hour after connecting rather than seeing nothing at all.
 */
export async function getOrgAccessToken(
  config: OAuthConfig,
  organizationId: string,
): Promise<OrgToken> {
  try {
    const token = await getClientCredentialsToken(config, organizationId);
    return { ok: true, accessToken: token.accessToken };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "token_request_failed";
    console.error("[oauth] mint failed", { organizationId, detail });

    const consent = getAccessToken(organizationId);
    if (consent && !consent.expired) {
      return { ok: true, accessToken: consent.accessToken };
    }
    return { ok: false, error: "token_request_failed", detail };
  }
}
