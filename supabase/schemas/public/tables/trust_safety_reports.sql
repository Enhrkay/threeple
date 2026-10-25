CREATE TABLE "public"."trust_safety_reports" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "report_reference"  text                     NOT NULL,
  "reporter_user_id"  uuid,
  "reporter_name"     text,
  "reporter_email"    text,
  "subject_type"      text                     NOT NULL,
  "subject_id"        uuid                     NOT NULL,
  "collection_id"     uuid,
  "category"          text                     NOT NULL,
  "priority"          text                     NOT NULL DEFAULT 'normal'::text,
  "status"            text                     NOT NULL DEFAULT 'open'::text,
  "description"       text                     NOT NULL,
  "assigned_admin_id" uuid,
  "resolution_notes"  text,
  "resolved_by"       uuid,
  "resolved_at"       timestamp with time zone,
  "metadata"          jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "trust_safety_reports_assigned_admin_id_fkey" FOREIGN KEY (assigned_admin_id) REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  CONSTRAINT "trust_safety_reports_category_check"
    CHECK
    ((category = ANY (ARRAY['fraud_suspicion'::text, 'misleading_collection'::text, 'harassment'::text, 'impersonation'::text, 'unauthorized_collection'::text,
    'abusive_content'::text, 'privacy_concern'::text, 'payment_dispute'::text, 'spam'::text, 'other'::text]))),
  CONSTRAINT "trust_safety_reports_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE SET NULL,
  CONSTRAINT "trust_safety_reports_pkey" PRIMARY KEY (id),
  CONSTRAINT "trust_safety_reports_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
  CONSTRAINT "trust_safety_reports_report_reference_key" UNIQUE (report_reference),
  CONSTRAINT "trust_safety_reports_reporter_user_id_fkey" FOREIGN KEY (reporter_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "trust_safety_reports_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "trust_safety_reports_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'under_review'::text, 'action_required'::text, 'resolved'::text, 'dismissed'::text]))),
  CONSTRAINT "trust_safety_reports_subject_type_check" CHECK ((subject_type = ANY (ARRAY['user'::text, 'organization'::text, 'collection'::text, 'participant'::text])))
);

ALTER TABLE "public"."trust_safety_reports"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX trust_safety_reports_assigned_admin_idx ON public.trust_safety_reports USING btree (assigned_admin_id, status, created_at DESC);

CREATE INDEX trust_safety_reports_collection_idx ON public.trust_safety_reports USING btree (collection_id, created_at DESC);

CREATE INDEX trust_safety_reports_status_idx ON public.trust_safety_reports USING btree (status, priority, created_at DESC);

CREATE INDEX trust_safety_reports_subject_idx ON public.trust_safety_reports USING btree (subject_type, subject_id, created_at DESC);

CREATE TRIGGER trust_safety_report_reference
  BEFORE INSERT ON public.trust_safety_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trust_safety_reference();

CREATE TRIGGER trust_safety_reports_updated_at
  BEFORE UPDATE ON public.trust_safety_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trust_safety_updated_at();

CREATE TRIGGER trust_safety_resolution_validation
  BEFORE INSERT OR UPDATE ON public.trust_safety_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_trust_safety_resolution();

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."trust_safety_reports" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."trust_safety_reports" TO "service_role";

REVOKE ALL ON TABLE "public"."trust_safety_reports" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."trust_safety_reports" TO "postgres";
