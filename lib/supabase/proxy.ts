import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  hasEnvVars,
} from "../utils";

const PUBLIC_EXACT_ROUTES = [
  "/",
  "/join",
];

const PUBLIC_ROUTE_PREFIXES = [
  "/auth/",
  "/pay/",
];

function isPublicRoute(
  pathname: string
) {
  if (
    PUBLIC_EXACT_ROUTES.includes(
      pathname
    )
  ) {
    return true;
  }

  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) =>
      pathname.startsWith(
        prefix
      )
  );
}

export async function updateSession(
  request: NextRequest
) {
  let supabaseResponse =
    NextResponse.next({
      request,
    });

  if (!hasEnvVars) {
    return supabaseResponse;
  }

  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) =>
                request.cookies.set(
                  name,
                  value
                )
            );

            supabaseResponse =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) =>
                supabaseResponse.cookies.set(
                  name,
                  value,
                  options
                )
            );
          },
        },
      }
    );

  const {
    data,
  } =
    await supabase.auth.getClaims();

  const user =
    data?.claims;

  const pathname =
    request.nextUrl.pathname;

  if (
    !user &&
    !isPublicRoute(pathname)
  ) {
    const url =
      request.nextUrl.clone();

    url.pathname =
      "/auth/login";

    url.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`
    );

    return NextResponse.redirect(
      url
    );
  }

  return supabaseResponse;
}
