CREATE TABLE "public"."collection_restrictions" (
  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "collection_id"          uuid                     NOT NULL,
  "trust_safety_report_id" uuid                     NOT NULL,
  "restriction_type"       text                     NOT NULL,
  "reason"                 text                     NOT NULL,
  "imposed_by"             uuid                     NOT NULL,
  "imposed_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "lifted_by"              uuid,
  "lifted_at"              timestamp with time zone,
  "lift_reason"            text,
  "metadata"               jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "collection_restrictions_imposed_by_fkey" FOREIGN KEY (imposed_by) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT "collection_restrictions_lifted_by_fkey" FOREIGN KEY (lifted_by) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT "collection_restrictions_pkey" PRIMARY KEY (id),
  CONSTRAINT "collection_restrictions_restriction_type_check"
    CHECK ((restriction_type = ANY (ARRAY['join_block'::text, 'organizer_changes_block'::text, 'full_collection'::text]))),
  CONSTRAINT "collection_restrictions_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE RESTRICT,
  CONSTRAINT "collection_restrictions_trust_safety_report_id_fkey" FOREIGN KEY (trust_safety_report_id) REFERENCES public.trust_safety_reports(id) ON DELETE RESTRICT
);

ALTER TABLE "public"."collection_restrictions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX collection_restrictions_active_idx ON public.collection_restrictions USING btree (restriction_type, imposed_at DESC)
  WHERE (lifted_at IS NULL);

CREATE INDEX collection_restrictions_collection_idx ON public.collection_restrictions USING btree (collection_id, imposed_at DESC);

CREATE UNIQUE INDEX collection_restrictions_one_active_idx ON public.collection_restrictions USING btree (collection_id)
  WHERE (lifted_at IS NULL);

CREATE INDEX collection_restrictions_report_idx ON public.collection_restrictions USING btree (trust_safety_report_id, imposed_at DESC);

CREATE TRIGGER collection_restrictions_updated_at
  BEFORE UPDATE ON public.collection_restrictions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_collection_restriction_updated_at();

CREATE TRIGGER collection_restrictions_validate_state
  BEFORE INSERT OR UPDATE ON public.collection_restrictions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_collection_restriction_state();

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_restrictions" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_restrictions" TO "service_role";

REVOKE ALL ON TABLE "public"."collection_restrictions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_restrictions" TO "postgres";
