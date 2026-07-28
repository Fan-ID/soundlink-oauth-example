"use client";

import { useEffect, useState } from "react";
import {
  describeFailure,
  RequestFailed,
  type Failure,
} from "@/components/request-failed";
import { proxyGet } from "@/lib/api";
import type { CampaignDetail, MetricsOverview } from "@/lib/oauth/client";

/** One request's result. `undefined` means still in flight. */
type Result<T> = { value: T; failure?: undefined } | { failure: Failure };

/**
 * One campaign: its own fields, then its metric totals.
 *
 * The two are fetched separately and in parallel because they need different scopes —
 * `campaigns:read` and `metrics:read`. A token allowed one and refused the other should show
 * what it can, rather than one failure hiding both sections.
 */
export function CampaignDetailView({
  organizationId,
  campaignId,
}: {
  organizationId: string;
  campaignId: string;
}) {
  const [campaign, setCampaign] = useState<Result<CampaignDetail>>();
  const [metrics, setMetrics] = useState<Result<MetricsOverview>>();

  useEffect(() => {
    let stale = false;
    const query = `organization_id=${encodeURIComponent(organizationId)}`;
    const base = `/api/campaigns/${encodeURIComponent(campaignId)}`;

    void proxyGet<CampaignDetail>(`${base}?${query}`).then((result) => {
      if (!stale) {
        setCampaign(
          result.failure ? { failure: result.failure } : { value: result.data },
        );
      }
    });

    // No dates sent: the endpoint defaults to campaign start through today.
    void proxyGet<MetricsOverview>(`${base}/metrics?${query}`).then((result) => {
      if (!stale) {
        setMetrics(
          result.failure ? { failure: result.failure } : { value: result.data },
        );
      }
    });

    return () => {
      stale = true;
    };
  }, [organizationId, campaignId]);

  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Campaign</h2>
        {!campaign ? (
          <Panel>Loading campaign…</Panel>
        ) : campaign.failure ? (
          <RequestFailed {...describeFailure(campaign.failure, "campaign")} />
        ) : (
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            <Field label="Status">{campaign.value.status}</Field>
            <Field label="Platform">{campaign.value.socialPlatform}</Field>
            <Field label="Daily budget">
              {campaign.value.dailyBudget.toFixed(2)}
            </Field>
            <Field label="Total budget">
              {campaign.value.totalBudget.toFixed(2)}
            </Field>
            <Field label="Duration">
              {`${campaign.value.campaignDuration} days`}
            </Field>
            <Field label="Generation">{String(campaign.value.generation)}</Field>
            {/* Only the detail response carries this one. */}
            <Field label="Strategy">
              {campaign.value.strategyType ?? "—"}
            </Field>
            <Field label="Created">{date(campaign.value.createdAt)}</Field>
            <Field label="Updated">{date(campaign.value.updatedAt)}</Field>
          </dl>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Metrics</h2>
          <span className="text-xs text-neutral-500">
            campaign start to today
          </span>
        </div>

        {!metrics ? (
          <Panel>Loading metrics…</Panel>
        ) : metrics.failure ? (
          <RequestFailed {...describeFailure(metrics.failure, "metrics")} />
        ) : (
          <Metrics metrics={metrics.value} />
        )}
      </section>
    </div>
  );
}

function Metrics({ metrics }: { metrics: MetricsOverview }) {
  const { currency } = metrics;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <Stat label="Listeners" value={count(metrics.listeners)} />
      <Stat label="Streams" value={count(metrics.streams)} />
      <Stat label="Followers" value={count(metrics.followers)} />
      <Stat label="Impressions" value={count(metrics.impressions)} />
      <Stat label="Ad clicks" value={count(metrics.ad_clicks)} />
      <Stat label="Link clicks" value={count(metrics.link_clicks)} />
      <Stat label="Media spend" value={money(metrics.spend_media, currency)} />
      <Stat label="Total spend" value={money(metrics.spend_total, currency)} />
      <Stat label="Fees" value={money(metrics.fees, currency)} />
      <Stat
        label="Cost per listener"
        value={money(metrics.cpl, currency, 3)}
      />
      <Stat label="Cost per follower" value={money(metrics.cpf, currency, 3)} />
      <Stat
        label="Streams / listener"
        value={metrics.streams_per_listener.toFixed(2)}
      />
    </div>
  );
}

/** Nullable by contract — impressions and both click counts may not be reported. */
function count(value: number | null): string {
  return value == null ? "—" : value.toLocaleString();
}

function money(value: number, currency: string, digits = 2): string {
  return `${value.toFixed(digits)} ${currency}`;
}

function date(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-neutral-100 py-1.5">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="font-mono text-xs">{children}</dd>
    </div>
  );
}

function Panel({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
      {children}
    </div>
  );
}
