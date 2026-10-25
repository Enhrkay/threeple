CREATE TABLE "public"."field_contribution_events" (
  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "device_event_id"        uuid                     NOT NULL,
  "receipt_reference"      text                     NOT NULL,
  "collection_id"          uuid                     NOT NULL,
  "participant_id"         uuid                     NOT NULL,
  "collector_user_id"      uuid                     NOT NULL,
  "amount"                 numeric(18,2)            NOT NULL,
  "currency"               text                     NOT NULL,
  "payment_method"         text                     NOT NULL,
  "lifecycle_status"       text                     NOT NULL,
  "local_recorded_at"      timestamp with time zone NOT NULL,
  "server_synced_at"       timestamp with time zone,
  "note"                   text,
  "correction_of_event_id" uuid,
  "correction_reason"      text,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "adjustment_type"        text,
  "adjusted_by_user_id"    uuid,
  "adjusted_at"            timestamp with time zone,
  "obligation_type"        text,
  "obligation_id"          uuid,
  "cycle_id"               uuid,
  CONSTRAINT "field_contribution_events_adjusted_by_user_id_fkey" FOREIGN KEY (adjusted_by_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT "field_contribution_events_adjustment_type_check" CHECK (((adjustment_type IS NULL) OR (adjustment_type = ANY (ARRAY['correction'::text, 'void'::text])))),
  CONSTRAINT "field_contribution_events_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "field_contribution_events_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE RESTRICT,
  CONSTRAINT "field_contribution_events_collector_user_id_device_event_id_key" UNIQUE (collector_user_id, device_event_id),
  CONSTRAINT "field_contribution_events_collector_user_id_fkey" FOREIGN KEY (collector_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT "field_contribution_events_lifecycle_status_check"
    CHECK ((lifecycle_status = ANY (ARRAY['recorded_offline'::text, 'pending_sync'::text, 'synced'::text, 'corrected'::text, 'voided'::text]))),
  CONSTRAINT "field_contribution_events_obligation_type_check" CHECK (((obligation_type IS NULL) OR (obligation_type = ANY (ARRAY['recurring'::text, 'rotation'::text])))),
  CONSTRAINT "field_contribution_events_payment_method_check"
    CHECK ((payment_method = ANY (ARRAY['cash'::text, 'bank_transfer_manual'::text, 'pos_manual'::text, 'other_manual'::text]))),
  CONSTRAINT "field_contribution_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "field_contribution_events_correction_of_event_id_fkey" FOREIGN KEY (correction_of_event_id) REFERENCES public.field_contribution_events(id) ON DELETE RESTRICT,
  CONSTRAINT "field_contribution_events_receipt_reference_key" UNIQUE (receipt_reference),
  CONSTRAINT "field_contribution_events_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE RESTRICT
);

ALTER TABLE "public"."field_contribution_events"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX field_contribution_events_collection_idx ON public.field_contribution_events USING btree (collection_id, created_at DESC);

CREATE INDEX field_contribution_events_collector_created_idx ON public.field_contribution_events USING btree (collector_user_id, created_at DESC);

CREATE INDEX field_contribution_events_collector_idx ON public.field_contribution_events USING btree (collector_user_id, created_at DESC);

CREATE INDEX field_contribution_events_correction_of_idx ON public.field_contribution_events USING btree (correction_of_event_id);

CREATE INDEX field_contribution_events_participant_idx ON public.field_contribution_events USING btree (participant_id, created_at DESC);

CREATE INDEX field_contribution_events_sync_status_idx ON public.field_contribution_events USING btree (lifecycle_status, created_at DESC);

CREATE INDEX idx_field_contribution_events_obligation ON public.field_contribution_events USING btree (obligation_type, obligation_id)
  WHERE (obligation_id IS NOT NULL);

CREATE TRIGGER trg_reconcile_field_obligation
  AFTER INSERT OR UPDATE ON public.field_contribution_events
  FOR EACH ROW
  EXECUTE FUNCTION public.reconcile_field_obligation_from_event();

CREATE TRIGGER trg_validate_field_obligation_link
  BEFORE INSERT OR UPDATE OF obligation_type, obligation_id, collection_id, participant_id ON public.field_contribution_events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_field_obligation_link();

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."field_contribution_events" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."field_contribution_events" TO "service_role";

COMMENT ON COLUMN "public"."field_contribution_events"."device_event_id" IS 'Client/device-generated immutable event identifier used for idempotent offline synchronization.';

COMMENT ON COLUMN "public"."field_contribution_events"."lifecycle_status" IS 'Offline/manual lifecycle: recorded_offline -> pending_sync -> synced. Corrections and voids remain auditable instead of overwriting the original event.';

COMMENT ON TABLE "public"."field_contribution_events" IS 'Auditable field/manual contribution events. These are separate from electronically verified payment transactions.';

REVOKE ALL ON TABLE "public"."field_contribution_events" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."field_contribution_events" TO "postgres";
