"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import {
  removeConnectedOrg,
  type ConnectedOrg,
} from "@/lib/store/connected-orgs";

/** Org ids are uuids; the first block is enough to tell two apart at a glance. */
function shortId(organizationId: string): string {
  return organizationId.split("-")[0];
}

/**
 * One connected organization, as a tile in the grid.
 *
 * Shows only what identifies it: a short id, and the email userinfo returned when it was
 * connected. The tile links to that organization's page.
 *
 * Nothing here fetches. The only click that reaches the network is Disconnect.
 */
export function OrgTile({ org }: { org: ConnectedOrg }) {
  const [confirming, setConfirming] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  /** Revoke the grant at Soundlink, then forget the organization locally. */
  async function disconnect() {
    setDisconnecting(true);
    const query = new URLSearchParams({ organization_id: org.organizationId });
    // Without a grant id there is nothing to revoke — the local entry is still dropped.
    if (org.grantId) query.set("grant_id", org.grantId);
    try {
      await fetch(`/api/oauth/disconnect?${query}`, { method: "POST" });
    } finally {
      // Removed even if revocation failed, so a tile cannot get stuck on screen.
      removeConnectedOrg(org.organizationId);
      setDisconnecting(false);
    }
  }

  // w-60 matches the connect tile, so every box in the grid is the same size.
  return (
    <div className="flex w-60 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {/* The whole box opens the organization. Disconnect sits outside the link, so it
          cannot be triggered by navigating. */}
      <Link
        href={`/orgs/${org.organizationId}`}
        title={org.organizationId}
        className="flex-1 p-4 transition-colors outline-none hover:bg-neutral-50 focus-visible:bg-neutral-50"
      >
        <p className="font-mono text-sm font-medium">
          {shortId(org.organizationId)}
        </p>
        <p className="mt-1 text-xs break-all text-neutral-500">
          {org.profile?.email ?? "no email stored"}
        </p>
      </Link>

      {/* Disconnect revokes access at Soundlink, so it asks first. */}
      <footer className="border-t border-neutral-200 bg-neutral-50 p-3">
        {confirming ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              size="sm"
              disabled={disconnecting}
              onClick={disconnect}
            >
              {disconnecting ? "Disconnecting…" : "Confirm"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={disconnecting}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            Disconnect
          </Button>
        )}
      </footer>
    </div>
  );
}
