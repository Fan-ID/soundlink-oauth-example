"use client";

import { useSyncExternalStore } from "react";

/**
 * Connected organizations, stored in the browser's localStorage.
 *
 * Why the browser and not the server: after linking, the ONLY durable thing a partner
 * needs is the `organization_id`. Everything else (tokens, user info) is fetched on
 * demand using `client_id` + `client_secret` + `organization_id`. So there is no
 * server-side session to keep — this app stores a plain list of ids and nothing else.
 *
 * Nothing here is a credential: `client_secret` never leaves the server, and no access
 * token is ever stored. `grantId` is kept only because revoking on disconnect needs it.
 * `scopes` and `tokenExpiresAt` describe the consent token without being it — they let the
 * UI report that token's state immediately, with no request on render.
 *
 * Exposed through `useSyncExternalStore` so that:
 *   - the server render sees an empty list (no hydration mismatch on localStorage), and
 *   - every mounted component re-renders when the list changes, including from another tab.
 */

export interface ConnectedOrg {
  organizationId: string;
  /** Identifies the grant to revoke on disconnect. Not a secret. */
  grantId?: string;
  /** Scopes the user actually granted. Absent for entries saved before this was recorded. */
  scopes?: string[];
  /** When the server-held consent token expires. Not the token itself. */
  tokenExpiresAt?: string;
  connectedAt: string;
}

const STORAGE_KEY = "soundlink.connected-orgs";

/** Stable empty reference — returning a new [] each read would loop React. */
const EMPTY: ConnectedOrg[] = [];

const listeners = new Set<() => void>();

// getSnapshot must return the same reference until the data actually changes, so the
// parsed list is cached against the raw string it came from.
let cachedRaw: string | null = null;
let cachedOrgs: ConnectedOrg[] = EMPTY;

function parse(raw: string | null): ConnectedOrg[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter(
      (entry): entry is ConnectedOrg =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as ConnectedOrg).organizationId === "string",
    );
  } catch {
    // Corrupt or hand-edited value — behave as if nothing is connected.
    return EMPTY;
  }
}

function readOrgs(): ConnectedOrg[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedOrgs = parse(raw);
  }
  return cachedOrgs;
}

function write(orgs: ConnectedOrg[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orgs));
  // 'storage' only fires in *other* tabs, so notify this one directly.
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The connected organizations. Empty during server render. */
export function useConnectedOrgs(): ConnectedOrg[] {
  return useSyncExternalStore(subscribe, readOrgs, () => EMPTY);
}

/**
 * Add an organization, or update one already present.
 * Idempotent, so re-running it (React strict mode, a refresh, a repeated callback)
 * cannot create duplicates.
 *
 * Reconnecting issues a *new* consent token, so an existing entry has its grant id,
 * scopes and token expiry refreshed rather than left as they were.
 */
export function addConnectedOrg(org: {
  organizationId: string;
  grantId?: string;
  scopes?: string[];
  tokenExpiresAt?: string;
}): void {
  const existing = readOrgs();
  const match = existing.find((o) => o.organizationId === org.organizationId);

  if (match) {
    const updated: ConnectedOrg = {
      ...match,
      grantId: org.grantId ?? match.grantId,
      scopes: org.scopes ?? match.scopes,
      tokenExpiresAt: org.tokenExpiresAt ?? match.tokenExpiresAt,
    };
    // Skip the write when nothing actually changed, so a double-invoked effect is a no-op.
    if (
      updated.grantId === match.grantId &&
      updated.tokenExpiresAt === match.tokenExpiresAt &&
      (updated.scopes ?? []).join(" ") === (match.scopes ?? []).join(" ")
    ) {
      return;
    }
    write(
      existing.map((o) =>
        o.organizationId === org.organizationId ? updated : o,
      ),
    );
    return;
  }

  write([
    ...existing,
    {
      organizationId: org.organizationId,
      grantId: org.grantId,
      scopes: org.scopes,
      tokenExpiresAt: org.tokenExpiresAt,
      connectedAt: new Date().toISOString(),
    },
  ]);
}

/** Remove an organization from the list. Safe to call when it is already gone. */
export function removeConnectedOrg(organizationId: string): void {
  const existing = readOrgs();
  const remaining = existing.filter((o) => o.organizationId !== organizationId);
  if (remaining.length !== existing.length) write(remaining);
}
