import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

type ActivityActorType =
  | "user"
  | "system"
  | "admin"
  | "provider";

type LogCollectionActivityInput = {
  collectionId: string;
  organizationId: string;

  actorUserId?: string | null;
  actorType?: ActivityActorType;

  eventType: string;

  subjectType?: string | null;
  subjectId?: string | null;
  subjectLabel?: string | null;

  description?: string | null;

  metadata?: Record<
    string,
    unknown
  >;
};

// =========================================================
// COLLECTION ACTIVITY LOGGER
// =========================================================

export async function logCollectionActivity(
  input: LogCollectionActivityInput
) {
  const {
    error,
  } = await supabaseAdmin
    .from(
      "collection_activity_events"
    )
    .insert({
      collection_id:
        input.collectionId,

      organization_id:
        input.organizationId,

      actor_user_id:
        input.actorUserId ??
        null,

      actor_type:
        input.actorType ??
        "user",

      event_type:
        input.eventType,

      subject_type:
        input.subjectType ??
        null,

      subject_id:
        input.subjectId ??
        null,

      subject_label:
        input.subjectLabel ??
        null,

      description:
        input.description ??
        null,

      metadata:
        input.metadata ??
        {},
    });

  if (error) {
    console.error(
      "COLLECTION_ACTIVITY_LOG_FAILED",
      {
        collectionId:
          input.collectionId,

        eventType:
          input.eventType,

        subjectId:
          input.subjectId ??
          null,

        errorCode:
          error.code,
      }
    );

    return false;
  }

  return true;
}