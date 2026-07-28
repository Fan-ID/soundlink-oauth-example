/**
 * A failed request, in the terms the reader can act on.
 *
 * Two layers, because they answer different questions: what to do about it (the sentence),
 * and exactly what the server said (the code, worth searching for).
 */

/** Codes this app produces itself, plus the upstream detail that pins down the cause. */
function ownError(error: string, detail?: string): string {
  if (error === "token_request_failed") {
    if (detail === "unauthorized_client") {
      return "This OAuth client is not allowed the client_credentials grant, so no token could be minted for this organization. Add it to the client's allowed grant types.";
    }
    if (detail === "invalid_grant") {
      return "No grant exists for this client and organization, or it was revoked. Reconnect the organization.";
    }
    return "No token could be obtained for this organization.";
  }
  if (error === "organization_id_required") {
    return "No organization was specified.";
  }
  return "The request could not be completed.";
}

/** Statuses Soundlink returned. These are the ones worth explaining. */
function upstreamError(status: number | undefined, subject: string): string {
  if (status === 401) return "Soundlink rejected the token.";
  if (status === 403) {
    return `The token is missing the scope this needs. Check SOUNDLINK_SCOPES and the scopes granted at connect time.`;
  }
  if (status === 404) {
    return `The ${subject} could not be found for this organization.`;
  }
  if (status === 429) {
    return "Rate limited by Soundlink. Wait a moment and try again.";
  }
  if (status === 400) return "Soundlink rejected the request parameters.";
  return `The ${subject} could not be loaded.`;
}

export interface Failure {
  /** This app's own error code, when the failure never reached Soundlink. */
  error?: string;
  detail?: string;
  /** The status Soundlink returned, when it did. */
  upstreamStatus?: number;
}

export function describeFailure(
  failure: Failure,
  subject: string,
): { message: string; code: string } {
  if (failure.error) {
    return {
      message: ownError(failure.error, failure.detail),
      code: failure.detail
        ? `${failure.error}: ${failure.detail}`
        : failure.error,
    };
  }
  return {
    message: upstreamError(failure.upstreamStatus, subject),
    code: `upstream_${failure.upstreamStatus ?? "error"}`,
  };
}

export function RequestFailed({
  message,
  code,
}: {
  message: string;
  code: string;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm text-red-700">{message}</p>
      <p className="font-mono text-xs text-red-600/80">{code}</p>
    </div>
  );
}
