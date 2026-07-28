"use client";

import type { OrgProfile } from "@/lib/store/connected-orgs";

/**
 * Read an organization's identity claims through `POST /api/oauth/userinfo`.
 *
 * Returns undefined whenever there is nothing worth storing — the route reported an error,
 * Soundlink rejected the token, or the reply carried neither claim. The caller then leaves
 * the stored profile alone rather than overwriting it with blanks.
 */
export async function fetchOrgProfile(
  organizationId: string,
): Promise<OrgProfile | undefined> {
  try {
    const res = await fetch(
      `/api/oauth/userinfo?organization_id=${encodeURIComponent(organizationId)}`,
      { method: "POST" },
    );
    const json = await res.json();

    // The route reports its own failures with an `error` key, and passes an upstream
    // rejection (401, 403) through as `ok: false`. Neither yields claims.
    if (json?.error || !json?.ok) return undefined;

    return profileFrom(json.body);
  } catch {
    return undefined;
  }
}

function profileFrom(body: unknown): OrgProfile | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const claims = body as Record<string, unknown>;

  const sub = typeof claims.sub === "string" ? claims.sub : undefined;
  const email = typeof claims.email === "string" ? claims.email : undefined;
  if (!sub && !email) return undefined;

  return { sub, email, fetchedAt: new Date().toISOString() };
}
