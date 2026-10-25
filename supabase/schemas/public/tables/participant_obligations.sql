CREATE TABLE "public"."participant_obligations" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "cycle_id"       uuid                     NOT NULL,
  "participant_id" uuid                     NOT NULL,
  "amount_due"     numeric(18,2)            NOT NULL,
  "amount_paid"    numeric(18,2)            NOT NULL DEFAULT 0,
  "due_date"       date                     NOT NULL,
  "status"         text                     NOT NULL DEFAULT 'unpaid'::text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "participant_obligations_amount_due_check" CHECK ((amount_due >= (0)::numeric)),
  CONSTRAINT "participant_obligations_amount_paid_check" CHECK ((amount_paid >= (0)::numeric)),
  CONSTRAINT "participant_obligations_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.collection_cycles(id) ON DELETE CASCADE,
  CONSTRAINT "participant_obligations_cycle_id_participant_id_key" UNIQUE (cycle_id, participant_id),
  CONSTRAINT "participant_obligations_pkey" PRIMARY KEY (id),
  CONSTRAINT "participant_obligations_status_check"
    CHECK ((status = ANY (ARRAY['unpaid'::text, 'pending'::text, 'partial'::text, 'paid'::text, 'overdue'::text, 'exempted'::text]))),
  CONSTRAINT "participant_obligations_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE
);

ALTER TABLE "public"."participant_obligations"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX participant_obligations_cycle_idx ON public.participant_obligations USING btree (cycle_id);

CREATE INDEX participant_obligations_participant_idx ON public.participant_obligations USING btree (participant_id);

CREATE INDEX participant_obligations_status_idx ON public.participant_obligations USING btree (status);

CREATE TRIGGER participant_obligations_set_updated_at
  BEFORE UPDATE ON public.participant_obligations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER protect_obligation_financial_fields_trigger
  BEFORE UPDATE ON public.participant_obligations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_obligation_financial_fields();

CREATE POLICY "Managers can view obligations" ON "public"."participant_obligations"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM (public.collection_cycles cc
     JOIN public.collections c ON ((c.id = cc.collection_id)))
  WHERE ((cc.id = participant_obligations.cycle_id) AND ((EXISTS ( SELECT 1
           FROM public.organizations o
          WHERE ((o.id = c.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM public.organization_members om
          WHERE ((om.organization_id = c.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text]))))))))));

CREATE POLICY "Participants can view own obligations" ON "public"."participant_obligations"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.participants p
  WHERE ((p.id = participant_obligations.participant_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."participant_obligations" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."participant_obligations" TO "service_role";

REVOKE ALL ON TABLE "public"."participant_obligations" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."participant_obligations" TO "postgres";
