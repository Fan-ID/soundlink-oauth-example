import { Suspense } from "react";
import { ConnectedOrgs } from "@/components/connected-orgs";
import { OAuthErrorAlert } from "@/components/oauth-error-alert";

/**
 * Root page. Does no data fetching of its own — the connected-organization list lives in
 * the browser (localStorage).
 *
 * The flow it demonstrates:
 *
 *   connect → consent → callback → organization saved to localStorage → disconnect
 *
 * Consent is what creates the grant. What a partner keeps afterwards is the
 * `organization_id`, which is why the grid is a list of ids and nothing more.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-6 px-4 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Soundlink OAuth Example
        </h1>
        <p className="text-sm text-neutral-500">
          Connect a Soundlink organization, then pick which one to work with.
        </p>
      </div>

      {params.error && <OAuthErrorAlert error={params.error} />}

      {/* useSearchParams needs a Suspense boundary during prerender. */}
      <Suspense fallback={null}>
        <ConnectedOrgs />
      </Suspense>
    </main>
  );
}
