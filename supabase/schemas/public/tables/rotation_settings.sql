CREATE TABLE "public"."rotation_settings" (
  "collection_id"         uuid                     NOT NULL,
  "contribution_amount"   numeric(18,2)            NOT NULL,
  "frequency"             text                     NOT NULL DEFAULT 'monthly'::text,
  "start_date"            date                     NOT NULL,
  "coordinator_fee_mode"  text                     NOT NULL DEFAULT 'none'::text,
  "coordinator_fee_value" numeric(18,2)            NOT NULL DEFAULT 0,
  "status"                text                     NOT NULL DEFAULT 'draft'::text,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "rotation_settings_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE,
  CONSTRAINT "rotation_settings_contribution_amount_check" CHECK ((contribution_amount > (0)::numeric)),
  CONSTRAINT "rotation_settings_coordinator_fee_mode_check" CHECK ((coordinator_fee_mode = ANY (ARRAY['none'::text, 'fixed'::text, 'percentage'::text]))),
  CONSTRAINT "rotation_settings_coordinator_fee_value_check" CHECK ((coordinator_fee_value >= (0)::numeric)),
  CONSTRAINT "rotation_settings_frequency_check" CHECK ((frequency = ANY (ARRAY['weekly'::text, 'biweekly'::text, 'monthly'::text]))),
  CONSTRAINT "rotation_settings_pkey" PRIMARY KEY (collection_id),
  CONSTRAINT "rotation_settings_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'completed'::text, 'cancelled'::text])))
);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_settings" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_settings" TO "service_role";

REVOKE ALL ON TABLE "public"."rotation_settings" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_settings" TO "postgres";
