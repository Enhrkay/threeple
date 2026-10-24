import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      collectionId: string;
    }>;
  }
) {
  const {
    collectionId,
  } = await context.params;

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

  const {
    data: collection,
  } = await supabaseAdmin
    .from("collections")
    .select(`
      id,
      title,
      organization_id,
      collection_mode,
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
    return NextResponse.json(
      {
        error:
          "Collection unavailable.",
      },
      {
        status: 404,
      }
    );
  }

  const {
    data: organization,
  } = await supabaseAdmin
    .from("organizations")
    .select(`
      id,
      name,
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
        organization.id
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
    data: participants,
    error:
      participantError,
  } = await supabaseAdmin
    .from("participants")
    .select(`
      id,
      full_name,
      phone,
      expected_amount,
      payment_status,
      participation_status
    `)
    .eq(
      "collection_id",
      collectionId
    )
    .eq(
      "is_active",
      true
    )
    .order(
      "full_name",
      {
        ascending: true,
      }
    );

  if (
    participantError
  ) {
    console.error(
      "COLLECTOR_OFFLINE_SNAPSHOT_FAILED",
      participantError
    );

    return NextResponse.json(
      {
        error:
          "Could not prepare this collection for offline use.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    collection_id:
      collection.id,
    title:
      collection.title,
    organization_name:
      organization.name,
    collection_mode:
      collection.collection_mode,
    currency:
      collection.currency,
    default_amount:
      collection.default_amount,
    prepared_by_user_id:
      userId,
    prepared_at:
      new Date().toISOString(),
    participants:
      participants ?? [],
  });
}

