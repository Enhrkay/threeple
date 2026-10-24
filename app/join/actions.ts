"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logCollectionActivity } from "@/lib/activity/server";
import { getCollectionJoinRestriction } from "@/lib/restrictions/server";
import { getUserParticipationRestriction } from "@/lib/restrictions/user-server";
import { getOrganizationParticipationRestriction } from "@/lib/restrictions/organization-server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function cleanEmail(email: string) {
  return email.trim().toLowerCase();
}

function cleanPhone(phone: string) {
  return phone.trim().replace(/\s+/g, "");
}

function parseAmount(raw: string) {
  if (!raw) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

function joinError(joinCode: string, errorCode: string): never {
  redirect(`/join?code=${encodeURIComponent(joinCode)}&error=${encodeURIComponent(errorCode)}`);
}

export async function joinCollection(formData: FormData) {
  const joinCode = value(formData, "join_code").toUpperCase();
  const fullName = value(formData, "full_name");
  const phone = cleanPhone(value(formData, "phone"));
  const requestedAmount = parseAmount(value(formData, "contribution_amount"));

  if (!joinCode) joinError("", "collection_unavailable");
  if (fullName.length < 2) joinError(joinCode, "invalid_name");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/join?code=${joinCode}`)}`);
  }

  const signedInUserId = user.id;
  const accountEmail = cleanEmail(user.email ?? "");

  if (!accountEmail) joinError(joinCode, "account_email_required");

  const { data: collection, error: collectionError } = await supabaseAdmin
    .from("collections")
    .select(`
      id,
      organization_id,
      title,
      collection_mode,
      currency,
      default_amount,
      allow_custom_amount,
      requires_approval,
      status,
      archived_at
    `)
    .eq("join_code", joinCode)
    .maybeSingle();

  if (collectionError || !collection) {
    joinError(joinCode, "collection_unavailable");
  }

  const { data: existingUserParticipant } = await supabaseAdmin
    .from("participants")
    .select("id")
    .eq("collection_id", collection.id)
    .eq("user_id", signedInUserId)
    .eq("is_active", true)
    .maybeSingle();

  if (existingUserParticipant) {
    redirect(`/my-collections/${existingUserParticipant.id}`);
  }

  const { blocked: userParticipationBlocked } =
    await getUserParticipationRestriction(signedInUserId);

  if (userParticipationBlocked) {
    redirect(`/join/account-restricted?code=${encodeURIComponent(joinCode)}`);
  }

  if (collection.status !== "active" || collection.archived_at) {
    joinError(joinCode, "collection_unavailable");
  }

  const { blocked: joiningBlocked } =
    await getCollectionJoinRestriction(collection.id);

  if (joiningBlocked) {
    redirect(`/join/restricted?code=${encodeURIComponent(joinCode)}`);
  }

  const {
    data: existingEmailParticipants,
    error: existingEmailParticipantsError,
  } = await supabaseAdmin
    .from("participants")
    .select(`
      id,
      user_id,
      full_name,
      email,
      is_active,
      created_at
    `)
    .eq(
      "collection_id",
      collection.id
    )
    .ilike(
      "email",
      accountEmail
    )
    .order(
      "created_at",
      {
        ascending: true,
      }
    )
    .limit(10);

  if (
    existingEmailParticipantsError
  ) {
    console.error(
      "PARTICIPANT_EMAIL_LOOKUP_FAILED",
      {
        collectionId:
          collection.id,
        accountEmail,
        errorCode:
          existingEmailParticipantsError.code,
      }
    );

    joinError(
      joinCode,
      "join_failed"
    );
  }

  const canonicalEmailParticipant =
    existingEmailParticipants?.find(
      (row) =>
        row.is_active
    ) ??
    existingEmailParticipants?.[0] ??
    null;

  if (
    canonicalEmailParticipant
  ) {
    const {
      error: claimError,
    } = await supabaseAdmin
      .from("participants")
      .update({
        user_id:
          signedInUserId,
        full_name:
          fullName,
        phone:
          phone || null,
        email:
          accountEmail,
        is_active:
          true,
      })
      .eq(
        "id",
        canonicalEmailParticipant.id
      );

    if (claimError) {
      console.error(
        "PARTICIPANT_ACCOUNT_CLAIM_FAILED",
        {
          collectionId:
            collection.id,
          participantId:
            canonicalEmailParticipant.id,
          errorCode:
            claimError.code,
        }
      );

      joinError(
        joinCode,
        "join_failed"
      );
    }

    await logCollectionActivity({
      collectionId:
        collection.id,
      organizationId:
        collection.organization_id,
      actorUserId:
        signedInUserId,
      actorType:
        "user",
      eventType:
        "participant.account_linked",
      subjectType:
        "participant",
      subjectId:
        canonicalEmailParticipant.id,
      subjectLabel:
        fullName,
      description:
        `${fullName}'s existing participant record was linked to their Threeple account.`,
      metadata: {
        linking_method:
          "authenticated_email",
      },
    });

    redirect(
      `/my-collections/${canonicalEmailParticipant.id}`
    );
  }

  const { blocked: organizationParticipationBlocked } =
    await getOrganizationParticipationRestriction(collection.organization_id);

  if (organizationParticipationBlocked) {
    redirect(`/join/restricted?code=${encodeURIComponent(joinCode)}`);
  }

  let expectedAmount: number | null = null;

  if (
    collection.collection_mode === "fixed_per_person" ||
    collection.collection_mode === "event_fee"
  ) {
    expectedAmount =
      collection.default_amount !== null ? Number(collection.default_amount) : null;
  }

  if (
    collection.collection_mode === "target" ||
    collection.collection_mode === "flexible"
  ) {
    if (requestedAmount === null) joinError(joinCode, "amount_required");
    expectedAmount = requestedAmount;
  }

  if (
    collection.collection_mode === "recurring_dues" ||
    collection.collection_mode === "rotating_pool"
  ) {
    expectedAmount = null;
  }

  const participationStatus = collection.requires_approval
    ? "approval_pending"
    : "joined";

  const { data: participant, error: participantError } = await supabaseAdmin
    .from("participants")
    .insert({
      collection_id: collection.id,
      user_id: signedInUserId,
      full_name: fullName,
      email: accountEmail,
      phone: phone || null,
      expected_amount: expectedAmount,
      participation_status: participationStatus,
      join_method: "code",
      is_active: true,
    })
    .select("id")
    .single();

  if (participantError || !participant) {
    console.error("PARTICIPANT_JOIN_FAILED", {
      collectionId: collection.id,
      errorCode: participantError?.code,
    });

    if (
      participantError?.message
        ?.toLowerCase()
        .includes(
          "collection is full"
        )
    ) {
      joinError(
        joinCode,
        "collection_full"
      );
    }

    joinError(
      joinCode,
      "join_failed"
    );
  }

  await logCollectionActivity({
    collectionId: collection.id,
    organizationId: collection.organization_id,
    actorUserId: signedInUserId,
    actorType: "user",
    eventType: "participant.joined",
    subjectType: "participant",
    subjectId: participant.id,
    subjectLabel: fullName,
    description: `${fullName} joined ${collection.title}.`,
    metadata: {
      join_method: "code",
      participation_status: participationStatus,
      account_linked: true,
    },
  });

  redirect(`/my-collections/${participant.id}`);
}


