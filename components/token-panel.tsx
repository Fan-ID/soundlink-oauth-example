"use client";

import { useState } from "react";
import { Badge, Button, Divider } from "@/components/ui";
import { relativeTime } from "@/lib/format";

export interface TokenResult {
  ok: true;
  /** False when the server served a cached token instead of minting a new one. */
  refreshed: boolean;
  tokenType: string;
  scopes: string[];
  expiresAt: string;
  claims: Record<string, unknown>;
}

/**
 * Shows what a generated client-credentials token contains.
 *
 * Never the token value — the server strips that out and sends only the decoded claims,
 * so there is nothing sensitive to render here.
 */
export function TokenPanel({
  token,
  now,
}: {
  token: TokenResult;
  /** Ticking clock from useNow, so the countdown stays live. 0 before it starts. */
  now: number;
}) {
  const [showClaims, setShowClaims] = useState(false);

  // now === 0 on the server and first paint, when no comparison is possible yet.
  const expired = now !== 0 && new Date(token.expiresAt).getTime() <= now;

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={token.refreshed ? "solid" : "muted"}>
          {token.refreshed ? "Newly issued" : "Reused from cache"}
        </Badge>
        <Badge variant={expired ? "danger" : "outline"}>
          {expired ? "Expired" : "Active"}
        </Badge>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {token.tokenType} · expires{" "}
          {relativeTime(token.expiresAt, now) ??
            new Date(token.expiresAt).toLocaleTimeString()}
        </span>
      </div>

      {token.scopes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Scopes
          </span>
          {token.scopes.map((scope) => (
            <Badge key={scope} variant="outline">
              {scope}
            </Badge>
          ))}
        </div>
      )}

      <Divider />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowClaims((shown) => !shown)}
      >
        {showClaims ? "Hide claims" : "Show claims"}
      </Button>

      {showClaims && (
        <dl className="space-y-1">
          {Object.entries(token.claims).map(([name, value]) => (
            <div
              key={name}
              className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3"
            >
              <dt className="w-32 shrink-0 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                {name}
              </dt>
              <dd className="font-mono text-xs break-all">
                {formatClaim(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        The token value stays on the server; only these claims are sent to the browser.
      </p>
    </div>
  );
}

/** Arrays join with spaces (that is how `scopes` reads); epoch seconds get a local time. */
function formatClaim(value: unknown): string {
  if (Array.isArray(value)) return value.join(" ");
  if (typeof value === "number" && value > 1_000_000_000) {
    return `${value} (${new Date(value * 1000).toLocaleTimeString()})`;
  }
  return String(value);
}
