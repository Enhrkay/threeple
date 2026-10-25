CREATE VIEW "public"."recurring_due_items" AS  SELECT o.id AS obligation_id,
    o.collection_id,
    o.participant_id,
    o.expected_amount,
    o.status AS obligation_status,
    o.paid_amount,
    c.id AS cycle_id,
    c.cycle_number,
    c.starts_on,
    c.due_on,
    c.ends_on,
    c.status AS cycle_status
   FROM (public.recurring_cycle_obligations o
     JOIN public.recurring_cycles c ON ((c.id = o.cycle_id)))
  WHERE ((o.status = ANY (ARRAY['pending'::text, 'partially_paid'::text])) AND (c.status = ANY (ARRAY['scheduled'::text, 'collecting'::text, 'closed'::text])));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_due_items" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_due_items" TO "service_role";

REVOKE ALL ON TABLE "public"."recurring_due_items" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_due_items" TO "postgres";
