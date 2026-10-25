CREATE TABLE "public"."payments" (
  "id"                         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "collection_id"              uuid                     NOT NULL,
  "participant_id"             uuid                     NOT NULL,
  "obligation_id"              uuid,
  "provider"                   text                     NOT NULL,
  "provider_reference"         text                     NOT NULL,
  "amount"                     numeric(18,2)            NOT NULL,
  "currency"                   text                     NOT NULL DEFAULT 'NGN'::text,
  "status"                     text                     NOT NULL DEFAULT 'initiated'::text,
  "payment_method"             text,
  "initiated_by"               uuid,
  "paid_at"                    timestamp with time zone,
  "verified_at"                timestamp with time zone,
  "metadata"                   jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"                 timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                 timestamp with time zone NOT NULL DEFAULT now(),
  "refunded_amount"            numeric(18,2)            NOT NULL DEFAULT 0,
  "payment_provider"           text,
  "platform_fee_percentage"    numeric(5,2)             NOT NULL DEFAULT 0,
  "platform_fee_amount"        numeric(18,2)            NOT NULL DEFAULT 0,
  "processor_fee_amount"       numeric(18,2)            NOT NULL DEFAULT 0,
  "organizer_net_amount"       numeric(18,2)            NOT NULL DEFAULT 0,
  "monetization_calculated_at" timestamp with time zone,
  "rotation_cycle_id"          uuid,
  "rotation_obligation_id"     uuid,
  "recurring_obligation_id"    uuid,
  CONSTRAINT "payments_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "payments_check" CHECK (((status <> 'success'::text) OR ((verified_at IS NOT NULL) AND (paid_at IS NOT NULL)))),
  CONSTRAINT "payments_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE RESTRICT,
  CONSTRAINT "payments_currency_check" CHECK ((char_length(currency) = 3)),
  CONSTRAINT "payments_full_refund_valid" CHECK (((status <> 'refunded'::text) OR ((refunded_amount = amount) AND (verified_at IS NOT NULL)))),
  CONSTRAINT "payments_obligation_id_fkey" FOREIGN KEY (obligation_id) REFERENCES public.participant_obligations(id) ON DELETE RESTRICT,
  CONSTRAINT "payments_organizer_net_amount_check" CHECK ((organizer_net_amount >= (0)::numeric)),
  CONSTRAINT "payments_partial_refund_valid" CHECK (((status <> 'partially_refunded'::text) OR ((refunded_amount > (0)::numeric) AND (refunded_amount < amount) AND (verified_at IS
    NOT NULL)))),
  CONSTRAINT "payments_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE RESTRICT,
  CONSTRAINT "payments_pkey" PRIMARY KEY (id),
  CONSTRAINT "payments_platform_fee_amount_check" CHECK ((platform_fee_amount >= (0)::numeric)),
  CONSTRAINT "payments_platform_fee_percentage_check" CHECK (((platform_fee_percentage >= (0)::numeric) AND (platform_fee_percentage <= (100)::numeric))),
  CONSTRAINT "payments_processor_fee_amount_check" CHECK ((processor_fee_amount >= (0)::numeric)),
  CONSTRAINT "payments_provider_provider_reference_key" UNIQUE (PROVIDER, provider_reference),
  CONSTRAINT "payments_refunded_amount_valid" CHECK (((refunded_amount >= (0)::numeric) AND (refunded_amount <= amount))),
  CONSTRAINT "payments_status_check"
    CHECK
    ((status = ANY (ARRAY['initiated'::text, 'pending'::text, 'success'::text, 'failed'::text, 'cancelled'::text, 'reversed'::text, 'refunded'::text,
    'partially_refunded'::text]))),
  CONSTRAINT "payments_initiated_by_fkey" FOREIGN KEY (initiated_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT "payments_recurring_obligation_id_fkey" FOREIGN KEY (recurring_obligation_id) REFERENCES public.recurring_cycle_obligations(id) ON DELETE SET NULL,
  CONSTRAINT "payments_rotation_obligation_id_fkey" FOREIGN KEY (rotation_obligation_id) REFERENCES public.rotation_cycle_obligations(id) ON DELETE SET NULL,
  CONSTRAINT "payments_rotation_cycle_id_fkey" FOREIGN KEY (rotation_cycle_id) REFERENCES public.rotation_cycles(id) ON DELETE SET NULL
);

ALTER TABLE "public"."payments"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX payments_collection_idx ON public.payments USING btree (collection_id);

CREATE INDEX payments_created_at_idx ON public.payments USING btree (created_at);

CREATE INDEX payments_obligation_idx ON public.payments USING btree (obligation_id);

CREATE INDEX payments_participant_idx ON public.payments USING btree (participant_id);

CREATE UNIQUE INDEX payments_provider_reference_uq ON public.payments USING btree (payment_provider, provider_reference)
  WHERE ((payment_provider IS NOT NULL) AND (provider_reference IS NOT NULL));

CREATE INDEX payments_recurring_obligation_id_idx ON public.payments USING btree (recurring_obligation_id)
  WHERE (recurring_obligation_id IS NOT NULL);

CREATE INDEX payments_reference_idx ON public.payments USING btree (provider_reference);

CREATE INDEX payments_rotation_cycle_idx ON public.payments USING btree (rotation_cycle_id);

CREATE INDEX payments_rotation_obligation_idx ON public.payments USING btree (rotation_obligation_id);

CREATE UNIQUE INDEX payments_rotation_obligation_reference_uidx ON public.payments USING btree (rotation_obligation_id, payment_provider, provider_reference)
  WHERE ((rotation_obligation_id IS NOT NULL) AND (provider_reference IS NOT NULL));

CREATE INDEX payments_status_idx ON public.payments USING btree (status);

CREATE TRIGGER payment_monetization_trigger
  AFTER INSERT OR UPDATE OF status, refunded_amount, verified_at, processor_fee_amount ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_monetization();

CREATE TRIGGER payment_reconciliation_trigger
  AFTER INSERT OR UPDATE OF status, refunded_amount, verified_at, paid_at ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_reconciliation();

CREATE TRIGGER payments_lock_collection_financial_rules
  AFTER INSERT OR UPDATE OF status, verified_at ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.lock_collection_financial_rules_on_payment();

CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER protect_payment_identity_trigger
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_payment_identity();

CREATE TRIGGER trg_refresh_rotation_from_payment
  AFTER INSERT OR DELETE OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_rotation_from_payment();

CREATE TRIGGER trg_validate_rotation_payment_link
  BEFORE INSERT OR UPDATE OF rotation_cycle_id, rotation_obligation_id, participant_id, collection_id ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_rotation_payment_link();

CREATE TRIGGER validate_payment_relationships_trigger
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payment_relationships();

CREATE POLICY "Managers can view payments" ON "public"."payments"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM (public.collections c
     JOIN public.organization_members om ON ((om.organization_id = c.organization_id)))
  WHERE ((c.id = payments.collection_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text]))))));

CREATE POLICY "Organization owners can view payments" ON "public"."payments"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM (public.collections c
     JOIN public.organizations o ON ((o.id = c.organization_id)))
  WHERE ((c.id = payments.collection_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Participants can view own payments" ON "public"."payments"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.participants p
  WHERE ((p.id = payments.participant_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payments" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payments" TO "service_role";

REVOKE ALL ON TABLE "public"."payments" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payments" TO "postgres";
