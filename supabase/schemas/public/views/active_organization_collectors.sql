CREATE VIEW "public"."active_organization_collectors" AS  SELECT id,
    organization_id,
    user_id,
    assigned_by_user_id,
    assigned_at
   FROM public.organization_collectors
  WHERE ((is_active = true) AND (revoked_at IS NULL));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."active_organization_collectors" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."active_organization_collectors" TO "service_role";

REVOKE ALL ON TABLE "public"."active_organization_collectors" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."active_organization_collectors" TO "postgres";
