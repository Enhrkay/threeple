CREATE TABLE "public"."collection_lifecycle" (
  "collection_id"        uuid                     NOT NULL,
  "lifecycle_status"     text                     NOT NULL DEFAULT 'active'::text,
  "reason"               text,
  "changed_by"           uuid,
  "archived_at"          timestamp with time zone,
  "restored_at"          timestamp with time zone,
  "soft_deleted_at"      timestamp with time zone,
  "historical_locked_at" timestamp with time zone,
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "collection_lifecycle_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "collection_lifecycle_lifecycle_status_check"
    CHECK ((lifecycle_status = ANY (ARRAY['active'::text, 'archived'::text, 'soft_deleted'::text, 'historical_locked'::text]))),
  CONSTRAINT "collection_lifecycle_pkey" PRIMARY KEY (collection_id),
  CONSTRAINT "collection_lifecycle_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE
);

ALTER TABLE "public"."collection_lifecycle"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX collection_lifecycle_status_idx ON public.collection_lifecycle USING btree (lifecycle_status);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_lifecycle" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_lifecycle" TO "service_role";

COMMENT ON COLUMN "public"."collection_lifecycle"."lifecycle_status" IS 'soft_deleted is used only for collections without participant/payment history; historical_locked preserves collections that have ledger history.';

COMMENT ON TABLE "public"."collection_lifecycle" IS 'Administrative lifecycle state for Threeple collections. Financial and participant history is preserved when a collection is removed from normal use.';

REVOKE ALL ON TABLE "public"."collection_lifecycle" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."collection_lifecycle" TO "postgres";
