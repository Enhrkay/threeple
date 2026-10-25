CREATE TABLE "public"."user_account_lifecycle" (
  "user_id"        uuid                     NOT NULL,
  "status"         text                     NOT NULL DEFAULT 'active'::text,
  "reason"         text,
  "changed_by"     uuid,
  "deactivated_at" timestamp with time zone,
  "restored_at"    timestamp with time zone,
  "deleted_at"     timestamp with time zone,
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "user_account_lifecycle_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "user_account_lifecycle_pkey" PRIMARY KEY (user_id),
  CONSTRAINT "user_account_lifecycle_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'deactivated'::text, 'deleted'::text]))),
  CONSTRAINT "user_account_lifecycle_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT
);

ALTER TABLE "public"."user_account_lifecycle"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX user_account_lifecycle_status_idx ON public.user_account_lifecycle USING btree (status);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_account_lifecycle" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_account_lifecycle" TO "service_role";

COMMENT ON COLUMN "public"."user_account_lifecycle"."status" IS 'active = normal access; deactivated = Auth sign-in banned; deleted = Auth account soft-deleted/anonymized while domain history remains.';

COMMENT ON TABLE "public"."user_account_lifecycle" IS 'Administrative lifecycle state for Threeple accounts. Domain records remain preserved when access is deactivated or the Auth account is soft-deleted.';

REVOKE ALL ON TABLE "public"."user_account_lifecycle" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_account_lifecycle" TO "postgres";
