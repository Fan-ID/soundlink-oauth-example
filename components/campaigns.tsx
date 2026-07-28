"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  describeFailure,
  RequestFailed,
  type Failure,
} from "@/components/request-failed";
import { Button } from "@/components/ui";
import { proxyGet } from "@/lib/api";
import type { Campaign, CampaignsPagination } from "@/lib/oauth/client";

const PAGE_SIZE = 10;

interface CampaignsPage {
  items: Campaign[];
  pagination: CampaignsPagination;
}

/**
 * The result of one request, tagged with the organization + page it was made for.
 *
 * Loading is derived by comparing that tag against what is being displayed, rather than
 * stored: a setState in the effect body would render twice, and the answer is already
 * knowable from the tag.
 */
type Outcome = { key: string } & (
  | { page: CampaignsPage; failure?: undefined }
  | { failure: Failure; page?: undefined }
);

/**
 * The organization's campaigns, one page at a time.
 *
 * Loads on mount and whenever the page changes — a list is what this section is for, so
 * waiting for a click would just be a click in the way. Rows link to the campaign's own page.
 */
export function Campaigns({ organizationId }: { organizationId: string }) {
  const [page, setPage] = useState(1);
  const [outcome, setOutcome] = useState<Outcome>();

  const key = `${organizationId}|${page}`;

  useEffect(() => {
    // Flipped when the org or page changes mid-flight, so a slow response cannot overwrite
    // a newer one.
    let stale = false;

    const query = new URLSearchParams({
      organization_id: organizationId,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });

    void proxyGet<CampaignsPage>(`/api/campaigns?${query}`).then((result) => {
      if (stale) return;
      setOutcome(
        result.failure
          ? { key, failure: result.failure }
          : { key, page: result.data },
      );
    });

    return () => {
      stale = true;
    };
  }, [key, organizationId, page]);

  // Anything not answering for the current org + page is still in flight.
  if (outcome?.key !== key) {
    return <Panel>Loading campaigns…</Panel>;
  }

  if (outcome.failure) {
    return <RequestFailed {...describeFailure(outcome.failure, "campaigns")} />;
  }

  const { items, pagination } = outcome.page;

  if (items.length === 0) {
    return <Panel>No campaigns for this organization.</Panel>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
            <tr>
              <Th>Campaign</Th>
              <Th>Status</Th>
              <Th>Platform</Th>
              <Th align="right">Daily</Th>
              <Th align="right">Total</Th>
              <Th align="right">Days</Th>
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((campaign) => (
              <tr
                key={campaign.campaignId}
                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
              >
                <Td>
                  <Link
                    href={`/orgs/${organizationId}/campaigns/${campaign.campaignId}`}
                    title={campaign.campaignId}
                    className="font-mono text-xs underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-900"
                  >
                    {campaign.campaignId.split("-")[0]}
                  </Link>
                </Td>
                <Td>{campaign.status}</Td>
                <Td>{campaign.socialPlatform}</Td>
                <Td align="right">{campaign.dailyBudget.toFixed(2)}</Td>
                <Td align="right">{campaign.totalBudget.toFixed(2)}</Td>
                <Td align="right">{campaign.campaignDuration}</Td>
                <Td>
                  {new Date(campaign.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          {pagination.totalCount} total · page {pagination.page} of{" "}
          {Math.max(1, pagination.totalPages)}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The dashed box used for the states with nothing to tabulate. */
function Panel({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
      {children}
    </div>
  );
}

function Th({ children, align }: { children: string; align?: "right" }) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : ""}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "right";
}) {
  return (
    <td className={`px-3 py-2 ${align === "right" ? "text-right" : ""}`}>
      {children}
    </td>
  );
}
