CREATE TABLE "public"."collection_activity_events" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "collection_id"   uuid                     NOT NULL,
  "organization_id" uuid                     NOT NULL,
  "actor_user_id"   uuid,
  "actor_type"      text                     NOT NULL DEFAULT 'user'::text,
  "event_type"      text                     NOT NULL,
  "subject_type"    text,
  "subject_id"      uuid,
  "subject_label"   text,
  "description"     text,
  "metadata"        jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "collection_activity_events_actor_type_check" CHECK ((actor_type = ANY (ARRAY['user'::text, 'system'::text, 'admin'::text, 'provider'::text]))),
  CONSTRAINT "collection_activity_events_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "collection_activity_events_event_type_check" CHECK (((char_length(event_type) >= 3) AND (char_length(event_type) <= 100))),
  CONSTRAINT "collection_activity_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "collection_activity_events_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE,
  CONSTRAINT "collection_activity_events_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE "public"."collection_activity_events"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX collection_activity_events_collection_created_idx ON public.collection_activity_events USING btree (collection_id, created_at DESC);

CREATE INDEX collection_activity_events_event_type_idx ON public.collection_activity_events USING btree (event_type);

CREATE INDEX collection_activity_events_organization_created_idx ON public.collection_activity_events USING btree (organization_id, created_at DESC);

CREATE TRIGGER validate_collection_activity_scope_trigger
  BEFORE INSERT OR UPDATE ON public.collection_activity_events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_collection_activity_scope();

CREATE POLICY "collection managers can view activity" ON "public"."collection_activity_events"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = collection_activity_events.organization_id) AND ((o.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.organization_members om
          WHERE ((om.organization_id = o.id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text]))))))))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_activity_events" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_activity_events" TO "service_role";

REVOKE ALL ON TABLE "public"."collection_activity_events" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_activity_events" TO "postgres";
