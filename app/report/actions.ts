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

const PUBLIC_CATEGORIES = [
  "fraud_suspicion",
  "misleading_collection",
  "harassment",
  "impersonation",
  "unauthorized_collection",
  "abusive_content",
  "privacy_concern",
  "spam",
  "other",
] as const;

type PublicCategory =
  (typeof PUBLIC_CATEGORIES)[number];

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

function validEmail(
  email: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function reportError(
  code: string,
  message: string
): never {
  const params =
    new URLSearchParams();

  if (code) {
    params.set(
      "code",
      code
    );
  }

  params.set(
    "error",
    message
  );

  redirect(
    `/report?${params.toString()}`
  );
}

// =========================================================
// SUBMIT REPORT
// =========================================================

export async function submitTrustSafetyReport(
  formData: FormData
) {
  const joinCode =
    value(
      formData,
      "join_code"
    ).toUpperCase();

  const submittedName =
    value(
      formData,
      "reporter_name"
    );

  const submittedEmail =
    cleanEmail(
      value(
        formData,
        "reporter_email"
      )
    );

  const category =
    value(
      formData,
      "category"
    ) as PublicCategory;

  const description =
    value(
      formData,
      "description"
    );

  // Simple bot honeypot.
  const website =
    value(
      formData,
      "website"
    );

  if (website) {
    redirect(
      "/report?success=1"
    );
  }

  if (!joinCode) {
    reportError(
      "",
      "Enter the Threeple Code for the Collection you want to report."
    );
  }

  if (
    !PUBLIC_CATEGORIES.includes(
      category
    )
  ) {
    reportError(
      joinCode,
      "Select a valid report category."
    );
  }

  if (
    description.length < 20
  ) {
    reportError(
      joinCode,
      "Please provide at least 20 characters describing the concern."
    );
  }

  if (
    description.length > 4000
  ) {
    reportError(
      joinCode,
      "Your description is too long. Please keep it under 4,000 characters."
    );
  }

  if (
    submittedEmail &&
    !validEmail(
      submittedEmail
    )
  ) {
    reportError(
      joinCode,
      "Enter a valid email address."
    );
  }

  // =======================================================
  // AUTHENTICATED REPORTER — OPTIONAL
  // =======================================================

  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub ??
    null;

  const accountEmail =
    typeof claimsData
      ?.claims?.email ===
      "string"
      ? cleanEmail(
          claimsData.claims.email
        )
      : null;

  let reporterName =
    submittedName ||
    null;

  let reporterEmail =
    submittedEmail ||
    null;

  if (userId) {
    const {
      data: profile,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        full_name
      `)
      .eq(
        "id",
        userId
      )
      .maybeSingle();

    reporterName =
      profile?.full_name ||
      submittedName ||
      null;

    reporterEmail =
      accountEmail ||
      submittedEmail ||
      null;
  }

  // =======================================================
  // COLLECTION VALIDATION
  //
  // The browser does not supply the Collection UUID.
  // Threeple resolves it from the Threeple Code.
  // =======================================================

  const {
    data: collection,
    error: collectionError,
  } = await supabaseAdmin
    .from("collections")
    .select(`
      id,
      organization_id,
      title,
      join_code,
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
    reportError(
      joinCode,
      "We could not find a Collection with that Threeple Code."
    );
  }

  // =======================================================
  // CREATE TRUST & SAFETY CASE
  //
  // Public reporters do NOT choose priority.
  // New cases begin at normal priority and open status.
  // =======================================================

  const {
    data: report,
    error: reportInsertError,
  } = await supabaseAdmin
    .from(
      "trust_safety_reports"
    )
    .insert({
      reporter_user_id:
        userId,

      reporter_name:
        reporterName,

      reporter_email:
        reporterEmail,

      subject_type:
        "collection",

      subject_id:
        collection.id,

      collection_id:
        collection.id,

      category,

      priority:
        "normal",

      status:
        "open",

      description,

      metadata: {
        source:
          "public_report_form",

        collection_title:
          collection.title,

        collection_status:
          collection.status,

        collection_archived:
          Boolean(
            collection.archived_at
          ),
      },
    })
    .select(`
      id,
      report_reference
    `)
    .single();

  if (
    reportInsertError ||
    !report
  ) {
    console.error(
      "TRUST_SAFETY_REPORT_CREATE_FAILED",
      {
        collectionId:
          collection.id,

        errorCode:
          reportInsertError?.code,
      }
    );

    reportError(
      joinCode,
      "Threeple could not submit your report. Please try again."
    );
  }

  // =======================================================
  // SUCCESS
  // =======================================================

  redirect(
    `/report?submitted=${encodeURIComponent(
      report.report_reference
    )}`
  );
}