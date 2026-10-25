CREATE VIEW "public"."platform_revenue_summary" WITH (security_invoker=true) AS  SELECT COALESCE(currency, 'UNKNOWN'::text) AS currency,
    (count(*))::integer AS verified_payment_count,
    COALESCE(sum(GREATEST((COALESCE(amount, (0)::numeric) - COALESCE(refunded_amount, (0)::numeric)), (0)::numeric)), (0)::numeric) AS effective_gross_amount,
    COALESCE(sum(COALESCE(platform_fee_amount, (0)::numeric)), (0)::numeric) AS platform_revenue,
    COALESCE(sum(COALESCE(processor_fee_amount, (0)::numeric)), (0)::numeric) AS processor_fees,
    COALESCE(sum(COALESCE(organizer_net_amount, (0)::numeric)), (0)::numeric) AS organizer_net_amount
   FROM public.payments p
  WHERE ((verified_at IS NOT NULL) AND (status = ANY (ARRAY['success'::text, 'partially_refunded'::text, 'refunded'::text])))
  GROUP BY currency;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_revenue_summary" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_revenue_summary" TO "service_role";

REVOKE ALL ON TABLE "public"."platform_revenue_summary" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_revenue_summary" TO "postgres";
