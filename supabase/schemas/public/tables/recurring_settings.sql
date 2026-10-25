CREATE TABLE "public"."recurring_settings" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "collection_id"       uuid                     NOT NULL,
  "frequency"           text                     NOT NULL,
  "interval_count"      integer                  NOT NULL DEFAULT 1,
  "contribution_amount" numeric(18,2)            NOT NULL,
  "start_date"          date                     NOT NULL,
  "due_day_of_week"     integer,
  "due_day_of_month"    integer,
  "grace_days"          integer                  NOT NULL DEFAULT 0,
  "cycles_to_generate"  integer                  NOT NULL DEFAULT 12,
  "schedule_locked"     boolean                  NOT NULL DEFAULT false,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "recurring_settings_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE,
  CONSTRAINT "recurring_settings_collection_id_key" UNIQUE (collection_id),
  CONSTRAINT "recurring_settings_contribution_amount_check" CHECK ((contribution_amount > (0)::numeric)),
  CONSTRAINT "recurring_settings_cycles_to_generate_check" CHECK (((cycles_to_generate >= 1) AND (cycles_to_generate <= 60))),
  CONSTRAINT "recurring_settings_due_day_of_month_check" CHECK (((due_day_of_month >= 1) AND (due_day_of_month <= 28))),
  CONSTRAINT "recurring_settings_due_day_of_week_check" CHECK (((due_day_of_week >= 0) AND (due_day_of_week <= 6))),
  CONSTRAINT "recurring_settings_frequency_check" CHECK ((frequency = ANY (ARRAY['weekly'::text, 'monthly'::text]))),
  CONSTRAINT "recurring_settings_grace_days_check" CHECK ((grace_days >= 0)),
  CONSTRAINT "recurring_settings_interval_count_check" CHECK ((interval_count > 0)),
  CONSTRAINT "recurring_settings_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."recurring_settings"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_settings" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_settings" TO "service_role";

REVOKE ALL ON TABLE "public"."recurring_settings" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_settings" TO "postgres";
