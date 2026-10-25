CREATE TABLE "public"."organization_members" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" uuid                     NOT NULL,
  "user_id"         uuid                     NOT NULL,
  "role"            text                     NOT NULL DEFAULT 'member'::text,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE (organization_id, user_id),
  CONSTRAINT "organization_members_pkey" PRIMARY KEY (id),
  CONSTRAINT "organization_members_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'treasurer'::text, 'member'::text]))),
  CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE "public"."organization_members"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization owners can add members" ON "public"."organization_members"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = organization_members.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Organization owners can remove members" ON "public"."organization_members"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = organization_members.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Organization owners can update members" ON "public"."organization_members"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = organization_members.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = organization_members.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Organization owners can view members" ON "public"."organization_members"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = organization_members.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Users can view own memberships" ON "public"."organization_members"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organization_members" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organization_members" TO "service_role";

REVOKE ALL ON TABLE "public"."organization_members" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organization_members" TO "postgres";
