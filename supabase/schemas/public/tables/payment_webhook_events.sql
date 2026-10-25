CREATE TABLE "public"."payment_webhook_events" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "provider"           text                     NOT NULL,
  "event_type"         text                     NOT NULL,
  "dedupe_key"         text                     NOT NULL,
  "provider_reference" text,
  "signature_verified" boolean                  NOT NULL DEFAULT false,
  "processing_status"  text                     NOT NULL DEFAULT 'received'::text,
  "payload"            jsonb                    NOT NULL,
  "error_message"      text,
  "received_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "processed_at"       timestamp with time zone,
  CONSTRAINT "payment_webhook_events_dedupe_key_key" UNIQUE (dedupe_key),
  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "payment_webhook_events_processing_status_check" CHECK ((processing_status = ANY (ARRAY['received'::text, 'processed'::text, 'ignored'::text, 'failed'::text])))
);

ALTER TABLE "public"."payment_webhook_events"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX webhook_events_reference_idx ON public.payment_webhook_events USING btree (provider_reference);

CREATE INDEX webhook_events_status_idx ON public.payment_webhook_events USING btree (processing_status);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payment_webhook_events" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payment_webhook_events" TO "service_role";

REVOKE ALL ON TABLE "public"."payment_webhook_events" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payment_webhook_events" TO "postgres";
