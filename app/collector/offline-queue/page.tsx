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
  ThreepleAlert,
  ThreepleBadge,
} from "@/components/threeple/design-system";

import OfflineQueueClient from "./offline-queue-client";

export const instant = false;

export default async function OfflineQueuePage() {
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
        "/collector/offline-queue"
      )}`
    );
  }

  return (
    <ThreepleAppShell
      title="Offline Queue"
      subtitle="Field sync"
      status={
        <ThreepleBadge tone="warning">
          Device queue
        </ThreepleBadge>
      }
    >
      <div className="mx-auto max-w-4xl">
        <Link
          href="/collector"
          className="text-sm font-black text-[var(--tp-primary)]"
        >
          Back to Collector Mode
        </Link>

        <ThreepleAlert
          tone="info"
          className="mt-5"
        >
          Threeple does not silently overwrite offline field events. Each contribution keeps its original device event ID and receipt reference. Syncing the same event twice is safe because the server treats the device event ID idempotently.
        </ThreepleAlert>

        <div className="mt-6">
          <OfflineQueueClient />
        </div>
      </div>
    </ThreepleAppShell>
  );
}

