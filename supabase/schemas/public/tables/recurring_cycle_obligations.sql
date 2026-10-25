CREATE TABLE "public"."recurring_cycle_obligations" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "cycle_id"        uuid                     NOT NULL,
  "collection_id"   uuid                     NOT NULL,
  "participant_id"  uuid                     NOT NULL,
  "expected_amount" numeric(18,2)            NOT NULL,
  "status"          text                     NOT NULL DEFAULT 'pending'::text,
  "paid_amount"     numeric(18,2)            NOT NULL DEFAULT 0,
  "paid_at"         timestamp with time zone,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "recurring_cycle_obligations_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE,
  CONSTRAINT "recurring_cycle_obligations_cycle_id_participant_id_key" UNIQUE (cycle_id, participant_id),
  CONSTRAINT "recurring_cycle_obligations_expected_amount_check" CHECK ((expected_amount > (0)::numeric)),
  CONSTRAINT "recurring_cycle_obligations_paid_amount_check" CHECK ((paid_amount >= (0)::numeric)),
  CONSTRAINT "recurring_cycle_obligations_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE RESTRICT,
  CONSTRAINT "recurring_cycle_obligations_pkey" PRIMARY KEY (id),
  CONSTRAINT "recurring_cycle_obligations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'partially_paid'::text, 'paid'::text, 'waived'::text, 'cancelled'::text]))),
  CONSTRAINT "recurring_cycle_obligations_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.recurring_cycles(id) ON DELETE CASCADE
);

ALTER TABLE "public"."recurring_cycle_obligations"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX recurring_obligations_collection_status_idx ON public.recurring_cycle_obligations USING btree (collection_id, status);

CREATE INDEX recurring_obligations_participant_idx ON public.recurring_cycle_obligations USING btree (participant_id);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_cycle_obligations" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_cycle_obligations" TO "service_role";

REVOKE ALL ON TABLE "public"."recurring_cycle_obligations" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_cycle_obligations" TO "postgres";
