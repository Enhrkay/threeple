import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

import {
  ThreepleAppShell,
} from "@/components/threeple/app-shell";

import {
  ThreepleAlert,
  ThreepleBadge,
} from "@/components/threeple/design-system";

import OfflineRecordForm from "./offline-record-form";

export const instant = false;

type PageProps = {
  params: Promise<{
    collectionId: string;
    participantId: string;
  }>;
};

export default async function OfflineRecordPage({
  params,
}: PageProps) {
  const {
    collectionId,
    participantId,
  } = await params;

  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      `/auth/login?next=${encodeURIComponent(
        `/collector/${collectionId}/offline-record/${participantId}`
      )}`
    );
  }

  const {
    data: collection,
  } = await supabaseAdmin
    .from("collections")
    .select(`
      id,
      title,
      organization_id,
      currency,
      default_amount,
      status,
      archived_at
    `)
    .eq(
      "id",
      collectionId
    )
    .maybeSingle();

  if (
    !collection ||
    collection.status !==
      "active" ||
    collection.archived_at
  ) {
    notFound();
  }

  const {
    data: organization,
  } = await supabaseAdmin
    .from("organizations")
    .select(`
      owner_id
    `)
    .eq(
      "id",
      collection.organization_id
    )
    .maybeSingle();

  if (!organization) {
    notFound();
  }

  let allowed =
    organization.owner_id ===
    userId;

  if (!allowed) {
    const {
      data: membership,
    } = await supabaseAdmin
      .from(
        "organization_members"
      )
      .select("role")
      .eq(
        "organization_id",
        collection.organization_id
      )
      .eq(
        "user_id",
        userId
      )
      .in(
        "role",
        [
          "admin",
          "treasurer",
        ]
      )
      .maybeSingle();

    allowed =
      Boolean(
        membership
      );
  }

  if (!allowed) {
    notFound();
  }

  const {
    data: participant,
  } = await supabaseAdmin
    .from("participants")
    .select(`
      id,
      full_name,
      expected_amount,
      is_active
    `)
    .eq(
      "id",
      participantId
    )
    .eq(
      "collection_id",
      collectionId
    )
    .eq(
      "is_active",
      true
    )
    .maybeSingle();

  if (!participant) {
    notFound();
  }

  return (
    <ThreepleAppShell
      title="Record Offline"
      subtitle={collection.title}
      status={
        <ThreepleBadge tone="warning">
          Device only
        </ThreepleBadge>
      }
    >
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/collector/${collectionId}`}
          className="text-sm font-black text-[var(--tp-primary)]"
        >
          Back to members
        </Link>

        <ThreepleAlert
          tone="warning"
          className="mt-5"
        >
          Use this when connectivity is unavailable or unreliable. The contribution will stay on this device until you open Offline Queue and sync it.
        </ThreepleAlert>

        <div className="mt-5">
          <OfflineRecordForm
            collectionId={
              collectionId
            }
            collectionTitle={
              collection.title
            }
            participantId={
              participant.id
            }
            participantName={
              participant.full_name
            }
            currency={
              collection.currency
            }
            suggestedAmount={
              participant.expected_amount ??
              collection.default_amount
            }
          />
        </div>
      </div>
    </ThreepleAppShell>
  );
}

