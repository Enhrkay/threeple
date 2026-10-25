CREATE VIEW "public"."field_contribution_effective_ledger" AS  WITH originals AS (
         SELECT e.id AS root_event_id,
            e.device_event_id,
            e.receipt_reference AS original_receipt_reference,
            e.collection_id,
            e.participant_id,
            e.collector_user_id,
            e.amount AS original_amount,
            e.currency,
            e.payment_method AS original_payment_method,
            e.lifecycle_status AS original_lifecycle_status,
            e.local_recorded_at,
            e.server_synced_at,
            e.note AS original_note,
            e.created_at AS original_created_at,
            e.obligation_type,
            e.obligation_id,
            e.cycle_id
           FROM public.field_contribution_events e
          WHERE (e.correction_of_event_id IS NULL)
        ), latest_adjustment AS (
         SELECT DISTINCT ON (a.correction_of_event_id) a.correction_of_event_id AS root_event_id,
            a.id AS adjustment_event_id,
            a.receipt_reference AS adjustment_receipt_reference,
            a.adjustment_type,
            a.amount AS adjustment_amount,
            a.payment_method AS adjustment_payment_method,
            a.lifecycle_status AS adjustment_lifecycle_status,
            a.note AS adjustment_note,
            a.correction_reason,
            a.adjusted_by_user_id,
            a.adjusted_at,
            a.created_at AS adjustment_created_at
           FROM public.field_contribution_events a
          WHERE (a.correction_of_event_id IS NOT NULL)
          ORDER BY a.correction_of_event_id, COALESCE(a.adjusted_at, a.created_at) DESC, a.created_at DESC, a.id DESC
        )
 SELECT o.root_event_id,
    o.device_event_id,
    o.original_receipt_reference,
    o.collection_id,
    o.participant_id,
    o.collector_user_id,
    o.original_amount,
        CASE
            WHEN (la.adjustment_type = 'void'::text) THEN (0)::numeric
            WHEN (la.adjustment_type = 'correction'::text) THEN la.adjustment_amount
            ELSE o.original_amount
        END AS effective_amount,
    o.currency,
        CASE
            WHEN (la.adjustment_type = 'correction'::text) THEN COALESCE(la.adjustment_payment_method, o.original_payment_method)
            ELSE o.original_payment_method
        END AS effective_payment_method,
        CASE
            WHEN (la.adjustment_type = 'void'::text) THEN 'voided'::text
            WHEN (la.adjustment_type = 'correction'::text) THEN 'corrected'::text
            ELSE o.original_lifecycle_status
        END AS effective_status,
        CASE
            WHEN (la.adjustment_type = 'void'::text) THEN true
            ELSE false
        END AS is_voided,
        CASE
            WHEN (la.adjustment_type = 'correction'::text) THEN true
            ELSE false
        END AS is_corrected,
    la.adjustment_event_id,
    la.adjustment_receipt_reference,
    la.adjustment_type,
    la.correction_reason,
    la.adjusted_by_user_id,
    la.adjusted_at,
    o.local_recorded_at,
    o.server_synced_at,
    o.original_note,
    o.original_created_at,
    o.obligation_type,
    o.obligation_id,
    o.cycle_id
   FROM (originals o
     LEFT JOIN latest_adjustment la ON ((la.root_event_id = o.root_event_id)));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."field_contribution_effective_ledger" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."field_contribution_effective_ledger" TO "service_role";

REVOKE ALL ON TABLE "public"."field_contribution_effective_ledger" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."field_contribution_effective_ledger" TO "postgres";
