CREATE TABLE "public"."rotation_cycle_obligations" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "cycle_id"       uuid                     NOT NULL,
  "participant_id" uuid                     NOT NULL,
  "amount_due"     numeric(18,2)            NOT NULL,
  "amount_paid"    numeric(18,2)            NOT NULL DEFAULT 0,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "paid_at"        timestamp with time zone,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "rotation_cycle_obligations_amount_due_check" CHECK ((amount_due >= (0)::numeric)),
  CONSTRAINT "rotation_cycle_obligations_amount_paid_check" CHECK ((amount_paid >= (0)::numeric)),
  CONSTRAINT "rotation_cycle_obligations_cycle_id_participant_id_key" UNIQUE (cycle_id, participant_id),
  CONSTRAINT "rotation_cycle_obligations_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE,
  CONSTRAINT "rotation_cycle_obligations_pkey" PRIMARY KEY (id),
  CONSTRAINT "rotation_cycle_obligations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text, 'waived'::text]))),
  CONSTRAINT "rotation_cycle_obligations_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.rotation_cycles(id) ON DELETE CASCADE
);

CREATE INDEX rotation_obligations_cycle_idx ON public.rotation_cycle_obligations USING btree (cycle_id);

CREATE INDEX rotation_obligations_participant_idx ON public.rotation_cycle_obligations USING btree (participant_id);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_cycle_obligations" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_cycle_obligations" TO "service_role";

REVOKE ALL ON TABLE "public"."rotation_cycle_obligations" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_cycle_obligations" TO "postgres";
