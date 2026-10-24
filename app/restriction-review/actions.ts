"use server";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

function cleanValue(
  formData: FormData,
  key: string
) {
  return String(
    formData.get(key) ?? ""
  ).trim();
}

function reviewUrl(
  scope: string,
  subjectId: string,
  type: string,
  result: string
): string {
  const params =
    new URLSearchParams();

  if (scope) {
    params.set(
      "scope",
      scope
    );
  }

  if (subjectId) {
    params.set(
      "subjectId",
      subjectId
    );
  }

  if (type) {
    params.set(
      "type",
      type
    );
  }

  if (result) {
    params.set(
      "result",
      result
    );
  }

  return `/restriction-review?${params.toString()}`;
}

export async function submitRestrictionReviewRequest(
  formData: FormData
) {
  const supabase =
    await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (
    claimsError ||
    !userId
  ) {
    redirect(
      "/auth/login"
    );
  }

  const requestedScope =
    cleanValue(
      formData,
      "restriction_scope"
    );

  const suppliedSubjectId =
    cleanValue(
      formData,
      "restriction_subject_id"
    );

  const requestedType =
    cleanValue(
      formData,
      "restriction_type"
    );

  const message =
    cleanValue(
      formData,
      "message"
    );

  const allowedScopes = [
    "user",
    "organization",
    "collection",
  ];

  if (
    !allowedScopes.includes(
      requestedScope
    ) ||
    !requestedType
  ) {
    redirect(
      reviewUrl(
        requestedScope,
        suppliedSubjectId,
        requestedType,
        "invalid_request"
      )
    );
  }

  if (
    message.length < 20
  ) {
    redirect(
      reviewUrl(
        requestedScope,
        suppliedSubjectId,
        requestedType,
        "message_required"
      )
    );
  }

  let verifiedSubjectId =
    suppliedSubjectId;

  // =======================================================
  // USER SCOPE
  //
  // Never trust a browser-supplied user subject ID.
  // The authenticated user is always the subject.
  // =======================================================

  if (
    requestedScope ===
    "user"
  ) {
    verifiedSubjectId =
      userId;
  }

  // =======================================================
  // ORGANIZATION OWNERSHIP
  // =======================================================

  if (
    requestedScope ===
    "organization"
  ) {
    const {
      data: organization,
      error:
        organizationError,
    } = await supabaseAdmin
      .from(
        "organizations"
      )
      .select(`
        id,
        owner_id
      `)
      .eq(
        "id",
        verifiedSubjectId
      )
      .maybeSingle();

    if (
      organizationError ||
      !organization ||
      organization.owner_id !==
        userId
    ) {
      redirect(
        reviewUrl(
          requestedScope,
          verifiedSubjectId,
          requestedType,
          "invalid_request"
        )
      );
    }
  }

  // =======================================================
  // COLLECTION OWNERSHIP THROUGH ORGANIZATION
  // =======================================================

  if (
    requestedScope ===
    "collection"
  ) {
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
        organization_id
      `)
      .eq(
        "id",
        verifiedSubjectId
      )
      .maybeSingle();

    if (
      collectionError ||
      !collection ||
      !collection.organization_id
    ) {
      redirect(
        reviewUrl(
          requestedScope,
          verifiedSubjectId,
          requestedType,
          "invalid_request"
        )
      );
    }

    const {
      data: organization,
      error:
        organizationError,
    } = await supabaseAdmin
      .from(
        "organizations"
      )
      .select(`
        id,
        owner_id
      `)
      .eq(
        "id",
        collection.organization_id
      )
      .maybeSingle();

    if (
      organizationError ||
      !organization ||
      organization.owner_id !==
        userId
    ) {
      redirect(
        reviewUrl(
          requestedScope,
          verifiedSubjectId,
          requestedType,
          "invalid_request"
        )
      );
    }
  }

  // =======================================================
  // VERIFY ACTIVE RESTRICTION
  // =======================================================

  let activeRestrictionId:
    | string
    | null = null;

  if (
    requestedScope ===
    "user"
  ) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "user_restrictions"
      )
      .select("id")
      .eq(
        "user_id",
        verifiedSubjectId
      )
      .eq(
        "restriction_type",
        requestedType
      )
      .is(
        "lifted_at",
        null
      )
      .order(
        "imposed_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "REVIEW_USER_RESTRICTION_LOOKUP_FAILED",
        error
      );
    }

    activeRestrictionId =
      data?.id ?? null;
  }

  if (
    requestedScope ===
    "organization"
  ) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "organization_restrictions"
      )
      .select("id")
      .eq(
        "organization_id",
        verifiedSubjectId
      )
      .eq(
        "restriction_type",
        requestedType
      )
      .is(
        "lifted_at",
        null
      )
      .order(
        "imposed_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "REVIEW_ORGANIZATION_RESTRICTION_LOOKUP_FAILED",
        error
      );
    }

    activeRestrictionId =
      data?.id ?? null;
  }

  if (
    requestedScope ===
    "collection"
  ) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "collection_restrictions"
      )
      .select("id")
      .eq(
        "collection_id",
        verifiedSubjectId
      )
      .eq(
        "restriction_type",
        requestedType
      )
      .is(
        "lifted_at",
        null
      )
      .order(
        "imposed_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "REVIEW_COLLECTION_RESTRICTION_LOOKUP_FAILED",
        error
      );
    }

    activeRestrictionId =
      data?.id ?? null;
  }

  if (!activeRestrictionId) {
    redirect(
      reviewUrl(
        requestedScope,
        verifiedSubjectId,
        requestedType,
        "restriction_not_active"
      )
    );
  }

  // =======================================================
  // PREVENT DUPLICATE PENDING REVIEW REQUESTS
  // =======================================================

  const {
    data:
      existingRequest,
    error:
      existingRequestError,
  } = await supabaseAdmin
    .from(
      "restriction_review_requests"
    )
    .select("id")
    .eq(
      "requester_user_id",
      userId
    )
    .eq(
      "restriction_scope",
      requestedScope
    )
    .eq(
      "restriction_subject_id",
      verifiedSubjectId
    )
    .eq(
      "restriction_type",
      requestedType
    )
    .in(
      "status",
      [
        "submitted",
        "under_review",
      ]
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (
    existingRequestError
  ) {
    console.error(
      "RESTRICTION_REVIEW_DUPLICATE_LOOKUP_FAILED",
      existingRequestError
    );

    redirect(
      reviewUrl(
        requestedScope,
        verifiedSubjectId,
        requestedType,
        "submit_failed"
      )
    );
  }

  if (existingRequest) {
    redirect(
      "/restriction-review/status?result=already_submitted"
    );
  }

  // =======================================================
  // INSERT REVIEW REQUEST
  // =======================================================

  const {
    error: insertError,
  } = await supabaseAdmin
    .from(
      "restriction_review_requests"
    )
    .insert({
      requester_user_id:
        userId,

      restriction_scope:
        requestedScope,

      restriction_subject_id:
        verifiedSubjectId,

      restriction_type:
        requestedType,

      message,

      status:
        "submitted",
    });

  if (insertError) {
    console.error(
      "RESTRICTION_REVIEW_INSERT_FAILED",
      insertError
    );

    redirect(
      reviewUrl(
        requestedScope,
        verifiedSubjectId,
        requestedType,
        "submit_failed"
      )
    );
  }

  redirect(
    "/restriction-review/status?result=submitted"
  );
}
