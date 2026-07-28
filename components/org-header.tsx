"use client";

import { useConnectedOrgs, useOrgsLoaded } from "@/lib/store/connected-orgs";

/**
 * Names the organization being viewed: full id, with the email userinfo returned beneath it.
 *
 * A client component because the email lives in localStorage — the server knows only the id
 * from the URL.
 */
export function OrgHeader({ organizationId }: { organizationId: string }) {
  const orgs = useConnectedOrgs();
  const loaded = useOrgsLoaded();

  const org = orgs.find((o) => o.organizationId === organizationId);

  return (
    <header className="space-y-1">
      <h1 className="font-mono text-lg break-all">{organizationId}</h1>

      {/* Non-breaking space until localStorage has been read, so the line does not flash
          "no email stored" for an organization that has one. */}
      <p className="text-sm break-all text-neutral-500">
        {!loaded ? " " : (org?.profile?.email ?? "no email stored")}
      </p>

      {loaded && !org && (
        <p className="text-xs text-neutral-500">
          Not connected in this browser — the list of connected organizations is stored
          locally, so this id is unknown here.
        </p>
      )}
    </header>
  );
}
