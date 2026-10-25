CREATE TABLE "public"."rotation_cycles" (
  "id"                           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "collection_id"                uuid                     NOT NULL,
  "cycle_number"                 integer                  NOT NULL,
  "recipient_participant_id"     uuid                     NOT NULL,
  "scheduled_date"               date                     NOT NULL,
  "contribution_amount"          numeric(18,2)            NOT NULL,
  "expected_member_count"        integer                  NOT NULL,
  "expected_gross_amount"        numeric(18,2)            NOT NULL,
  "coordinator_fee_amount"       numeric(18,2)            NOT NULL DEFAULT 0,
  "threeple_platform_fee_amount" numeric(18,2)            NOT NULL DEFAULT 0,
  "processor_fee_amount"         numeric(18,2)            NOT NULL DEFAULT 0,
  "expected_recipient_net"       numeric(18,2)            NOT NULL DEFAULT 0,
  "status"                       text                     NOT NULL DEFAULT 'scheduled'::text,
  "opened_at"                    timestamp with time zone,
  "settled_at"                   timestamp with time zone,
  "created_at"                   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "rotation_cycles_collection_id_cycle_number_key" UNIQUE (collection_id, cycle_number),
  CONSTRAINT "rotation_cycles_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE,
  CONSTRAINT "rotation_cycles_contribution_amount_check" CHECK ((contribution_amount > (0)::numeric)),
  CONSTRAINT "rotation_cycles_coordinator_fee_amount_check" CHECK ((coordinator_fee_amount >= (0)::numeric)),
  CONSTRAINT "rotation_cycles_cycle_number_check" CHECK ((cycle_number > 0)),
  CONSTRAINT "rotation_cycles_expected_gross_amount_check" CHECK ((expected_gross_amount >= (0)::numeric)),
  CONSTRAINT "rotation_cycles_expected_member_count_check" CHECK ((expected_member_count > 0)),
  CONSTRAINT "rotation_cycles_expected_recipient_net_check" CHECK ((expected_recipient_net >= (0)::numeric)),
  CONSTRAINT "rotation_cycles_pkey" PRIMARY KEY (id),
  CONSTRAINT "rotation_cycles_processor_fee_amount_check" CHECK ((processor_fee_amount >= (0)::numeric)),
  CONSTRAINT "rotation_cycles_recipient_participant_id_fkey" FOREIGN KEY (recipient_participant_id) REFERENCES public.participants(id),
  CONSTRAINT "rotation_cycles_status_check" CHECK ((status = ANY (ARRAY['scheduled'::text, 'open'::text, 'settled'::text, 'cancelled'::text]))),
  CONSTRAINT "rotation_cycles_threeple_platform_fee_amount_check" CHECK ((threeple_platform_fee_amount >= (0)::numeric))
);

CREATE INDEX rotation_cycles_collection_idx ON public.rotation_cycles USING btree (collection_id);

CREATE INDEX rotation_cycles_recipient_idx ON public.rotation_cycles USING btree (recipient_participant_id);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_cycles" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_cycles" TO "service_role";

REVOKE ALL ON TABLE "public"."rotation_cycles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_cycles" TO "postgres";
