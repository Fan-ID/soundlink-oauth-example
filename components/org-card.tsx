"use client";

import { useState } from "react";
import { FailureBox, type Failure } from "@/components/failure-box";
import { TokenPanel, type TokenResult } from "@/components/token-panel";
import { Badge, Button, Card, Divider } from "@/components/ui";
import { relativeTime } from "@/lib/format";
import {
  removeConnectedOrg,
  type ConnectedOrg,
} from "@/lib/store/connected-orgs";
import { useNow } from "@/lib/use-now";

/** What POST /api/oauth/userinfo returns — the upstream reply, passed through as data. */
interface UserinfoResult {
  ok: boolean;
  status: number;
  body: unknown;
  token: { expiresAt: string; scopes: string[] };
}

/**
 * One connected organization, showing the two grant types side by side.
 *
 * Part 1 — Authorization code: the token consent produced. Describes itself from values
 *   saved at callback time, then calls the one endpoint that accepts it.
 * Part 2 — Client credentials: a token the app mints for itself, on demand.
 *
 * Nothing here runs on mount. Every request below is triggered by a click.
 */
export function OrgCard({ org }: { org: ConnectedOrg }) {
  const now = useNow();

  const [userinfoBusy, setUserinfoBusy] = useState(false);
  const [userinfo, setUserinfo] = useState<UserinfoResult>();
  const [userinfoFailure, setUserinfoFailure] = useState<Failure>();

  const [tokenBusy, setTokenBusy] = useState(false);
  const [token, setToken] = useState<TokenResult>();
  const [tokenFailure, setTokenFailure] = useState<Failure>();

  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Every route below is scoped to one organization.
  const orgQuery = `organization_id=${encodeURIComponent(org.organizationId)}`;

  /** Part 1 action: spend the consent token on GET /oauth/userinfo. */
  async function fetchUserinfo() {
    setUserinfoBusy(true);
    setUserinfoFailure(undefined);
    setUserinfo(undefined);
    try {
      const res = await fetch(`/api/oauth/userinfo?${orgQuery}`, {
        method: "POST",
      });
      const json = await res.json();
      // Routes signal their own failures with an `error` key; an upstream rejection
      // (403, 401) arrives as a normal result so it can be shown as an outcome.
      if (json?.error) setUserinfoFailure(json as Failure);
      else setUserinfo(json as UserinfoResult);
    } catch {
      setUserinfoFailure({ error: "userinfo_request_failed" });
    } finally {
      setUserinfoBusy(false);
    }
  }

  /** Part 2 action: mint a fresh client-credentials token (force=1 skips the cache). */
  async function generateToken() {
    setTokenBusy(true);
    setTokenFailure(undefined);
    try {
      const res = await fetch(`/api/oauth/token?${orgQuery}&force=1`, {
        method: "POST",
      });
      const json = await res.json();
      if (json?.error) {
        setTokenFailure(json as Failure);
        setToken(undefined);
      } else {
        setToken(json as TokenResult);
      }
    } catch {
      setTokenFailure({ error: "token_request_failed" });
    } finally {
      setTokenBusy(false);
    }
  }

  /** Revoke the grant server-side, then forget the organization locally. */
  async function disconnect() {
    setDisconnecting(true);
    try {
      const grantQuery = org.grantId
        ? `&grant_id=${encodeURIComponent(org.grantId)}`
        : "";
      await fetch(`/api/oauth/disconnect?${orgQuery}${grantQuery}`, {
        method: "POST",
      });
    } finally {
      // Removed even if revocation failed, so the card cannot get stuck on screen.
      removeConnectedOrg(org.organizationId);
      setDisconnecting(false);
    }
  }

  // Computed from a stored timestamp, not from a request. 0 means the clock has not started.
  const consentTokenExpired =
    org.tokenExpiresAt != null &&
    now !== 0 &&
    new Date(org.tokenExpiresAt).getTime() <= now;

  return (
    <Card>
      <div className="space-y-4 p-4">
        <header className="space-y-1">
          <h2 className="font-mono text-sm break-all">{org.organizationId}</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {org.grantId ? (
              <>
                grant <span className="font-mono">{org.grantId}</span>
              </>
            ) : (
              "no grant id stored — disconnect will not revoke"
            )}
          </p>
        </header>

        <Divider />

        {/* ---------- Part 1: authorization code ---------- */}
        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Authorization code</h3>
            <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
              grant_type=authorization_code
            </span>
          </div>

          {/* Rendered from what the callback saved — no request needed to show this. */}
          {org.tokenExpiresAt ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={consentTokenExpired ? "danger" : "outline"}>
                {consentTokenExpired ? "Expired" : "Valid"}
              </Badge>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                token expires{" "}
                {relativeTime(org.tokenExpiresAt, now) ??
                  new Date(org.tokenExpiresAt).toLocaleTimeString()}
              </span>
            </div>
          ) : (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              token state unknown — connected before this was recorded
            </p>
          )}

          {org.scopes && org.scopes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Granted
              </span>
              {org.scopes.map((scope) => (
                <Badge key={scope} variant="muted">
                  {scope}
                </Badge>
              ))}
            </div>
          )}

          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Issued once by the code exchange and held on the server. It cannot be
            renewed — there is no refresh token, so reconnecting is the only way to get
            another.
          </p>

          <Button disabled={userinfoBusy} onClick={fetchUserinfo}>
            {userinfoBusy ? "Fetching…" : "Fetch userinfo"}
          </Button>

          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-mono">GET /oauth/userinfo</span> — the only
            bearer-protected endpoint, and it accepts only this kind of token.{" "}
            <span className="font-mono">openid</span> returns{" "}
            <span className="font-mono">sub</span>,{" "}
            <span className="font-mono">email</span> adds the address.
          </p>

          {userinfoFailure && <FailureBox failure={userinfoFailure} />}

          {userinfo && (
            <div className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={userinfo.ok ? "muted" : "danger"}>
                  {userinfo.status} {userinfo.ok ? "OK" : "Error"}
                </Badge>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  token expires{" "}
                  {relativeTime(userinfo.token.expiresAt, now) ?? "in an hour"}
                </span>
              </div>

              <pre className="max-h-48 overflow-auto rounded-md bg-neutral-100 p-2 font-mono text-xs dark:bg-neutral-800">
                {JSON.stringify(userinfo.body, null, 2)}
              </pre>

              {!userinfo.ok && userinfo.status === 403 && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="font-mono">insufficient_scope</span> means the token
                  lacks <span className="font-mono">openid</span>; check the scopes
                  requested at connect time.
                </p>
              )}
            </div>
          )}
        </section>

        <Divider />

        {/* ---------- Part 2: client credentials ---------- */}
        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Client credentials</h3>
            <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
              grant_type=client_credentials
            </span>
          </div>

          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Client id + secret + this organization id, exchanged for a one-hour token with
            no user involved. Renewable any time — which is what the stored organization
            id buys you.
          </p>

          <Button variant="outline" disabled={tokenBusy} onClick={generateToken}>
            {tokenBusy ? "Requesting…" : "Generate new token"}
          </Button>

          {tokenFailure && <FailureBox failure={tokenFailure} />}

          {token && <TokenPanel token={token} now={now} />}
        </section>
      </div>

      {/* Disconnect revokes access in Soundlink, so it asks first. */}
      <footer className="flex flex-col items-start gap-2 border-t border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
        {confirmingDisconnect ? (
          <>
            <p className="text-sm font-medium">Disconnect this organization?</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Revokes the app&apos;s access in Soundlink and removes this id from your
              browser.
            </p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                disabled={disconnecting}
                onClick={disconnect}
              >
                {disconnecting ? "Disconnecting…" : "Yes, disconnect"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={disconnecting}
                onClick={() => setConfirmingDisconnect(false)}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmingDisconnect(true)}
          >
            Disconnect
          </Button>
        )}
      </footer>
    </Card>
  );
}
