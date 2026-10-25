CREATE TABLE "public"."recurring_cycles" (
  "id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "collection_id"        uuid                     NOT NULL,
  "recurring_setting_id" uuid                     NOT NULL,
  "cycle_number"         integer                  NOT NULL,
  "starts_on"            date                     NOT NULL,
  "due_on"               date                     NOT NULL,
  "ends_on"              date                     NOT NULL,
  "status"               text                     NOT NULL DEFAULT 'scheduled'::text,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "recurring_cycles_collection_id_cycle_number_key" UNIQUE (collection_id, cycle_number),
  CONSTRAINT "recurring_cycles_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE,
  CONSTRAINT "recurring_cycles_cycle_number_check" CHECK ((cycle_number > 0)),
  CONSTRAINT "recurring_cycles_pkey" PRIMARY KEY (id),
  CONSTRAINT "recurring_cycles_status_check" CHECK ((status = ANY (ARRAY['scheduled'::text, 'collecting'::text, 'closed'::text, 'cancelled'::text]))),
  CONSTRAINT "recurring_cycles_recurring_setting_id_fkey" FOREIGN KEY (recurring_setting_id) REFERENCES public.recurring_settings(id) ON DELETE CASCADE
);

ALTER TABLE "public"."recurring_cycles"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX recurring_cycles_collection_due_idx ON public.recurring_cycles USING btree (collection_id, due_on);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_cycles" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_cycles" TO "service_role";

REVOKE ALL ON TABLE "public"."recurring_cycles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_cycles" TO "postgres";
