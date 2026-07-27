/**
 * Shows why connecting failed.
 *
 * The code arrives as `?error=` on the home page — either forwarded from Soundlink's
 * authorize endpoint or produced by our own callback. Codes are mapped to plain sentences,
 * and the raw code is shown too so it can be searched for.
 */

const MESSAGES: Record<string, string> = {
  access_denied: "You declined the request, so nothing was connected.",
  invalid_state: "The sign-in attempt expired. Please try connecting again.",
  invalid_grant: "Sign-in could not be completed. Please try again.",
  invalid_request: "Soundlink sent back an incomplete response. Try again.",
  invalid_token: "Soundlink rejected the access token. Try connecting again.",
  invalid_client: "This app's credentials were rejected. Check its setup.",
  unauthorized_client:
    "This OAuth client is not allowed to start the sign-in flow.",
  connect_failed: "Could not start sign-in. Check the app's configuration.",
  callback_failed: "Connecting your account failed. Please try again.",
};

/** For failures caused by client setup rather than by the user, name the fix. */
const HINTS: Record<string, string> = {
  unauthorized_client:
    "Add authorization_code to the client's allowed grant types in backstage — this app's whole flow depends on it.",
  invalid_client: "Check SOUNDLINK_CLIENT_ID and SOUNDLINK_CLIENT_SECRET.",
  invalid_request:
    "Check that SOUNDLINK_REDIRECT_URI exactly matches one registered for the client.",
};

export function OAuthErrorAlert({ error }: { error: string }) {
  return (
    <div className="w-full space-y-1 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
      <p className="text-sm font-semibold text-red-800 dark:text-red-300">
        Couldn&apos;t connect
      </p>
      <p className="text-sm text-red-700 dark:text-red-400">
        {MESSAGES[error] ?? `Something went wrong: ${error}`}
      </p>
      <p className="font-mono text-xs text-red-600/80 dark:text-red-400/70">
        {error}
      </p>
      {HINTS[error] && (
        <p className="text-xs text-red-700/90 dark:text-red-400/80">
          {HINTS[error]}
        </p>
      )}
    </div>
  );
}
