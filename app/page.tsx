import { Suspense } from "react";
import { ConnectedOrgs } from "@/components/connected-orgs";
import { OAuthErrorAlert } from "@/components/oauth-error-alert";

/**
 * Root page. Deliberately does no data fetching of its own: the connected-organization
 * list lives in the browser (localStorage), and tokens and scope data are only requested
 * when the user clicks.
 *
 * The flow it demonstrates:
 *
 *   connect → consent → callback → organization id saved to localStorage
 *   then, per organization: generate token → fetch scope data → disconnect
 *
 * Consent is what creates the grant, and the stored `organization_id` is what lets the app
 * keep minting client-credentials tokens afterwards without involving the user again.
 *
 * Note the two actions use different grants on purpose: "Generate token" mints a
 * client-credentials token, while "Fetch scope data" spends the consent token, because
 * `/oauth/userinfo` accepts only the latter. See the README.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center gap-6 px-4 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Soundlink OAuth Example
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Connect an organization, then generate a token for it and read the data its
          granted scopes allow.
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
