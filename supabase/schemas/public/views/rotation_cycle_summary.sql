CREATE VIEW "public"."rotation_cycle_summary" WITH (security_invoker=true) AS  SELECT rc.id AS cycle_id,
    rc.collection_id,
    rc.cycle_number,
    rc.recipient_participant_id,
    p.full_name AS recipient_name,
    rc.scheduled_date,
    rc.status,
    rc.contribution_amount,
    rc.expected_member_count,
    rc.expected_gross_amount,
    (count(rco.id))::integer AS obligation_count,
    (count(rco.id) FILTER (WHERE (rco.status = 'paid'::text)))::integer AS paid_member_count,
    (count(rco.id) FILTER (WHERE (rco.status = ANY (ARRAY['pending'::text, 'partial'::text]))))::integer AS outstanding_member_count,
    COALESCE(sum(rco.amount_paid), (0)::numeric) AS collected_amount,
    GREATEST((rc.expected_gross_amount - COALESCE(sum(rco.amount_paid), (0)::numeric)), (0)::numeric) AS outstanding_amount,
    rc.coordinator_fee_amount,
    rc.threeple_platform_fee_amount,
    rc.processor_fee_amount,
    rc.expected_recipient_net
   FROM ((public.rotation_cycles rc
     JOIN public.participants p ON ((p.id = rc.recipient_participant_id)))
     LEFT JOIN public.rotation_cycle_obligations rco ON ((rco.cycle_id = rc.id)))
  GROUP BY rc.id, rc.collection_id, rc.cycle_number, rc.recipient_participant_id, p.full_name, rc.scheduled_date, rc.status, rc.contribution_amount, rc.expected_member_count, rc.expected_gross_amount, rc.coordinator_fee_amount, rc.threeple_platform_fee_amount, rc.processor_fee_amount, rc.expected_recipient_net;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_cycle_summary" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_cycle_summary" TO "service_role";

REVOKE ALL ON TABLE "public"."rotation_cycle_summary" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_cycle_summary" TO "postgres";
