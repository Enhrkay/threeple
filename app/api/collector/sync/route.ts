import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

type SyncPayload = {
  device_event_id?: string;
  receipt_reference?: string;
  collection_id?: string;
  participant_id?: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  local_recorded_at?: string;
  note?: string | null;
};

const allowedMethods =
  new Set([
    "cash",
    "bank_transfer_manual",
    "pos_manual",
    "other_manual",
  ]);

export async function POST(
  request: Request
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
    return NextResponse.json(
      {
        error:
          "Authentication required.",
      },
      {
        status: 401,
      }
    );
  }

  let body:
    | SyncPayload
    | null = null;

  try {
    body =
      await request.json();
  }
  catch {
    return NextResponse.json(
      {
        error:
          "Invalid sync payload.",
      },
      {
        status: 400,
      }
    );
  }

  const deviceEventId =
    String(
      body?.device_event_id ??
        ""
    ).trim();

  const receiptReference =
    String(
      body?.receipt_reference ??
        ""
    ).trim();

  const collectionId =
    String(
      body?.collection_id ??
        ""
    ).trim();

  const participantId =
    String(
      body?.participant_id ??
        ""
    ).trim();

  const paymentMethod =
    String(
      body?.payment_method ??
        ""
    ).trim();

  const amount =
    Number(
      body?.amount
    );

  if (
    !deviceEventId ||
    !receiptReference ||
    !collectionId ||
    !participantId ||
    !Number.isFinite(
      amount
    ) ||
    amount <= 0 ||
    !allowedMethods.has(
      paymentMethod
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Field event is incomplete.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data: collection,
  } = await supabaseAdmin
    .from("collections")
    .select(`
      id,
      organization_id,
      currency,
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
    return NextResponse.json(
      {
        error:
          "Collection is unavailable.",
      },
      {
        status: 409,
      }
    );
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
    return NextResponse.json(
      {
        error:
          "Organization unavailable.",
      },
      {
        status: 404,
      }
    );
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
    return NextResponse.json(
      {
        error:
          "Collector access denied.",
      },
      {
        status: 403,
      }
    );
  }

  const {
    data: participant,
  } = await supabaseAdmin
    .from("participants")
    .select(`
      id
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
    return NextResponse.json(
      {
        error:
          "Participant unavailable.",
      },
      {
        status: 409,
      }
    );
  }

  const {
    data: existing,
  } = await supabaseAdmin
    .from(
      "field_contribution_events"
    )
    .select(`
      id,
      receipt_reference,
      lifecycle_status,
      server_synced_at
    `)
    .eq(
      "collector_user_id",
      userId
    )
    .eq(
      "device_event_id",
      deviceEventId
    )
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      idempotent: true,
      event_id:
        existing.id,
      receipt_reference:
        existing.receipt_reference,
      lifecycle_status:
        existing.lifecycle_status,
      server_synced_at:
        existing.server_synced_at,
    });
  }

  const parsedLocalTime =
    body?.local_recorded_at
      ? new Date(
          body.local_recorded_at
        )
      : new Date();

  const safeLocalTime =
    Number.isNaN(
      parsedLocalTime.getTime()
    )
      ? new Date()
      : parsedLocalTime;

  const now =
    new Date().toISOString();

  const {
    data: inserted,
    error,
  } = await supabaseAdmin
    .from(
      "field_contribution_events"
    )
    .insert({
      device_event_id:
        deviceEventId,
      receipt_reference:
        receiptReference,
      collection_id:
        collectionId,
      participant_id:
        participantId,
      collector_user_id:
        userId,
      amount:
        Math.round(
          amount * 100
        ) / 100,
      currency:
        collection.currency,
      payment_method:
        paymentMethod,
      lifecycle_status:
        "synced",
      local_recorded_at:
        safeLocalTime.toISOString(),
      server_synced_at:
        now,
      note:
        body?.note ||
        null,
    })
    .select(`
      id,
      receipt_reference,
      lifecycle_status,
      server_synced_at
    `)
    .single();

  if (
    error ||
    !inserted
  ) {
    console.error(
      "OFFLINE_FIELD_EVENT_SYNC_FAILED",
      {
        collectionId,
        participantId,
        deviceEventId,
        errorCode:
          error?.code,
      }
    );

    return NextResponse.json(
      {
        error:
          "Threeple could not sync this field event.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    ok: true,
    idempotent: false,
    event_id:
      inserted.id,
    receipt_reference:
      inserted.receipt_reference,
    lifecycle_status:
      inserted.lifecycle_status,
    server_synced_at:
      inserted.server_synced_at,
  });
}

