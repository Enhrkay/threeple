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

  if (scope) params.set("scope", scope);
  if (subjectId) params.set("subjectId", subjectId);
  if (type) params.set("type", type);
  if (result) params.set("result", result);

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

  if (
    ![
      "user",
      "organization",
      "collection",
    ].includes(
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

  if (
    requestedScope ===
    "user"
  ) {
    verifiedSubjectId =
      userId;
  }

  if (
    requestedScope ===
    "organization"
  ) {
    const {
      data: organization,
    } = await supabaseAdmin
      .from("organizations")
      .select("id, owner_id")
      .eq(
        "id",
        verifiedSubjectId
      )
      .maybeSingle();

    if (
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

  if (
    requestedScope ===
    "collection"
  ) {
    const {
      data: collection,
    } = await supabaseAdmin
      .from("collections")
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
    } = await supabaseAdmin
      .from("organizations")
      .select("id, owner_id")
      .eq(
        "id",
        collection.organization_id
      )
      .maybeSingle();

    if (
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

  let restriction:
    | {
        id: string;
        trust_safety_report_id:
          | string
          | null;
      }
    | null = null;

  if (
    requestedScope ===
    "user"
  ) {
    const { data } =
      await supabaseAdmin
        .from(
          "user_restrictions"
        )
        .select(`
          id,
          trust_safety_report_id
        `)
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

    restriction =
      data ?? null;
  }

  if (
    requestedScope ===
    "organization"
  ) {
    const { data } =
      await supabaseAdmin
        .from(
          "organization_restrictions"
        )
        .select(`
          id,
          trust_safety_report_id
        `)
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

    restriction =
      data ?? null;
  }

  if (
    requestedScope ===
    "collection"
  ) {
    const { data } =
      await supabaseAdmin
        .from(
          "collection_restrictions"
        )
        .select(`
          id,
          trust_safety_report_id
        `)
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

    restriction =
      data ?? null;
  }

  if (!restriction) {
    redirect(
      reviewUrl(
        requestedScope,
        verifiedSubjectId,
        requestedType,
        "restriction_not_active"
      )
    );
  }

  const {
    data: existingRequest,
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
      "restriction_id",
      restriction.id
    )
    .in(
      "status",
      [
        "submitted",
        "under_review",
      ]
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

  if (
    existingRequest
  ) {
    redirect(
      `/restriction-review/status?requestId=${existingRequest.id}&result=already_submitted`
    );
  }

  const {
    data: inserted,
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

      restriction_id:
        restriction.id,

      trust_safety_report_id:
        restriction.trust_safety_report_id,

      restriction_type:
        requestedType,

      message,

      status:
        "submitted",
    })
    .select("id")
    .single();

  if (
    insertError ||
    !inserted
  ) {
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
    `/restriction-review/status?requestId=${inserted.id}&result=submitted`
  );
}
