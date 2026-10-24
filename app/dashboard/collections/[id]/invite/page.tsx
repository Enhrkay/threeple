import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import QRCode from "qrcode";

import {
  createClient,
} from "@/lib/supabase/server";

import ShareTools from "./share-tools";

export const instant = false;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InvitePage({
  params,
}: PageProps) {
  const { id } =
    await params;

  const supabase =
    await createClient();

  // =======================================================
  // AUTH
  // =======================================================

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (
    claimsError ||
    !userId
  ) {
    redirect(
      "/auth/login"
    );
  }

  // =======================================================
  // COLLECTION
  // =======================================================

  const {
    data: collection,
    error: collectionError,
  } = await supabase
    .from("collections")
    .select(`
      id,
      organization_id,
      title,
      description,
      join_code,
      status
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (
    collectionError ||
    !collection
  ) {
    notFound();
  }

  // =======================================================
  // COLLECTION MUST BE ACTIVE
  // =======================================================

  if (
    collection.status !==
    "active"
  ) {
    redirect(
      `/dashboard/collections/${collection.id}`
    );
  }

  // =======================================================
  // ACCESS
  // =======================================================

  const {
    data: organization,
  } = await supabase
    .from("organizations")
    .select(`
      id,
      owner_id
    `)
    .eq(
      "id",
      collection.organization_id
    )
    .maybeSingle();

  if (!organization) {
    notFound();
  }

  let allowed =
    organization.owner_id ===
    userId;

  if (!allowed) {
    const {
      data: membership,
    } = await supabase
      .from(
        "organization_members"
      )
      .select("role")
      .eq(
        "organization_id",
        organization.id
      )
      .eq(
        "user_id",
        userId
      )
      .in(
        "role",
        [
          "admin",
          "treasurer",
        ]
      )
      .maybeSingle();

    allowed =
      Boolean(membership);
  }

  if (!allowed) {
    notFound();
  }

  // =======================================================
  // PUBLIC APP URL
  // =======================================================

  const configuredUrl =
    process.env.APP_URL
      ?.trim()
      .replace(
        /\/+$/,
        ""
      );

  const appUrl =
    configuredUrl ||
    (
      process.env
        .NODE_ENV ===
      "development"
        ? "http://localhost:3000"
        : null
    );

  if (!appUrl) {
    throw new Error(
      "APP_URL must be configured before Collection links can be shared."
    );
  }

  // =======================================================
  // JOIN URL
  // =======================================================

  const joinUrl =
    `${appUrl}/join?code=${encodeURIComponent(
      collection.join_code
    )}`;

  // =======================================================
  // GENERATE QR INSIDE THREEPLE
  // =======================================================

  const qrDataUrl =
    await QRCode.toDataURL(
      joinUrl,
      {
        errorCorrectionLevel:
          "M",

        margin: 2,

        width: 500,
      }
    );

  // =======================================================
  // INVITATION MESSAGE
  // =======================================================

  const invitationMessage =
    `You're invited to join "${collection.title}" on Threeple.

Threeple Code: ${collection.join_code}

Join here:
${joinUrl}

Open the link or enter the Threeple Code to join the Collection.`;

  // =======================================================
  // UI
  // =======================================================

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">

          <div>
            <Link
              href="/dashboard"
              className="text-2xl font-bold tracking-tight"
            >
              Threeple
            </Link>

            <p className="text-sm text-neutral-500">
              Collect. Coordinate.
              Track.
            </p>
          </div>

          <Link
            href={`/dashboard/collections/${collection.id}`}
            className="text-sm font-medium text-neutral-600 hover:text-black"
          >
            ← Collection
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">

        <section>

          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Invite & Share
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Invite people to{" "}
            {collection.title}
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
            Share the Threeple Code,
            direct join link or QR
            code with the people you
            want to participate in
            this Collection.
          </p>

        </section>

        <div className="mt-8">

          <ShareTools
            collectionTitle={
              collection.title
            }
            joinCode={
              collection.join_code
            }
            joinUrl={
              joinUrl
            }
            qrDataUrl={
              qrDataUrl
            }
            invitationMessage={
              invitationMessage
            }
          />

        </div>

        <section className="mt-6 rounded-2xl bg-neutral-100 p-5">

          <p className="text-sm font-medium">
            Sharing does not add a
            participant automatically.
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            A person becomes a
            participant only after
            completing the Threeple
            Join flow or being added
            directly by an authorized
            organizer.
          </p>

        </section>

      </div>

    </main>
  );
}