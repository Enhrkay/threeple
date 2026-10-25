CREATE TABLE "public"."collections" (
  "id"                             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"                uuid                     NOT NULL,
  "created_by"                     uuid                     NOT NULL,
  "title"                          text                     NOT NULL,
  "description"                    text,
  "collection_type"                text                     NOT NULL,
  "collection_mode"                text                     NOT NULL,
  "currency"                       text                     NOT NULL DEFAULT 'NGN'::text,
  "target_amount"                  numeric(18,2),
  "default_amount"                 numeric(18,2),
  "allow_partial_payments"         boolean                  NOT NULL DEFAULT false,
  "allow_custom_amount"            boolean                  NOT NULL DEFAULT false,
  "deadline"                       timestamp with time zone,
  "join_code"                      text                     NOT NULL DEFAULT upper(substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 8)),
  "public_slug"                    text,
  "visibility"                     text                     NOT NULL DEFAULT 'private'::text,
  "show_participant_names"         boolean                  NOT NULL DEFAULT false,
  "show_payment_amounts"           boolean                  NOT NULL DEFAULT false,
  "requires_approval"              boolean                  NOT NULL DEFAULT false,
  "access_mode"                    text                     NOT NULL DEFAULT 'none'::text,
  "status"                         text                     NOT NULL DEFAULT 'draft'::text,
  "created_at"                     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                     timestamp with time zone NOT NULL DEFAULT now(),
  "closed_at"                      timestamp with time zone,
  "archived_at"                    timestamp with time zone,
  "contribution_amount_policy"     text,
  "expected_participant_count"     integer,
  "calculated_contribution_amount" numeric(18,2),
  "financial_rules_locked"         boolean                  NOT NULL DEFAULT false,
  "financial_rules_locked_at"      timestamp with time zone,
  "financial_rules_locked_reason"  text,
  CONSTRAINT "collections_access_mode_check" CHECK ((access_mode = ANY (ARRAY['none'::text, 'approval'::text, 'seat'::text, 'ticket'::text]))),
  CONSTRAINT "collections_collection_mode_check"
    CHECK ((collection_mode = ANY (ARRAY['target'::text, 'fixed_per_person'::text, 'flexible'::text, 'event_fee'::text, 'recurring_dues'::text, 'rotating_pool'::text]))),
  CONSTRAINT "collections_collection_type_check"
    CHECK
    ((collection_type = ANY (ARRAY['wedding'::text, 'event'::text, 'society_dues'::text, 'association_dues'::text, 'group_contribution'::text, 'project_fund'::text, 'trip'::text,
    'shared_gift'::text, 'levy'::text, 'community_fund'::text, 'other'::text]))),
  CONSTRAINT "collections_contribution_amount_policy_check"
    CHECK
    (((contribution_amount_policy IS NULL) OR (contribution_amount_policy = ANY (ARRAY['calculated_equal_share'::text, 'fixed_per_person'::text, 'flexible'::text,
    'schedule_based'::text])))),
  CONSTRAINT "collections_currency_check" CHECK ((char_length(currency) = 3)),
  CONSTRAINT "collections_default_amount_check" CHECK (((default_amount IS NULL) OR (default_amount > (0)::numeric))),
  CONSTRAINT "collections_expected_participant_count_check" CHECK (((expected_participant_count IS NULL) OR (expected_participant_count > 0))),
  CONSTRAINT "collections_join_code_key" UNIQUE (join_code),
  CONSTRAINT "collections_pkey" PRIMARY KEY (id),
  CONSTRAINT "collections_public_slug_key" UNIQUE (public_slug),
  CONSTRAINT "collections_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'closed'::text, 'cancelled'::text]))),
  CONSTRAINT "collections_target_amount_check" CHECK (((target_amount IS NULL) OR (target_amount >= (0)::numeric))),
  CONSTRAINT "collections_visibility_check" CHECK ((visibility = ANY (ARRAY['private'::text, 'summary'::text, 'public'::text]))),
  CONSTRAINT "collections_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT "collections_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT
);

ALTER TABLE "public"."collections"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX collections_created_by_idx ON public.collections USING btree (created_by);

CREATE INDEX collections_join_code_idx ON public.collections USING btree (join_code);

CREATE INDEX collections_mode_idx ON public.collections USING btree (collection_mode);

CREATE INDEX collections_organization_archived_idx ON public.collections USING btree (organization_id, archived_at, created_at DESC);

CREATE INDEX collections_organization_id_idx ON public.collections USING btree (organization_id);

CREATE INDEX collections_status_idx ON public.collections USING btree (status);

CREATE TRIGGER collections_apply_contribution_rules
  BEFORE INSERT OR UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_collection_contribution_rules();

CREATE TRIGGER collections_set_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Managers can create collections" ON "public"."collections"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) AND ((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = collections.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = collections.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text]))))))));

CREATE POLICY "Managers can update collections" ON "public"."collections"
  FOR UPDATE
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = collections.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = collections.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text])))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = collections.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = collections.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text])))))));

CREATE POLICY "Organization users can view collections" ON "public"."collections"
  FOR SELECT
  TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = collections.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = collections.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "Owners and admins can delete collections" ON "public"."collections"
  FOR DELETE
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = collections.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = collections.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = 'admin'::text))))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collections" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collections" TO "service_role";

REVOKE ALL ON TABLE "public"."collections" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collections" TO "postgres";
