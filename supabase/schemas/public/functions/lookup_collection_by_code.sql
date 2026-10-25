CREATE OR REPLACE FUNCTION public.lookup_collection_by_code (
  p_join_code text
)
  RETURNS TABLE (
    title                  text,
    description            text,
    collection_type        text,
    collection_mode        text,
    currency               text,
    target_amount          numeric,
    default_amount         numeric,
    amount_raised          numeric,
    deadline               timestamp with time zone,
    join_code              text,
    visibility             text,
    allow_partial_payments boolean,
    allow_custom_amount    boolean,
    requires_approval      boolean,
    access_mode            text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$

  select

    c.title,

    c.description,

    c.collection_type,

    c.collection_mode,

    c.currency,

    c.target_amount,

    c.default_amount,

    (
      select coalesce(
        sum(
          case

            when p.status = 'success'
              and p.verified_at is not null
            then p.amount

            when p.status = 'partially_refunded'
              and p.verified_at is not null
            then greatest(
              p.amount - p.refunded_amount,
              0
            )

            else 0

          end
        ),
        0
      )

      from public.payments p

      where p.collection_id = c.id

    ) as amount_raised,

    c.deadline,

    c.join_code,

    c.visibility,

    c.allow_partial_payments,

    c.allow_custom_amount,

    c.requires_approval,

    c.access_mode

  from public.collections c

  where
    upper(c.join_code) =
      upper(trim(p_join_code))

    and c.status = 'active'

  limit 1;

$function$;

GRANT EXECUTE ON FUNCTION "public"."lookup_collection_by_code"(text) TO "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."lookup_collection_by_code"(text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."lookup_collection_by_code"(text) FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."lookup_collection_by_code"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."lookup_collection_by_code"(text) TO "postgres";
