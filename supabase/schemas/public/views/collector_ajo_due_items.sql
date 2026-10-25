CREATE VIEW "public"."collector_ajo_due_items" AS  SELECT o.id AS obligation_id,
    c.id AS cycle_id,
    c.collection_id,
    o.participant_id,
    c.recipient_participant_id,
    COALESCE(o.amount_due, (0)::numeric) AS expected_amount,
    COALESCE(o.amount_paid, (0)::numeric) AS paid_amount,
    GREATEST((COALESCE(o.amount_due, (0)::numeric) - COALESCE(o.amount_paid, (0)::numeric)), (0)::numeric) AS outstanding_amount,
    COALESCE(o.status, 'pending'::text) AS obligation_status,
    COALESCE(c.status, 'scheduled'::text) AS cycle_status,
    NULL::date AS due_on,
    NULL::date AS starts_on,
    NULL::date AS ends_on,
    ((lower(COALESCE(o.status, 'pending'::text)) <> ALL (ARRAY['paid'::text, 'settled'::text, 'complete'::text, 'completed'::text, 'verified'::text, 'waived'::text, 'cancelled'::text])) AND (COALESCE(o.amount_paid, (0)::numeric) < COALESCE(o.amount_due, (0)::numeric))) AS is_outstanding,
    c.cycle_number
   FROM (public.rotation_cycle_obligations o
     JOIN public.rotation_cycles c ON ((c.id = o.cycle_id)));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collector_ajo_due_items" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collector_ajo_due_items" TO "service_role";

REVOKE ALL ON TABLE "public"."collector_ajo_due_items" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collector_ajo_due_items" TO "postgres";
