CREATE TABLE "public"."rotation_members" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "collection_id"      uuid                     NOT NULL,
  "participant_id"     uuid                     NOT NULL,
  "recipient_position" integer                  NOT NULL,
  "is_active"          boolean                  NOT NULL DEFAULT true,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "rotation_members_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE,
  CONSTRAINT "rotation_members_collection_id_participant_id_key" UNIQUE (collection_id, participant_id),
  CONSTRAINT "rotation_members_collection_id_recipient_position_key" UNIQUE (collection_id, recipient_position),
  CONSTRAINT "rotation_members_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE,
  CONSTRAINT "rotation_members_pkey" PRIMARY KEY (id),
  CONSTRAINT "rotation_members_recipient_position_check" CHECK ((recipient_position > 0))
);

CREATE INDEX rotation_members_collection_idx ON public.rotation_members USING btree (collection_id);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_members" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_members" TO "service_role";

REVOKE ALL ON TABLE "public"."rotation_members" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_members" TO "postgres";
