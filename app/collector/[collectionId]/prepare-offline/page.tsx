import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  ThreepleAppShell,
} from "@/components/threeple/app-shell";

import {
  ThreepleBadge,
} from "@/components/threeple/design-system";

import PrepareOfflineClient from "./prepare-offline-client";

export const instant = false;

type PageProps = {
  params: Promise<{
    collectionId: string;
  }>;
};

export default async function PrepareOfflinePage({
  params,
}: PageProps) {
  const {
    collectionId,
  } = await params;

  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  if (
    !claimsData?.claims?.sub
  ) {
    redirect(
      `/auth/login?next=${encodeURIComponent(
        `/collector/${collectionId}/prepare-offline`
      )}`
    );
  }

  return (
    <ThreepleAppShell
      title="Prepare for Offline"
      subtitle="Field route"
      status={
        <ThreepleBadge tone="warning">
          Device copy
        </ThreepleBadge>
      }
    >
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/collector/${collectionId}`}
          className="text-sm font-black text-[var(--tp-primary)]"
        >
          Back to Collector Workspace
        </Link>

        <div className="mt-5">
          <PrepareOfflineClient
            collectionId={
              collectionId
            }
          />
        </div>
      </div>
    </ThreepleAppShell>
  );
}

