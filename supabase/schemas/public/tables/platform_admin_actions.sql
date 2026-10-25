CREATE TABLE "public"."platform_admin_actions" (
  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "admin_user_id"          uuid                     NOT NULL,
  "admin_role"             text                     NOT NULL,
  "action_type"            text                     NOT NULL,
  "subject_type"           text                     NOT NULL,
  "subject_id"             uuid                     NOT NULL,
  "trust_safety_report_id" uuid,
  "reason"                 text                     NOT NULL,
  "previous_state"         jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "new_state"              jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "metadata"               jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "platform_admin_actions_admin_user_id_fkey" FOREIGN KEY (admin_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT "platform_admin_actions_pkey" PRIMARY KEY (id),
  CONSTRAINT "platform_admin_actions_subject_type_check"
    CHECK ((subject_type = ANY (ARRAY['user'::text, 'organization'::text, 'collection'::text, 'participant'::text, 'platform_admin'::text, 'trust_safety_report'::text]))),
  CONSTRAINT "platform_admin_actions_trust_safety_report_id_fkey" FOREIGN KEY (trust_safety_report_id) REFERENCES public.trust_safety_reports(id) ON DELETE SET NULL
);

ALTER TABLE "public"."platform_admin_actions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX platform_admin_actions_admin_idx ON public.platform_admin_actions USING btree (admin_user_id, created_at DESC);

CREATE INDEX platform_admin_actions_report_idx ON public.platform_admin_actions USING btree (trust_safety_report_id, created_at DESC);

CREATE INDEX platform_admin_actions_subject_idx ON public.platform_admin_actions USING btree (subject_type, subject_id, created_at DESC);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_admin_actions" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_admin_actions" TO "service_role";

REVOKE ALL ON TABLE "public"."platform_admin_actions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_admin_actions" TO "postgres";
