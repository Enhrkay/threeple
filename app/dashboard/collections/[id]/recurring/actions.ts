import {
  redirect,
} from "next/navigation";

import {
  revalidatePath,
} from "next/cache";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

async function requireManager(
  collectionId: string
) {
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
        `/dashboard/collections/${collectionId}/recurring`
      )}`
    );
  }

  const {
    data: collection,
  } =
    await supabaseAdmin
      .from("collections")
      .select(`
        id,
        organization_id,
        collection_mode
      `)
      .eq("id", collectionId)
      .maybeSingle();

  if (
    !collection ||
    collection.collection_mode !==
      "recurring_dues"
  ) {
    redirect(
      `/dashboard/collections/${collectionId}`
    );
  }

  const {
    data: organization,
  } =
    await supabaseAdmin
      .from("organizations")
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
    organization?.owner_id ===
    userId
  ) {
    return {
      userId,
      collection,
    };
  }

  const {
    data: membership,
  } =
    await supabaseAdmin
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
      .maybeSingle();

  if (
    membership?.role !==
      "admin" &&
    membership?.role !==
      "treasurer"
  ) {
    redirect(
      `/dashboard/collections/${collectionId}`
    );
  }

  return {
    userId,
    collection,
  };
}

function fail(
  collectionId: string,
  code: string
): never {
  redirect(
    `/dashboard/collections/${collectionId}/recurring?error=${encodeURIComponent(
      code
    )}`
  );
}

export async function saveRecurringSettings(
  formData: FormData
) {
  "use server";

  const collectionId =
    String(
      formData.get(
        "collection_id"
      ) ?? ""
    ).trim();

  if (!collectionId) {
    redirect("/dashboard");
  }

  await requireManager(
    collectionId
  );

  const frequency =
    String(
      formData.get(
        "frequency"
      ) ?? ""
    ).trim();

  const contributionAmount =
    Number(
      formData.get(
        "contribution_amount"
      )
    );

  const startDate =
    String(
      formData.get(
        "start_date"
      ) ?? ""
    ).trim();

  const dueDayOfMonthRaw =
    String(
      formData.get(
        "due_day_of_month"
      ) ?? ""
    ).trim();

  const cyclesToGenerate =
    Number(
      formData.get(
        "cycles_to_generate"
      )
    );

  const graceDays =
    Number(
      formData.get(
        "grace_days"
      )
    );

  if (
    frequency !== "weekly" &&
    frequency !== "monthly"
  ) {
    fail(
      collectionId,
      "invalid_frequency"
    );
  }

  if (
    !Number.isFinite(
      contributionAmount
    ) ||
    contributionAmount <= 0
  ) {
    fail(
      collectionId,
      "invalid_amount"
    );
  }

  if (!startDate) {
    fail(
      collectionId,
      "start_date_required"
    );
  }

  if (
    !Number.isInteger(
      cyclesToGenerate
    ) ||
    cyclesToGenerate < 1 ||
    cyclesToGenerate > 60
  ) {
    fail(
      collectionId,
      "invalid_cycles"
    );
  }

  const dueDayOfMonth =
    frequency === "monthly"
      ? Number(
          dueDayOfMonthRaw ||
            new Date(
              `${startDate}T00:00:00`
            ).getDate()
        )
      : null;

  if (
    dueDayOfMonth !== null &&
    (
      !Number.isInteger(
        dueDayOfMonth
      ) ||
      dueDayOfMonth < 1 ||
      dueDayOfMonth > 28
    )
  ) {
    fail(
      collectionId,
      "invalid_due_day"
    );
  }

  const {
    data: existing,
  } =
    await supabaseAdmin
      .from(
        "recurring_settings"
      )
      .select(`
        id,
        schedule_locked
      `)
      .eq(
        "collection_id",
        collectionId
      )
      .maybeSingle();

  if (
    existing?.schedule_locked
  ) {
    fail(
      collectionId,
      "schedule_locked"
    );
  }

  const payload = {
    collection_id:
      collectionId,
    frequency,
    interval_count: 1,
    contribution_amount:
      contributionAmount,
    start_date:
      startDate,
    due_day_of_week:
      null,
    due_day_of_month:
      dueDayOfMonth,
    grace_days:
      Number.isFinite(
        graceDays
      )
        ? Math.max(
            0,
            Math.floor(
              graceDays
            )
          )
        : 0,
    cycles_to_generate:
      cyclesToGenerate,
    updated_at:
      new Date().toISOString(),
  };

  const {
    error,
  } =
    await supabaseAdmin
      .from(
        "recurring_settings"
      )
      .upsert(
        payload,
        {
          onConflict:
            "collection_id",
        }
      );

  if (error) {
    console.error(
      "SAVE_RECURRING_SETTINGS_FAILED",
      error
    );

    fail(
      collectionId,
      "save_failed"
    );
  }

  revalidatePath(
    `/dashboard/collections/${collectionId}/recurring`
  );

  redirect(
    `/dashboard/collections/${collectionId}/recurring?saved=1`
  );
}

export async function generateRecurringSchedule(
  formData: FormData
) {
  "use server";

  const collectionId =
    String(
      formData.get(
        "collection_id"
      ) ?? ""
    ).trim();

  if (!collectionId) {
    redirect("/dashboard");
  }

  await requireManager(
    collectionId
  );

  const {
    error,
  } =
    await supabaseAdmin.rpc(
      "generate_recurring_schedule",
      {
        p_collection_id:
          collectionId,
      }
    );

  if (error) {
    console.error(
      "GENERATE_RECURRING_SCHEDULE_FAILED",
      error
    );

    fail(
      collectionId,
      "generate_failed"
    );
  }

  revalidatePath(
    `/dashboard/collections/${collectionId}/recurring`
  );

  redirect(
    `/dashboard/collections/${collectionId}/recurring?generated=1`
  );
}

