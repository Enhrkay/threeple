CREATE OR REPLACE FUNCTION public.validate_collection_restriction_state()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
begin

  -- Restriction reason must contain useful information.

  if length(
    trim(
      coalesce(
        new.reason,
        ''
      )
    )
  ) < 10 then

    raise exception
      'Collection restriction reason must contain at least 10 characters.';

  end if;


  -- If lifted, both actor and reason are required.

  if new.lifted_at is not null then

    if new.lifted_by is null then
      raise exception
        'lifted_by is required when lifting a Collection restriction.';
    end if;

    if length(
      trim(
        coalesce(
          new.lift_reason,
          ''
        )
      )
    ) < 10 then

      raise exception
        'A lift reason of at least 10 characters is required.';

    end if;

  else

    -- An active restriction cannot already contain
    -- lift information.

    new.lifted_by := null;
    new.lift_reason := null;

  end if;


  return new;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."validate_collection_restriction_state"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."validate_collection_restriction_state"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."validate_collection_restriction_state"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."validate_collection_restriction_state"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."validate_collection_restriction_state"() FROM "anon", "authenticated";
