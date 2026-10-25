CREATE VIEW "public"."collection_financial_summary" WITH (security_invoker=true) AS  SELECT c.id AS collection_id,
    c.organization_id,
    c.currency,
    (count(p.id) FILTER (WHERE ((p.verified_at IS NOT NULL) AND (p.status = ANY (ARRAY['success'::text, 'partially_refunded'::text, 'refunded'::text])))))::integer AS verified_payment_count,
    COALESCE(sum(GREATEST((COALESCE(p.amount, (0)::numeric) - COALESCE(p.refunded_amount, (0)::numeric)), (0)::numeric)) FILTER (WHERE ((p.verified_at IS NOT NULL) AND (p.status = ANY (ARRAY['success'::text, 'partially_refunded'::text, 'refunded'::text])))), (0)::numeric) AS effective_gross_amount,
    COALESCE(sum(COALESCE(p.platform_fee_amount, (0)::numeric)) FILTER (WHERE ((p.verified_at IS NOT NULL) AND (p.status = ANY (ARRAY['success'::text, 'partially_refunded'::text, 'refunded'::text])))), (0)::numeric) AS platform_fee_amount,
    COALESCE(sum(COALESCE(p.processor_fee_amount, (0)::numeric)) FILTER (WHERE ((p.verified_at IS NOT NULL) AND (p.status = ANY (ARRAY['success'::text, 'partially_refunded'::text, 'refunded'::text])))), (0)::numeric) AS processor_fee_amount,
    COALESCE(sum(COALESCE(p.organizer_net_amount, (0)::numeric)) FILTER (WHERE ((p.verified_at IS NOT NULL) AND (p.status = ANY (ARRAY['success'::text, 'partially_refunded'::text, 'refunded'::text])))), (0)::numeric) AS organizer_net_amount
   FROM (public.collections c
     LEFT JOIN public.payments p ON ((p.collection_id = c.id)))
  GROUP BY c.id, c.organization_id, c.currency;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_financial_summary" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_financial_summary" TO "service_role";

REVOKE ALL ON TABLE "public"."collection_financial_summary" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_financial_summary" TO "postgres";
