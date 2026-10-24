import Link from "next/link";

export const instant = false;

type PageProps = {
  searchParams: Promise<{
    scope?: string;
    subjectId?: string;
    type?: string;
    returnTo?: string;
  }>;
};

function friendlyText(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "Platform Restriction";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function safeReturnPath(
  value:
    | string
    | undefined
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/dashboard";
  }

  return value;
}

function restrictionCopy(
  scope:
    | string
    | undefined
) {
  switch (scope) {
    case "user_organizer":
      return {
        reviewScope: "user",
        eyebrow:
          "Account Restriction",
        title:
          "Organizer actions are temporarily unavailable",
        body:
          "Your Threeple account currently has a platform restriction that prevents organizer-side actions. You can still access areas of Threeple that are not affected by this restriction.",
      };

    case "organization_new_collection":
      return {
        reviewScope:
          "organization",
        eyebrow:
          "Organization Restriction",
        title:
          "New Collections cannot be created right now",
        body:
          "This organization currently has a Threeple restriction that prevents new Collection creation. Existing access remains available where the restriction allows it.",
      };

    case "organization_organizer":
      return {
        reviewScope:
          "organization",
        eyebrow:
          "Organization Restriction",
        title:
          "Organization management is temporarily unavailable",
        body:
          "This organization currently has a platform restriction that prevents organizer-side changes across its Collections.",
      };

    case "collection_organizer":
      return {
        reviewScope:
          "collection",
        eyebrow:
          "Collection Restriction",
        title:
          "Collection management is temporarily unavailable",
        body:
          "This Collection currently has an active Threeple restriction that prevents organizer-side changes.",
      };

    case "user_participation":
      return {
        reviewScope: "user",
        eyebrow:
          "Account Restriction",
        title:
          "New participation is temporarily unavailable",
        body:
          "Your Threeple account currently has a restriction that prevents joining new Collections. Existing participation remains available where permitted.",
      };

    case "organization_participation":
      return {
        reviewScope:
          "organization",
        eyebrow:
          "Organization Restriction",
        title:
          "New participation is temporarily unavailable",
        body:
          "This organization currently has a restriction that prevents new participation across its Collections.",
      };

    case "collection_participation":
      return {
        reviewScope:
          "collection",
        eyebrow:
          "Collection Restriction",
        title:
          "This Collection is not accepting new participants",
        body:
          "A Threeple platform restriction is currently preventing new participation in this Collection.",
      };

    default:
      return {
        reviewScope: null,
        eyebrow:
          "Threeple Restriction",
        title:
          "This action is temporarily unavailable",
        body:
          "A Threeple platform restriction currently prevents this action. Other unaffected areas of your account may still be available.",
      };
  }
}

export default async function RestrictedPage({
  searchParams,
}: PageProps) {
  const query =
    await searchParams;

  const copy =
    restrictionCopy(
      query.scope
    );

  const returnTo =
    safeReturnPath(
      query.returnTo
    );

  const reviewHref =
    copy.reviewScope &&
    query.subjectId &&
    query.type
      ? `/restriction-review?scope=${encodeURIComponent(
          copy.reviewScope
        )}&subjectId=${encodeURIComponent(
          query.subjectId
        )}&type=${encodeURIComponent(
          query.type
        )}`
      : null;

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link
            href="/dashboard"
            className="text-2xl font-bold tracking-tight"
          >
            Threeple
          </Link>

          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            Restricted
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <section className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm md:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-xl font-bold text-red-700">
            !
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
            {copy.eyebrow}
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {copy.title}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-600 md:text-base">
            {copy.body}
          </p>

          <div className="mt-7 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Restriction Type
            </p>

            <p className="mt-2 font-semibold text-neutral-900">
              {friendlyText(
                query.type
              )}
            </p>

            <p className="mt-3 text-sm leading-6 text-neutral-500">
              Threeple does not display internal Trust & Safety investigation notes on this page.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={returnTo}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Go Back
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 px-5 text-sm font-semibold hover:bg-neutral-50"
            >
              Dashboard
            </Link>

            {reviewHref && (
              <Link
                href={reviewHref}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-red-300 bg-red-50 px-5 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                Request Review
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
