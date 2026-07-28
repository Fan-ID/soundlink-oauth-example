import Link from "next/link";
import { CampaignDetailView } from "@/components/campaign-detail";

/**
 * One campaign, reached from its row on the organization page.
 *
 * Both ids come from the route: the campaign id names the resource, and the organization id
 * selects the token used to read it. Nothing is fetched here — see components/campaign-detail.
 */
export default async function CampaignPage({
  params,
}: {
  params: Promise<{ orgId: string; campaignId: string }>;
}) {
  const { orgId, campaignId } = await params;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-16">
      <Link
        href={`/orgs/${orgId}`}
        className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
      >
        ← Campaigns
      </Link>

      <header className="space-y-1">
        <h1 className="font-mono text-lg break-all">{campaignId}</h1>
        <p className="font-mono text-xs break-all text-neutral-500">
          {orgId}
        </p>
      </header>

      <CampaignDetailView organizationId={orgId} campaignId={campaignId} />
    </main>
  );
}
