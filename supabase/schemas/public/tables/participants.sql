CREATE TABLE "public"."participants" (
  "id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "collection_id"        uuid                     NOT NULL,
  "user_id"              uuid,
  "full_name"            text                     NOT NULL,
  "email"                text,
  "phone"                text,
  "expected_amount"      numeric(18,2),
  "payment_status"       text                     NOT NULL DEFAULT 'unpaid'::text,
  "participation_status" text                     NOT NULL DEFAULT 'joined'::text,
  "access_reference"     text,
  "join_method"          text                     NOT NULL DEFAULT 'code'::text,
  "invited_by"           uuid,
  "invited_at"           timestamp with time zone,
  "joined_at"            timestamp with time zone DEFAULT now(),
  "approved_at"          timestamp with time zone,
  "is_active"            boolean                  NOT NULL DEFAULT true,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "payment_access_token" uuid                     NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT "participants_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE,
  CONSTRAINT "participants_expected_amount_check" CHECK (((expected_amount IS NULL) OR (expected_amount >= (0)::numeric))),
  CONSTRAINT "participants_join_method_check" CHECK ((join_method = ANY (ARRAY['code'::text, 'link'::text, 'organizer_added'::text, 'imported'::text, 'invitation'::text]))),
  CONSTRAINT "participants_participation_status_check"
    CHECK
    ((participation_status = ANY (ARRAY['invited'::text, 'joined'::text, 'approval_pending'::text, 'approved'::text, 'access_assigned'::text, 'declined'::text,
    'cancelled'::text]))),
  CONSTRAINT "participants_payment_status_check"
    CHECK
    ((payment_status = ANY (ARRAY['not_required'::text, 'unpaid'::text, 'pending'::text, 'partial'::text, 'paid'::text, 'overdue'::text, 'refunded'::text, 'exempted'::text]))),
  CONSTRAINT "participants_pkey" PRIMARY KEY (id),
  CONSTRAINT "participants_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT "participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE "public"."participants"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX participants_collection_id_idx ON public.participants USING btree (collection_id);

CREATE INDEX participants_email_idx ON public.participants USING btree (email);

CREATE UNIQUE INDEX participants_one_active_email_per_collection_uq ON public.participants USING btree (collection_id, lower(TRIM(BOTH FROM email)))
  WHERE ((is_active = true) AND (email IS NOT NULL) AND (TRIM(BOTH FROM email) <> ''::text));

CREATE UNIQUE INDEX participants_one_active_user_per_collection_uq ON public.participants USING btree (collection_id, user_id)
  WHERE ((is_active = true) AND (user_id IS NOT NULL));

CREATE INDEX participants_participation_status_idx ON public.participants USING btree (participation_status);

CREATE UNIQUE INDEX participants_payment_access_token_idx ON public.participants USING btree (payment_access_token);

CREATE INDEX participants_payment_status_idx ON public.participants USING btree (payment_status);

CREATE INDEX participants_phone_idx ON public.participants USING btree (phone);

CREATE UNIQUE INDEX participants_unique_email_per_collection_idx ON public.participants USING btree (collection_id, lower(email))
  WHERE ((email IS NOT NULL) AND (btrim(email) <> ''::text));

CREATE UNIQUE INDEX participants_unique_phone_per_collection_idx ON public.participants USING btree (collection_id, phone)
  WHERE ((phone IS NOT NULL) AND (btrim(phone) <> ''::text));

CREATE INDEX participants_user_id_idx ON public.participants USING btree (user_id);

CREATE TRIGGER participants_enforce_collection_rules
  BEFORE INSERT OR UPDATE OF collection_id, expected_amount, is_active ON public.participants
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_participant_collection_rules();

CREATE TRIGGER participants_set_updated_at
  BEFORE UPDATE ON public.participants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER protect_participant_payment_status_trigger
  BEFORE UPDATE ON public.participants
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_participant_payment_status();

CREATE POLICY "Managers can add participants" ON "public"."participants"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.collections c
     JOIN public.organization_members om ON ((om.organization_id = c.organization_id)))
  WHERE ((c.id = participants.collection_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text]))))));

CREATE POLICY "Managers can update participants" ON "public"."participants"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM (public.collections c
     JOIN public.organization_members om ON ((om.organization_id = c.organization_id)))
  WHERE ((c.id = participants.collection_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.collections c
     JOIN public.organization_members om ON ((om.organization_id = c.organization_id)))
  WHERE ((c.id = participants.collection_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text]))))));

CREATE POLICY "Managers can view participants" ON "public"."participants"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM (public.collections c
     JOIN public.organization_members om ON ((om.organization_id = c.organization_id)))
  WHERE ((c.id = participants.collection_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text]))))));

CREATE POLICY "Organization owners can add participants" ON "public"."participants"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.collections c
     JOIN public.organizations o ON ((o.id = c.organization_id)))
  WHERE ((c.id = participants.collection_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Organization owners can update participants" ON "public"."participants"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM (public.collections c
     JOIN public.organizations o ON ((o.id = c.organization_id)))
  WHERE ((c.id = participants.collection_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.collections c
     JOIN public.organizations o ON ((o.id = c.organization_id)))
  WHERE ((c.id = participants.collection_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Organization owners can view participants" ON "public"."participants"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM (public.collections c
     JOIN public.organizations o ON ((o.id = c.organization_id)))
  WHERE ((c.id = participants.collection_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Owners and admins can delete participants" ON "public"."participants"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.collections c
  WHERE ((c.id = participants.collection_id) AND ((EXISTS ( SELECT 1
           FROM public.organizations o
          WHERE ((o.id = c.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM public.organization_members om
          WHERE ((om.organization_id = c.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = 'admin'::text)))))))));

CREATE POLICY "Participants can view own participant record" ON "public"."participants"
  FOR SELECT
  TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (user_id = ( SELECT auth.uid() AS uid))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."participants" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."participants" TO "service_role";

REVOKE ALL ON TABLE "public"."participants" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."participants" TO "postgres";
