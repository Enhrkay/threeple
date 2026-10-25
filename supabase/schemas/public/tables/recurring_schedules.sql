CREATE TABLE "public"."recurring_schedules" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "collection_id"       uuid                     NOT NULL,
  "contribution_amount" numeric(18,2)            NOT NULL,
  "cadence"             text                     NOT NULL,
  "interval_count"      integer                  NOT NULL DEFAULT 1,
  "weekday"             smallint,
  "month_day"           smallint,
  "start_date"          date                     NOT NULL,
  "end_date"            date,
  "timezone"            text                     NOT NULL DEFAULT 'UTC'::text,
  "grace_days"          integer                  NOT NULL DEFAULT 0,
  "status"              text                     NOT NULL DEFAULT 'active'::text,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "recurring_schedules_cadence_check" CHECK ((cadence = ANY (ARRAY['weekly'::text, 'monthly'::text]))),
  CONSTRAINT "recurring_schedules_check1" CHECK (((end_date IS NULL) OR (end_date >= start_date))),
  CONSTRAINT "recurring_schedules_check" CHECK ((((cadence = 'weekly'::text) AND (weekday IS NOT NULL)) OR ((cadence = 'monthly'::text) AND (month_day IS NOT NULL)))),
  CONSTRAINT "recurring_schedules_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE,
  CONSTRAINT "recurring_schedules_collection_id_key" UNIQUE (collection_id),
  CONSTRAINT "recurring_schedules_contribution_amount_check" CHECK ((contribution_amount > (0)::numeric)),
  CONSTRAINT "recurring_schedules_grace_days_check" CHECK ((grace_days >= 0)),
  CONSTRAINT "recurring_schedules_interval_count_check" CHECK ((interval_count > 0)),
  CONSTRAINT "recurring_schedules_month_day_check" CHECK (((month_day IS NULL) OR ((month_day >= 1) AND (month_day <= 31)))),
  CONSTRAINT "recurring_schedules_pkey" PRIMARY KEY (id),
  CONSTRAINT "recurring_schedules_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'cancelled'::text]))),
  CONSTRAINT "recurring_schedules_weekday_check" CHECK (((weekday IS NULL) OR ((weekday >= 0) AND (weekday <= 6))))
);

ALTER TABLE "public"."recurring_schedules"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX recurring_schedules_collection_idx ON public.recurring_schedules USING btree (collection_id);

CREATE TRIGGER recurring_schedules_set_updated_at
  BEFORE UPDATE ON public.recurring_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER validate_recurring_schedule_trigger
  BEFORE INSERT OR UPDATE ON public.recurring_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_recurring_schedule();

CREATE POLICY "Managers can create recurring schedules" ON "public"."recurring_schedules"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.collections c
  WHERE ((c.id = recurring_schedules.collection_id) AND ((EXISTS ( SELECT 1
           FROM public.organizations o
          WHERE ((o.id = c.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM public.organization_members om
          WHERE ((om.organization_id = c.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text]))))))))));

CREATE POLICY "Managers can update recurring schedules" ON "public"."recurring_schedules"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.collections c
  WHERE ((c.id = recurring_schedules.collection_id) AND ((EXISTS ( SELECT 1
           FROM public.organizations o
          WHERE ((o.id = c.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM public.organization_members om
          WHERE ((om.organization_id = c.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text]))))))))));

CREATE POLICY "Managers can view recurring schedules" ON "public"."recurring_schedules"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.collections c
  WHERE ((c.id = recurring_schedules.collection_id) AND ((EXISTS ( SELECT 1
           FROM public.organizations o
          WHERE ((o.id = c.organization_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM public.organization_members om
          WHERE ((om.organization_id = c.organization_id) AND (om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = ANY (ARRAY['admin'::text, 'treasurer'::text]))))))))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_schedules" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_schedules" TO "service_role";

REVOKE ALL ON TABLE "public"."recurring_schedules" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_schedules" TO "postgres";
