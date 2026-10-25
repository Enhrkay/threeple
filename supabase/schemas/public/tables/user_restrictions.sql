CREATE TABLE "public"."user_restrictions" (
  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"                uuid                     NOT NULL,
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
  CONSTRAINT "user_restrictions_imposed_by_fkey" FOREIGN KEY (imposed_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT "user_restrictions_lift_consistency" CHECK ((((lifted_at IS NULL) AND (lifted_by IS NULL) AND (lift_reason IS NULL)) OR ((lifted_at IS NOT NULL) AND (lifted_by IS
    NOT NULL) AND (lift_reason IS NOT NULL)))),
  CONSTRAINT "user_restrictions_lift_reason_check" CHECK (((lift_reason IS NULL) OR (char_length(btrim(lift_reason)) >= 10))),
  CONSTRAINT "user_restrictions_lifted_by_fkey" FOREIGN KEY (lifted_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT "user_restrictions_pkey" PRIMARY KEY (id),
  CONSTRAINT "user_restrictions_reason_check" CHECK ((char_length(btrim(reason)) >= 10)),
  CONSTRAINT "user_restrictions_restriction_type_check" CHECK ((restriction_type = ANY (ARRAY['participation_block'::text, 'organizer_block'::text, 'full_platform'::text]))),
  CONSTRAINT "user_restrictions_trust_safety_report_id_fkey" FOREIGN KEY (trust_safety_report_id) REFERENCES public.trust_safety_reports(id) ON DELETE RESTRICT,
  CONSTRAINT "user_restrictions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE "public"."user_restrictions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX user_restrictions_active_lookup_idx ON public.user_restrictions USING btree (user_id, lifted_at);

CREATE UNIQUE INDEX user_restrictions_one_active_per_user_idx ON public.user_restrictions USING btree (user_id)
  WHERE (lifted_at IS NULL);

CREATE INDEX user_restrictions_report_id_idx ON public.user_restrictions USING btree (trust_safety_report_id);

CREATE INDEX user_restrictions_user_id_idx ON public.user_restrictions USING btree (user_id);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_restrictions" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_restrictions" TO "service_role";

REVOKE ALL ON TABLE "public"."user_restrictions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_restrictions" TO "postgres";
