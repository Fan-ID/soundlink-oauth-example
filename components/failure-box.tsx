import { Badge } from "@/components/ui";

export interface Failure {
  /** This app's own error code, from one of the /api/oauth/* routes. */
  error: string;
  /** The upstream OAuth error code, when the failure came from Soundlink. */
  detail?: string;
}

/**
 * Renders a failed action inside a card.
 *
 * Three layers, because each answers a different question: what happened (message), what
 * exactly the server said (the raw code, worth searching for), and what to do about it
 * (hint). The hint is looked up by our code first, then by the upstream code — upstream
 * codes are where the actionable setup problems live.
 */

const MESSAGES: Record<string, string> = {
  organization_id_required: "No organization was specified.",
  token_request_failed: "Could not generate a token for this organization.",
  no_token: "No consent token is held for this organization on the server.",
  token_expired: "This organization's consent token has expired.",
  userinfo_request_failed: "The request could not be completed.",
};

/** Consent-token states. Both are terminal: no refresh token exists to recover with. */
const HINTS: Record<string, string> = {
  no_token:
    "Consent tokens are kept in server memory, so a server restart clears them. Disconnect and connect the organization again.",
  token_expired:
    "Consent tokens last one hour and there is no refresh token. Disconnect and connect the organization again.",
};

/** Setup problems the upstream code points at, rather than bugs in this app. */
const DETAIL_HINTS: Record<string, string> = {
  unauthorized_client:
    "This client is not allowed to use the client_credentials grant. Add it to the client's allowed grant types in backstage.",
  invalid_grant:
    "No grant exists for this client and organization, it was revoked, or THIRD_PARTY_INTEGRATIONS_ENABLED is off. Only the consent flow creates a grant.",
  invalid_client: "The client id or secret was rejected.",
};

export function FailureBox({ failure }: { failure: Failure }) {
  const hint =
    HINTS[failure.error] ??
    (failure.detail ? DETAIL_HINTS[failure.detail] : undefined);

  return (
    <div className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="danger">Failed</Badge>
        <span className="text-sm font-medium text-red-700 dark:text-red-400">
          {MESSAGES[failure.error] ?? failure.error}
        </span>
      </div>

      {failure.detail && (
        <p className="font-mono text-xs break-all text-red-600/80 dark:text-red-400/70">
          {failure.detail}
        </p>
      )}

      {hint && (
        <p className="text-xs text-red-700/90 dark:text-red-400/80">{hint}</p>
      )}
    </div>
  );
}
