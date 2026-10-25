CREATE TABLE "public"."collection_beneficiaries" (
  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "collection_id"         uuid                     NOT NULL,
  "settlement_profile_id" uuid                     NOT NULL,
  "beneficiary_role"      text                     NOT NULL DEFAULT 'primary'::text,
  "is_active"             boolean                  NOT NULL DEFAULT true,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "collection_beneficiaries_beneficiary_role_check" CHECK ((beneficiary_role = ANY (ARRAY['primary'::text, 'eligible_cycle_recipient'::text]))),
  CONSTRAINT "collection_beneficiaries_collection_id_settlement_profile_i_key" UNIQUE (collection_id, settlement_profile_id),
  CONSTRAINT "collection_beneficiaries_pkey" PRIMARY KEY (id),
  CONSTRAINT "collection_beneficiaries_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE,
  CONSTRAINT "collection_beneficiaries_settlement_profile_id_fkey" FOREIGN KEY (settlement_profile_id) REFERENCES public.settlement_profiles(id) ON DELETE RESTRICT
);

ALTER TABLE "public"."collection_beneficiaries"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX collection_beneficiaries_collection_idx ON public.collection_beneficiaries USING btree (collection_id);

CREATE INDEX collection_beneficiaries_profile_idx ON public.collection_beneficiaries USING btree (settlement_profile_id);

CREATE UNIQUE INDEX collection_one_active_primary_beneficiary_idx ON public.collection_beneficiaries USING btree (collection_id)
  WHERE ((beneficiary_role = 'primary'::text) AND (is_active = true));

CREATE TRIGGER collection_beneficiaries_set_updated_at
  BEFORE UPDATE ON public.collection_beneficiaries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Admins can view collection beneficiaries" ON "public"."collection_beneficiaries"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM (public.collections c
     JOIN public.organization_members om ON ((om.organization_id = c.organization_id)))
  WHERE ((c.id = collection_beneficiaries.collection_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = 'admin'::text)))));

CREATE POLICY "Owners can view collection beneficiaries" ON "public"."collection_beneficiaries"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM (public.collections c
     JOIN public.organizations o ON ((o.id = c.organization_id)))
  WHERE ((c.id = collection_beneficiaries.collection_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_beneficiaries" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_beneficiaries" TO "service_role";

REVOKE ALL ON TABLE "public"."collection_beneficiaries" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_beneficiaries" TO "postgres";
