import Link from "next/link";
import { Campaigns } from "@/components/campaigns";
import { OrgHeader } from "@/components/org-header";

/**
 * One organization's page, reached by clicking its tile on the home page.
 *
 * The route param is the whole server-side input. The id identifies the organization; the
 * email beside it was stored in the browser at connect time, and the campaigns are fetched
 * from Soundlink through `/api/campaigns` — both by the client components below.
 */
export default async function OrgPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-16">
      <Link
        href="/"
        className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
      >
        ← Organizations
      </Link>

      <OrgHeader organizationId={orgId} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Campaigns</h2>
        <Campaigns organizationId={orgId} />
      </section>
    </main>
  );
}
