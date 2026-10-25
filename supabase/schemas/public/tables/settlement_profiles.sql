CREATE TABLE "public"."settlement_profiles" (
  "id"                           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "beneficiary_type"             text                     NOT NULL,
  "organization_id"              uuid,
  "participant_id"               uuid,
  "created_by"                   uuid,
  "display_name"                 text                     NOT NULL,
  "provider"                     text                     NOT NULL DEFAULT 'paystack'::text,
  "currency"                     text                     NOT NULL DEFAULT 'NGN'::text,
  "country_code"                 text                     NOT NULL DEFAULT 'NG'::text,
  "bank_code"                    text,
  "bank_name"                    text,
  "account_name"                 text,
  "account_last4"                text,
  "provider_recipient_reference" text,
  "verification_status"          text                     NOT NULL DEFAULT 'pending'::text,
  "account_resolved_at"          timestamp with time zone,
  "provider_connected_at"        timestamp with time zone,
  "provider_verified_at"         timestamp with time zone,
  "is_active"                    boolean                  NOT NULL DEFAULT true,
  "metadata"                     jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"                   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "settlement_profiles_account_last4_check" CHECK (((account_last4 IS NULL) OR (char_length(account_last4) = 4))),
  CONSTRAINT "settlement_profiles_beneficiary_type_check" CHECK ((beneficiary_type = ANY (ARRAY['organization'::text, 'participant'::text]))),
  CONSTRAINT "settlement_profiles_check" CHECK ((((beneficiary_type = 'organization'::text) AND (organization_id IS
    NOT NULL) AND (participant_id IS NULL)) OR ((beneficiary_type = 'participant'::text) AND (participant_id IS NOT NULL) AND (organization_id IS NULL)))),
  CONSTRAINT "settlement_profiles_country_code_check" CHECK ((char_length(country_code) = 2)),
  CONSTRAINT "settlement_profiles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT "settlement_profiles_currency_check" CHECK ((char_length(currency) = 3)),
  CONSTRAINT "settlement_profiles_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT "settlement_profiles_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE,
  CONSTRAINT "settlement_profiles_pkey" PRIMARY KEY (id),
  CONSTRAINT "settlement_profiles_provider_recipient_reference_key" UNIQUE (provider_recipient_reference),
  CONSTRAINT "settlement_profiles_verification_status_check"
    CHECK
    ((verification_status = ANY (ARRAY['pending'::text, 'account_resolved'::text, 'provider_connected'::text, 'provider_verified'::text, 'rejected'::text, 'disabled'::text])))
);

ALTER TABLE "public"."settlement_profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX settlement_profiles_organization_idx ON public.settlement_profiles USING btree (organization_id);

CREATE INDEX settlement_profiles_participant_idx ON public.settlement_profiles USING btree (participant_id);

CREATE INDEX settlement_profiles_status_idx ON public.settlement_profiles USING btree (verification_status);

CREATE TRIGGER settlement_profiles_set_updated_at
  BEFORE UPDATE ON public.settlement_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Organization admins can view settlement profiles" ON "public"."settlement_profiles"
  FOR SELECT
  TO "authenticated"
  USING (((beneficiary_type = 'organization'::text) AND (EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = settlement_profiles.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = 'admin'::text))))));

CREATE POLICY "Organization owners can view settlement profiles" ON "public"."settlement_profiles"
  FOR SELECT
  TO "authenticated"
  USING (((beneficiary_type = 'organization'::text) AND (EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = settlement_profiles.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "Owners can view participant settlement destinations" ON "public"."settlement_profiles"
  FOR SELECT
  TO "authenticated"
  USING (((beneficiary_type = 'participant'::text) AND (EXISTS ( SELECT 1
   FROM ((public.participants p
     JOIN public.collections c ON ((c.id = p.collection_id)))
     JOIN public.organizations o ON ((o.id = c.organization_id)))
  WHERE ((p.id = settlement_profiles.participant_id) AND (o.owner_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "Participants can view own settlement profile" ON "public"."settlement_profiles"
  FOR SELECT
  TO "authenticated"
  USING (((beneficiary_type = 'participant'::text) AND (EXISTS ( SELECT 1
   FROM public.participants p
  WHERE ((p.id = settlement_profiles.participant_id) AND (p.user_id = ( SELECT auth.uid() AS uid)))))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."settlement_profiles" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."settlement_profiles" TO "service_role";

REVOKE ALL ON TABLE "public"."settlement_profiles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."settlement_profiles" TO "postgres";
