CREATE TABLE "public"."organizations" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "owner_id"          uuid                     NOT NULL,
  "name"              text                     NOT NULL,
  "organization_type" text                     NOT NULL DEFAULT 'personal'::text,
  "slug"              text,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "organizations_organization_type_check"
    CHECK ((organization_type = ANY (ARRAY['personal'::text, 'society'::text, 'association'::text, 'business'::text, 'event_organizer'::text, 'other'::text]))),
  CONSTRAINT "organizations_pkey" PRIMARY KEY (id),
  CONSTRAINT "organizations_slug_key" UNIQUE (slug),
  CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE RESTRICT
);

ALTER TABLE "public"."organizations"
  ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX organizations_one_personal_per_owner_idx ON public.organizations USING btree (owner_id)
  WHERE (organization_type = 'personal'::text);

CREATE POLICY "Owners can create organizations" ON "public"."organizations"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));

CREATE POLICY "Owners can delete their organizations" ON "public"."organizations"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = owner_id));

CREATE POLICY "Owners can update their organizations" ON "public"."organizations"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = owner_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));

CREATE POLICY "Owners can view their organizations" ON "public"."organizations"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = owner_id));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organizations" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organizations" TO "service_role";

REVOKE ALL ON TABLE "public"."organizations" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."organizations" TO "postgres";
