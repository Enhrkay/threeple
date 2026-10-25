CREATE TABLE "public"."organization_restrictions" (
  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"        uuid                     NOT NULL,
  "trust_safety_report_id" uuid                     NOT NULL,
  "restriction_type"       text                     NOT NULL,
  "reason"                 text                     NOT NULL,
  "imposed_by"             uuid                     NOT NULL,
  "imposed_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "lifted_by"              uuid,
  "lifted_at"              timestamp with time zone,
  "lift_reason"            text,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "organization_restrictions_lift_reason_check" CHECK (((lift_reason IS NULL) OR (char_length(TRIM(BOTH FROM lift_reason)) >= 10))),
  CONSTRAINT "organization_restrictions_lift_state_check" CHECK ((((lifted_by IS NULL) AND (lifted_at IS NULL) AND (lift_reason IS NULL)) OR ((lifted_by IS
    NOT NULL) AND (lifted_at IS NOT NULL) AND (lift_reason IS NOT NULL)))),
  CONSTRAINT "organization_restrictions_pkey" PRIMARY KEY (id),
  CONSTRAINT "organization_restrictions_reason_check" CHECK ((char_length(TRIM(BOTH FROM reason)) >= 10)),
  CONSTRAINT "organization_restrictions_restriction_type_check"
    CHECK ((restriction_type = ANY (ARRAY['new_collection_block'::text, 'organizer_changes_block'::text, 'full_organization'::text]))),
  CONSTRAINT "organization_restrictions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT "organization_restrictions_imposed_by_fkey" FOREIGN KEY (imposed_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT "organization_restrictions_lifted_by_fkey" FOREIGN KEY (lifted_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT "organization_restrictions_trust_safety_report_id_fkey" FOREIGN KEY (trust_safety_report_id) REFERENCES public.trust_safety_reports(id) ON DELETE RESTRICT
);

ALTER TABLE "public"."organization_restrictions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX organization_restrictions_active_lookup_idx ON public.organization_restrictions USING btree (organization_id, lifted_at);

CREATE UNIQUE INDEX organization_restrictions_one_active_per_org_idx ON public.organization_restrictions USING btree (organization_id)
  WHERE (lifted_at IS NULL);

CREATE INDEX organization_restrictions_organization_id_idx ON public.organization_restrictions USING btree (organization_id);

CREATE INDEX organization_restrictions_report_id_idx ON public.organization_restrictions USING btree (trust_safety_report_id);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organization_restrictions" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organization_restrictions" TO "service_role";

REVOKE ALL ON TABLE "public"."organization_restrictions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organization_restrictions" TO "postgres";
