CREATE TABLE "public"."collection_cycles" (
  "id"                              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "collection_id"                   uuid                     NOT NULL,
  "schedule_id"                     uuid                     NOT NULL,
  "cycle_number"                    integer                  NOT NULL,
  "due_date"                        date                     NOT NULL,
  "recipient_participant_id"        uuid,
  "expected_amount_per_participant" numeric(18,2)            NOT NULL,
  "status"                          text                     NOT NULL DEFAULT 'scheduled'::text,
  "payout_status"                   text                     NOT NULL DEFAULT 'not_applicable'::text,
  "payout_confirmed_at"             timestamp with time zone,
  "created_at"                      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "collection_cycles_collection_id_cycle_number_key" UNIQUE (collection_id, cycle_number),
  CONSTRAINT "collection_cycles_cycle_number_check" CHECK ((cycle_number > 0)),
  CONSTRAINT "collection_cycles_expected_amount_per_participant_check" CHECK ((expected_amount_per_participant > (0)::numeric)),
  CONSTRAINT "collection_cycles_payout_status_check" CHECK ((payout_status = ANY (ARRAY['not_applicable'::text, 'pending'::text, 'ready'::text, 'confirmed'::text]))),
  CONSTRAINT "collection_cycles_pkey" PRIMARY KEY (id),
  CONSTRAINT "collection_cycles_status_check" CHECK ((status = ANY (ARRAY['scheduled'::text, 'collecting'::text, 'closed'::text, 'cancelled'::text]))),
  CONSTRAINT "collection_cycles_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE,
  CONSTRAINT "collection_cycles_recipient_participant_id_fkey" FOREIGN KEY (recipient_participant_id) REFERENCES public.participants(id) ON DELETE SET NULL,
  CONSTRAINT "collection_cycles_schedule_id_fkey" FOREIGN KEY (schedule_id) REFERENCES public.recurring_schedules(id) ON DELETE CASCADE
);

ALTER TABLE "public"."collection_cycles"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX collection_cycles_collection_idx ON public.collection_cycles USING btree (collection_id);

CREATE INDEX collection_cycles_due_date_idx ON public.collection_cycles USING btree (due_date);

CREATE TRIGGER collection_cycles_set_updated_at
  BEFORE UPDATE ON public.collection_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Managers can manage collection cycles" ON "public"."collection_cycles"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.collections c
  WHERE ((c.id = collection_cycles.collection_id) AND ((EXISTS ( SELECT 1
           FROM public.organizations o
          WHERE ((o.id = c.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM public.organization_members om
          WHERE ((om.organization_id = c.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text]))))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.collections c
  WHERE ((c.id = collection_cycles.collection_id) AND ((EXISTS ( SELECT 1
           FROM public.organizations o
          WHERE ((o.id = c.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM public.organization_members om
          WHERE ((om.organization_id = c.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text]))))))))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_cycles" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_cycles" TO "service_role";

REVOKE ALL ON TABLE "public"."collection_cycles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_cycles" TO "postgres";
