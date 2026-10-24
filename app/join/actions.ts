"use server";

import {

  getCollectionJoinRestriction,

} from "@/lib/restrictions/server";

import {

  getUserParticipationRestriction,

} from "@/lib/restrictions/user-server";

import {

  getOrganizationParticipationRestriction,

} from "@/lib/restrictions/organization-server";

import {

  redirect,

} from "next/navigation";

import {

  createClient,

} from "@/lib/supabase/server";

import {

  supabaseAdmin,

} from "@/lib/supabase/admin";

import {

  logCollectionActivity,

} from "@/lib/activity/server";

// =========================================================

// HELPERS

// =========================================================

function value(

  formData: FormData,

  key: string

) {

  return String(

    formData.get(key) ?? ""

  ).trim();

}

function cleanEmail(

  email: string

) {

  return email

    .trim()

    .toLowerCase();

}

function cleanPhone(

  phone: string

) {

  return phone

    .trim()

    .replace(/\s+/g, "");

}

function validEmail(
  email: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function parseAmount(

  raw: string

) {

  if (!raw) {

    return null;

  }

  const amount =

    Number(raw);

  if (

    !Number.isFinite(amount) ||

    amount <= 0

  ) {

    return null;

  }

  return (

    Math.round(

      amount * 100

    ) / 100

  );

}

function joinError(

  joinCode: string,

  errorCode: string

): never {

  redirect(

    `/join?code=${encodeURIComponent(

      joinCode

    )}&error=${encodeURIComponent(

      errorCode

    )}`

  );

}

// =========================================================

// JOIN COLLECTION

// =========================================================

export async function joinCollection(

  formData: FormData

) {

  const joinCode =

    value(

      formData,

      "join_code"

    ).toUpperCase();

  const fullName =

    value(

      formData,

      "full_name"

    );

  const submittedEmail =

    cleanEmail(

      value(

        formData,

        "email"

      )

    );

  const phone =

    cleanPhone(

      value(

        formData,

        "phone"

      )

    );

  const requestedAmount =

    parseAmount(

      value(

        formData,

        "contribution_amount"

      )

    );

  // =======================================================

  // BASIC VALIDATION

  // =======================================================

  if (!joinCode) {

    joinError(

      "",

      "collection_unavailable"

    );

  }

  if (

    fullName.length < 2

  ) {

    joinError(

      joinCode,

      "invalid_name"

    );

  }

  if (

    submittedEmail &&

    !validEmail(

      submittedEmail

    )

  ) {

    joinError(

      joinCode,

      "invalid_email"

    );

  }

  if (

    !submittedEmail &&

    !phone

  ) {

    joinError(

      joinCode,

      "contact_required"

    );

  }

  // =======================================================

  // AUTHENTICATED ACCOUNT — OPTIONAL

  // =======================================================

  const supabase =

    await createClient();

  const {

    data: claimsData,

  } =

    await supabase.auth.getClaims();

  const signedInUserId =

    claimsData?.claims?.sub ??

    null;

  const accountEmail =

    typeof claimsData

      ?.claims?.email ===

      "string"

      ? cleanEmail(

          claimsData.claims.email

        )

      : "";

  // =======================================================

  // SAFE ACCOUNT LINKING

  //

  // A participant is linked to a Threeple account only when

  // the email explicitly submitted by the participant

  // matches the authenticated account email.

  //

  // We NEVER silently replace the submitted email with the

  // authenticated account email.

  // =======================================================

  const canLinkAccount =

    Boolean(

      signedInUserId &&

      accountEmail &&

      submittedEmail &&

      submittedEmail ===

        accountEmail

    );

  const participantUserId =

    canLinkAccount

      ? signedInUserId

      : null;

  const email =

    submittedEmail;

  // =======================================================

  // COLLECTION

  // =======================================================

  const {

    data: collection,

    error:

      collectionError,

  } = await supabaseAdmin

    .from(

      "collections"

    )

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

    .eq(

      "join_code",

      joinCode

    )

    .maybeSingle();

  if (

    collectionError ||

    !collection

  ) {

    joinError(

      joinCode,

      "collection_unavailable"

    );

  }

  // =======================================================

  // COLLECTION AVAILABILITY

  // =======================================================

  // EXISTING PARTICIPANT LINKED TO THIS ACCOUNT

  //

  // Only applies when the submitted email matches the

  // authenticated account email.

  // =======================================================

  if (

    participantUserId

  ) {

    const {

      data:

        existingUserParticipant,

    } = await supabaseAdmin

      .from(

        "participants"

      )

      .select(`

        id,

        is_active

      `)

      .eq(

        "collection_id",

        collection.id

      )

      .eq(

        "user_id",

        participantUserId

      )

      .eq(

        "is_active",

        true

      )

      .maybeSingle();

    if (

      existingUserParticipant

    ) {

      redirect(

        `/my-collections/${existingUserParticipant.id}`

      );

    }

  }

    // =======================================================

  // USER PARTICIPATION RESTRICTION

  //

  // Existing participation is preserved because the

  // existing-user check runs before this block.

  //

  // A restricted authenticated account cannot bypass the

  // restriction by entering another email and joining as

  // an unlinked guest.

  // =======================================================

  if (

    signedInUserId

  ) {

    const {

      blocked:

        userParticipationBlocked,

    } =

      await getUserParticipationRestriction(

        signedInUserId

      );

    if (

      userParticipationBlocked

    ) {

      redirect(

        `/join/account-restricted?code=${encodeURIComponent(

          joinCode

        )}`

      );

    }

  }

// =======================================================

  if (

    collection.status !==

      "active" ||

    collection.archived_at

  ) {

    joinError(

      joinCode,

      "collection_unavailable"

    );

  }

  // =======================================================

  // PLATFORM JOIN RESTRICTION

  //

  // Must happen before account linking or participant

  // creation.

  // =======================================================

  const {

    blocked:

      joiningBlocked,

  } =

    await getCollectionJoinRestriction(

      collection.id

    );

  if (

    joiningBlocked

  ) {

    redirect(

      `/join/restricted?code=${encodeURIComponent(

        joinCode

      )}`

    );

  }

  // =======================================================

  // EXISTING GUEST PARTICIPANT → SAFE ACCOUNT LINK

  //

  // Only link when:

  // 1. user is authenticated

  // 2. submitted email matches account email

  // 3. existing guest row has that same email

  // 4. existing row is not already linked

  // =======================================================

  if (

    participantUserId &&

    accountEmail

  ) {

    const {

      data:

        existingGuestParticipant,

    } = await supabaseAdmin

      .from(

        "participants"

      )

      .select(`

        id,

        full_name,

        user_id,

        is_active

      `)

      .eq(

        "collection_id",

        collection.id

      )

      .ilike(

        "email",

        accountEmail

      )

      .is(

        "user_id",

        null

      )

      .eq(

        "is_active",

        true

      )

      .maybeSingle();

    if (

      existingGuestParticipant

    ) {

      const {

        error:

          linkError,

      } = await supabaseAdmin

        .from(

          "participants"

        )

        .update({

          user_id:

            participantUserId,

        })

        .eq(

          "id",

          existingGuestParticipant.id

        )

        .is(

          "user_id",

          null

        );

      if (

        linkError

      ) {

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

          participantUserId,

        actorType:

          "user",

        eventType:

          "participant.account_linked",

        subjectType:

          "participant",

        subjectId:

          existingGuestParticipant.id,

        subjectLabel:

          existingGuestParticipant.full_name,

        description:

          `${existingGuestParticipant.full_name}'s existing participant record was linked to their Threeple account.`,

        metadata: {

          linking_method:

            "authenticated_email",

        },

      });

      redirect(

        `/my-collections/${existingGuestParticipant.id}`

      );

    }

  }

  // =======================================================

  // ORGANIZATION-LEVEL PARTICIPATION RESTRICTION

  //

  // full_organization blocks NEW participation across

  // every Collection owned by this organization.

  //

  // Existing linked participants and safe guest-account

  // linking are handled above, so historical access is

  // preserved.

  // =======================================================

  const {

    blocked:

      organizationParticipationBlocked,

  } =

    await getOrganizationParticipationRestriction(

      collection.organization_id

    );

  if (

    organizationParticipationBlocked

  ) {

    redirect(

      `/join/restricted?code=${encodeURIComponent(

        joinCode

      )}`

    );

  }

  // =======================================================

  // DUPLICATE EMAIL

  //

  // Uses ONLY the email submitted in the join form.

  // =======================================================

  if (email) {

    const {

      data:

        duplicateEmail,

      error:

        duplicateEmailError,

    } = await supabaseAdmin

      .from(

        "participants"

      )

      .select(`

        id

      `)

      .eq(

        "collection_id",

        collection.id

      )

      .ilike(

        "email",

        email

      )

      .eq(

        "is_active",

        true

      )

      .limit(1)

      .maybeSingle();

    if (

      duplicateEmailError

    ) {

      console.error(

        "PARTICIPANT_EMAIL_CHECK_FAILED",

        {

          collectionId:

            collection.id,

          errorCode:

            duplicateEmailError.code,

        }

      );

      joinError(

        joinCode,

        "join_failed"

      );

    }

    if (

      duplicateEmail

    ) {

      joinError(

        joinCode,

        "already_joined"

      );

    }

  }

  // =======================================================

  // DUPLICATE PHONE

  //

  // Runs only when a phone number was actually submitted.

  // =======================================================

  if (phone) {

    const {

      data:

        duplicatePhone,

      error:

        duplicatePhoneError,

    } = await supabaseAdmin

      .from(

        "participants"

      )

      .select(`

        id

      `)

      .eq(

        "collection_id",

        collection.id

      )

      .eq(

        "phone",

        phone

      )

      .eq(

        "is_active",

        true

      )

      .limit(1)

      .maybeSingle();

    if (

      duplicatePhoneError

    ) {

      console.error(

        "PARTICIPANT_PHONE_CHECK_FAILED",

        {

          collectionId:

            collection.id,

          errorCode:

            duplicatePhoneError.code,

        }

      );

      joinError(

        joinCode,

        "join_failed"

      );

    }

    if (

      duplicatePhone

    ) {

      joinError(

        joinCode,

        "already_joined"

      );

    }

  }

  // =======================================================

  // EXPECTED AMOUNT

  // =======================================================

  let expectedAmount:

    | number

    | null =

    null;

  if (

    collection.collection_mode ===

      "fixed_per_person" ||

    collection.collection_mode ===

      "event_fee"

  ) {

    expectedAmount =

      collection.default_amount !==

      null

        ? Number(

            collection.default_amount

          )

        : null;

  }

  if (

    collection.collection_mode ===

      "target" ||

    collection.collection_mode ===

      "flexible"

  ) {

    if (

      requestedAmount !==

      null

    ) {

      expectedAmount =

        requestedAmount;

    } else {

      joinError(

        joinCode,

        "amount_required"

      );

    }

  }

  if (

    collection.collection_mode ===

      "recurring_dues" ||

    collection.collection_mode ===

      "rotating_pool"

  ) {

    expectedAmount =

      null;

  }

  // =======================================================

  // PARTICIPATION STATUS

  // =======================================================

  const participationStatus =

    collection.requires_approval

      ? "approval_pending"

      : "joined";

  // =======================================================

  // CREATE PARTICIPANT

  // =======================================================

  const {

    data: participant,

    error:

      participantError,

  } = await supabaseAdmin

    .from(

      "participants"

    )

    .insert({

      collection_id:

        collection.id,

      user_id:

        participantUserId,

      full_name:

        fullName,

      email:

        email || null,

      phone:

        phone || null,

      expected_amount:

        expectedAmount,

      participation_status:

        participationStatus,

      join_method:

        "code",

      is_active:

        true,

    })

    .select(`

      id

    `)

    .single();

  if (

    participantError ||

    !participant

  ) {

    console.error(

      "PARTICIPANT_JOIN_FAILED",

      {

        collectionId:

          collection.id,

        errorCode:

          participantError?.code,

      }

    );

    joinError(

      joinCode,

      "join_failed"

    );

  }

  // =======================================================

  // ACTIVITY LOG

  // =======================================================

  await logCollectionActivity({

    collectionId:

      collection.id,

    organizationId:

      collection.organization_id,

    actorUserId:

      participantUserId,

    actorType:

      participantUserId

        ? "user"

        : "system",

    eventType:

      "participant.joined",

    subjectType:

      "participant",

    subjectId:

      participant.id,

    subjectLabel:

      fullName,

    description:

      `${fullName} joined ${collection.title}.`,

    metadata: {

      join_method:

        "code",

      participation_status:

        participationStatus,

      account_linked:

        Boolean(

          participantUserId

        ),

    },

  });

  // =======================================================

  // SUCCESS REDIRECT

  // =======================================================

  if (

    participantUserId

  ) {

    redirect(

      `/my-collections/${participant.id}`

    );

  }

  redirect(

    `/join/success?collection=${encodeURIComponent(

      collection.title

    )}&status=${encodeURIComponent(

      participationStatus

    )}`

  );

}