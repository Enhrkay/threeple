CREATE VIEW "public"."collection_capacity_summary" WITH (security_invoker=true) AS  SELECT c.id AS collection_id,
    c.organization_id,
    c.title,
    c.status,
    c.currency,
    c.contribution_amount_policy,
    c.target_amount,
    c.expected_participant_count,
    c.calculated_contribution_amount,
    c.default_amount,
    (count(p.id) FILTER (WHERE (p.is_active = true)))::integer AS joined_participants,
        CASE
            WHEN (c.expected_participant_count IS NULL) THEN NULL::integer
            ELSE GREATEST((c.expected_participant_count - (count(p.id) FILTER (WHERE (p.is_active = true)))::integer), 0)
        END AS remaining_slots,
        CASE
            WHEN (c.expected_participant_count IS NULL) THEN false
            ELSE (count(p.id) FILTER (WHERE (p.is_active = true)) >= c.expected_participant_count)
        END AS is_full
   FROM (public.collections c
     LEFT JOIN public.participants p ON ((p.collection_id = c.id)))
  GROUP BY c.id;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_capacity_summary" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_capacity_summary" TO "service_role";

REVOKE ALL ON TABLE "public"."collection_capacity_summary" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_capacity_summary" TO "postgres";
