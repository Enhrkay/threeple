CREATE TABLE "public"."organization_collectors" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"     uuid                     NOT NULL,
  "user_id"             uuid                     NOT NULL,
  "is_active"           boolean                  NOT NULL DEFAULT true,
  "assigned_by_user_id" uuid,
  "assigned_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "revoked_at"          timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "organization_collectors_assigned_by_user_id_fkey" FOREIGN KEY (assigned_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "organization_collectors_organization_id_user_id_key" UNIQUE (organization_id, user_id),
  CONSTRAINT "organization_collectors_pkey" PRIMARY KEY (id),
  CONSTRAINT "organization_collectors_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "organization_collectors_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE "public"."organization_collectors"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX organization_collectors_org_active_idx ON public.organization_collectors USING btree (organization_id, is_active);

CREATE INDEX organization_collectors_user_active_idx ON public.organization_collectors USING btree (user_id, is_active);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organization_collectors" TO "service_role";

REVOKE ALL ON TABLE "public"."organization_collectors" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organization_collectors" TO "postgres";

REVOKE ALL ON TABLE "public"."organization_collectors" FROM "anon", "authenticated";
