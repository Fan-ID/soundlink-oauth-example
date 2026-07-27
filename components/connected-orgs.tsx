"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ConnectButton } from "@/components/connect-button";
import { OrgCard } from "@/components/org-card";
import { addConnectedOrg, useConnectedOrgs } from "@/lib/store/connected-orgs";

/**
 * The connected-organization list.
 *
 * Reads from localStorage only — no data about any organization is fetched when this
 * renders. Every request in this app happens because someone clicked a button.
 */
export function ConnectedOrgs() {
  const orgs = useConnectedOrgs();
  const router = useRouter();
  const searchParams = useSearchParams();

  const connected = searchParams.get("connected");
  const grant = searchParams.get("grant");
  const scopes = searchParams.get("scopes");
  const tokenExpiresAt = searchParams.get("token_expires_at");

  // Step 3b: /api/oauth/callback redirects back with ?connected=<org id>. Persist it,
  // then strip the params so a refresh does not look like a fresh connection.
  // addConnectedOrg is idempotent, so a double-invoked effect cannot duplicate an entry.
  useEffect(() => {
    if (!connected) return;
    addConnectedOrg({
      organizationId: connected,
      grantId: grant ?? undefined,
      scopes: scopes ? scopes.split(" ").filter(Boolean) : undefined,
      tokenExpiresAt: tokenExpiresAt ?? undefined,
    });
    router.replace("/");
  }, [connected, grant, scopes, tokenExpiresAt, router]);

  if (orgs.length === 0) {
    return (
      <div className="flex w-full flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
        <div className="space-y-1">
          <p className="text-sm font-medium">No organizations connected</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Connect a Soundlink organization to read its data.
          </p>
        </div>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {orgs.length} connected{" "}
          {orgs.length === 1 ? "organization" : "organizations"}
        </p>
        <ConnectButton size="sm" label="Connect another" />
      </div>

      {orgs.map((org) => (
        <OrgCard key={org.organizationId} org={org} />
      ))}
    </div>
  );
}
