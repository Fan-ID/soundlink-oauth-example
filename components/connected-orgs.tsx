"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { ConnectTile } from "@/components/connect-tile";
import { OrgTile } from "@/components/org-tile";
import {
  addConnectedOrg,
  setOrgProfile,
  useConnectedOrgs,
} from "@/lib/store/connected-orgs";
import { fetchOrgProfile } from "@/lib/userinfo";

/**
 * The connected organizations, as a selectable grid.
 *
 * Renders from localStorage alone. The one request that is not a click is the userinfo read
 * that runs once when an organization comes back from consent — see below.
 */
export function ConnectedOrgs() {
  const orgs = useConnectedOrgs();
  const router = useRouter();
  const searchParams = useSearchParams();

  const connected = searchParams.get("connected");
  const grant = searchParams.get("grant");
  const scopes = searchParams.get("scopes");
  const tokenExpiresAt = searchParams.get("token_expires_at");

  // Which org id this component has already handled. Guards against React's double-invoked
  // effects and against the re-render that router.replace causes.
  const handled = useRef<string>(undefined);

  // Step 3b: /api/oauth/callback redirects back with ?connected=<org id>. Persist the org,
  // read its identity, then strip the params so a refresh is not a fresh connection.
  useEffect(() => {
    if (!connected || handled.current === connected) return;
    handled.current = connected;

    addConnectedOrg({
      organizationId: connected,
      grantId: grant ?? undefined,
      scopes: scopes ? scopes.split(" ").filter(Boolean) : undefined,
      tokenExpiresAt: tokenExpiresAt ?? undefined,
    });

    // Read the email now, while the consent token is fresh. It is the only token
    // /oauth/userinfo accepts, it lasts an hour and cannot be renewed, so this is the one
    // chance to label the tile with something a person recognises. Deliberately not
    // awaited: the redirect below should not wait on it.
    void fetchOrgProfile(connected).then((profile) => {
      if (profile) setOrgProfile(connected, profile);
    });

    router.replace("/");
  }, [connected, grant, scopes, tokenExpiresAt, router]);

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-sm text-neutral-500">
        {orgs.length === 0
          ? "No organizations connected"
          : `${orgs.length} connected ${
              orgs.length === 1 ? "organization" : "organizations"
            }`}
      </p>

      {/* Fixed-width tiles that wrap, rather than columns that stretch to fill the page —
          a box should look the same whether there is one of them or six. The tile that adds
          an organization is the last box in the same row. Each org tile links to
          /orgs/<organization id>. */}
      <div className="flex flex-wrap gap-4">
        {orgs.map((org) => (
          <OrgTile key={org.organizationId} org={org} />
        ))}

        <ConnectTile />
      </div>
    </div>
  );
}
