CREATE TABLE "public"."platform_admins" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "role"       text                     NOT NULL,
  "is_active"  boolean                  NOT NULL DEFAULT true,
  "granted_by" uuid,
  "notes"      text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "platform_admins_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "platform_admins_pkey" PRIMARY KEY (id),
  CONSTRAINT "platform_admins_role_check" CHECK ((role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'support'::text, 'risk_ops'::text]))),
  CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "platform_admins_user_id_key" UNIQUE (user_id)
);

ALTER TABLE "public"."platform_admins"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX platform_admins_active_role_idx ON public.platform_admins USING btree (is_active, ROLE);

CREATE TRIGGER platform_admins_set_updated_at
  BEFORE UPDATE ON public.platform_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.set_platform_admin_updated_at();

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_admins" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_admins" TO "service_role";

REVOKE ALL ON TABLE "public"."platform_admins" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_admins" TO "postgres";
