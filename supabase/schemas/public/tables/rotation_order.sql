CREATE TABLE "public"."rotation_order" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "collection_id"  uuid                     NOT NULL,
  "participant_id" uuid                     NOT NULL,
  "position"       integer                  NOT NULL,
  "is_active"      boolean                  NOT NULL DEFAULT true,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "rotation_order_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE,
  CONSTRAINT "rotation_order_collection_id_participant_id_key" UNIQUE (collection_id, participant_id),
  CONSTRAINT "rotation_order_collection_id_position_key" UNIQUE (collection_id, "position"),
  CONSTRAINT "rotation_order_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE,
  CONSTRAINT "rotation_order_pkey" PRIMARY KEY (id),
  CONSTRAINT "rotation_order_position_check" CHECK (("position" > 0))
);

ALTER TABLE "public"."rotation_order"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX rotation_order_collection_idx ON public.rotation_order USING btree (collection_id);

CREATE TRIGGER validate_rotation_member_trigger
  BEFORE INSERT OR UPDATE ON public.rotation_order
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_rotation_member();

CREATE POLICY "Managers can manage rotation order" ON "public"."rotation_order"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.collections c
  WHERE ((c.id = rotation_order.collection_id) AND ((EXISTS ( SELECT 1
           FROM public.organizations o
          WHERE ((o.id = c.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM public.organization_members om
          WHERE ((om.organization_id = c.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text]))))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.collections c
  WHERE ((c.id = rotation_order.collection_id) AND ((EXISTS ( SELECT 1
           FROM public.organizations o
          WHERE ((o.id = c.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM public.organization_members om
          WHERE ((om.organization_id = c.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text]))))))))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_order" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_order" TO "service_role";

REVOKE ALL ON TABLE "public"."rotation_order" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rotation_order" TO "postgres";
