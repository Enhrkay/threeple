import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";
import QRCode from "qrcode";

import {
  ThreepleAppShell,
} from "@/components/threeple/app-shell";

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

  if (
    collection.status !==
    "active"
  ) {
    redirect(
      `/dashboard/collections/${collection.id}`
    );
  }

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

  const joinUrl =
    `${appUrl}/join?code=${encodeURIComponent(
      collection.join_code
    )}`;

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

  const invitationMessage =
    `You're invited to join "${collection.title}" on Threeple.

Threeple Code: ${collection.join_code}

Join here:
${joinUrl}

Open the link or enter the Threeple Code to join the Collection.`;

  return (
    <ThreepleAppShell
      title="Invite people"
      subtitle={collection.title}
    >
      <div className="mx-auto max-w-5xl">
        <section className="pb-7">
          <Link
            href={`/dashboard/collections/${collection.id}`}
            className="text-sm font-bold text-[var(--tp-primary)] transition hover:text-[var(--tp-primary-hover)]"
          >
            Back to collection
          </Link>

          <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-primary)]">
            Invite & share
          </p>

          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.04em] text-[var(--tp-ink)] sm:text-4xl">
            Bring people into the collection
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--tp-muted)]">
            Share the Threeple Code, direct join link or QR code with the people you want to participate.
          </p>
        </section>

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

        <section className="mt-7 border-t border-[var(--tp-border)] pt-6">
          <p className="text-sm font-bold text-[var(--tp-ink)]">
            Sharing does not add a participant automatically
          </p>

          <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--tp-muted)]">
            A person becomes a participant only after completing the Threeple join flow or being added by an authorized organizer.
          </p>
        </section>
      </div>
    </ThreepleAppShell>
  );
}
