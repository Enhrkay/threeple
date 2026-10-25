CREATE TABLE "public"."restriction_review_requests" (
  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "requester_user_id"      uuid                     NOT NULL,
  "restriction_scope"      text                     NOT NULL,
  "restriction_subject_id" uuid                     NOT NULL,
  "restriction_type"       text                     NOT NULL,
  "message"                text                     NOT NULL,
  "status"                 text                     NOT NULL DEFAULT 'submitted'::text,
  "reviewed_by"            uuid,
  "admin_notes"            text,
  "reviewed_at"            timestamp with time zone,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "restriction_id"         uuid,
  "trust_safety_report_id" uuid,
  CONSTRAINT "restriction_review_requests_message_check" CHECK ((char_length(TRIM(BOTH FROM message)) >= 20)),
  CONSTRAINT "restriction_review_requests_pkey" PRIMARY KEY (id),
  CONSTRAINT "restriction_review_requests_requester_user_id_fkey" FOREIGN KEY (requester_user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "restriction_review_requests_restriction_scope_check" CHECK ((restriction_scope = ANY (ARRAY['user'::text, 'organization'::text, 'collection'::text]))),
  CONSTRAINT "restriction_review_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "restriction_review_requests_status_check" CHECK ((status = ANY (ARRAY['submitted'::text, 'under_review'::text, 'approved'::text, 'declined'::text, 'closed'::text]))),
  CONSTRAINT "restriction_review_requests_trust_safety_report_id_fkey" FOREIGN KEY (trust_safety_report_id) REFERENCES public.trust_safety_reports(id) ON DELETE SET NULL
);

ALTER TABLE "public"."restriction_review_requests"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX restriction_review_requests_requester_idx ON public.restriction_review_requests USING btree (requester_user_id, created_at DESC);

CREATE INDEX restriction_review_requests_restriction_idx ON public.restriction_review_requests USING btree (restriction_scope, restriction_id);

CREATE INDEX restriction_review_requests_status_idx ON public.restriction_review_requests USING btree (status, created_at DESC);

CREATE INDEX restriction_review_requests_subject_idx ON public.restriction_review_requests USING btree (restriction_scope, restriction_subject_id);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."restriction_review_requests" TO "service_role";

REVOKE ALL ON TABLE "public"."restriction_review_requests" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."restriction_review_requests" TO "postgres";

REVOKE ALL ON TABLE "public"."restriction_review_requests" FROM "anon", "authenticated";
