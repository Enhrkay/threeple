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

import ClearOfflineDataButton from "./clear-offline-data-button";

export const instant = false;

export default async function CollectorPrivacyPage() {
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
        "/collector/device"
      )}`
    );
  }

  return (
    <ThreepleAppShell
      title="Collector Device"
      subtitle="Offline data"
      status={
        <ThreepleBadge tone="primary">
          Device privacy
        </ThreepleBadge>
      }
    >
      <div className="mx-auto max-w-3xl">
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
          Threeple keeps prepared field rosters and unsynced manual receipts in this browser so the collector can work without connectivity. These records are device-local and are separate from Paystack payment data.
        </ThreepleAlert>

        <section className="tp-card mt-5 p-6 sm:p-8">
          <p className="tp-kicker">
            Automatic protection
          </p>

          <h1 className="tp-heading mt-2 text-2xl">
            Offline records follow the signed-in collector.
          </h1>

          <div className="mt-5 space-y-4 text-sm leading-6 text-[var(--tp-ink-soft)]">
            <p>
              If another Threeple account signs into this browser, Threeple clears the previous collector&apos;s offline store before assigning the device to the new account.
            </p>

            <p>
              When the collector signs out, prepared member rosters and queued local field receipts are removed from this browser automatically.
            </p>

            <p>
              Synced server records remain in Threeple&apos;s audit ledger. Clearing this device only removes browser-local copies.
            </p>
          </div>
        </section>

        <div className="mt-5">
          <ClearOfflineDataButton />
        </div>
      </div>
    </ThreepleAppShell>
  );
}



