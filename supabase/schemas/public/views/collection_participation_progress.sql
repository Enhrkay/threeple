CREATE VIEW "public"."collection_participation_progress" WITH (security_invoker=true) AS  SELECT c.id AS collection_id,
    c.organization_id,
    c.title,
    c.collection_mode,
    c.contribution_amount_policy,
    c.currency,
    c.target_amount,
    c.expected_participant_count,
    c.calculated_contribution_amount,
    c.default_amount,
    c.financial_rules_locked,
    c.financial_rules_locked_at,
    (count(p.id) FILTER (WHERE (p.is_active = true)))::integer AS joined_participant_count,
    (GREATEST((COALESCE(c.expected_participant_count, 0) - count(p.id) FILTER (WHERE (p.is_active = true))), (0)::bigint))::integer AS remaining_participant_slots,
    (count(p.id) FILTER (WHERE ((p.is_active = true) AND (p.payment_status = 'paid'::text))))::integer AS paid_participant_count,
    (count(p.id) FILTER (WHERE ((p.is_active = true) AND (p.payment_status <> 'paid'::text))))::integer AS not_fully_paid_participant_count
   FROM (public.collections c
     LEFT JOIN public.participants p ON ((p.collection_id = c.id)))
  GROUP BY c.id;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_participation_progress" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_participation_progress" TO "service_role";

REVOKE ALL ON TABLE "public"."collection_participation_progress" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_participation_progress" TO "postgres";
