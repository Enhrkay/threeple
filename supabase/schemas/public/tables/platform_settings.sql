CREATE TABLE "public"."platform_settings" (
  "id"                      text                     NOT NULL DEFAULT 'global'::text,
  "platform_fee_percentage" numeric(5,2)             NOT NULL DEFAULT 2.00,
  "default_currency"        text                     NOT NULL DEFAULT 'NGN'::text,
  "monetization_enabled"    boolean                  NOT NULL DEFAULT true,
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "platform_settings_default_currency_check" CHECK ((char_length(default_currency) = 3)),
  CONSTRAINT "platform_settings_pkey" PRIMARY KEY (id),
  CONSTRAINT "platform_settings_platform_fee_percentage_check" CHECK (((platform_fee_percentage >= (0)::numeric) AND (platform_fee_percentage <= (100)::numeric)))
);

ALTER TABLE "public"."platform_settings"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_settings" TO "service_role";

REVOKE ALL ON TABLE "public"."platform_settings" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_settings" TO "postgres";

REVOKE ALL ON TABLE "public"."platform_settings" FROM "anon", "authenticated";
