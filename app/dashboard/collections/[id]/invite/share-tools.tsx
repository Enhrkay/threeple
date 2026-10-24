"use client";

import {
  useState,
} from "react";

type Props = {
  collectionTitle: string;
  joinCode: string;
  joinUrl: string;
  qrDataUrl: string;
  invitationMessage: string;
};

export default function ShareTools({
  collectionTitle,
  joinCode,
  joinUrl,
  qrDataUrl,
  invitationMessage,
}: Props) {
  const [
    copied,
    setCopied,
  ] = useState<
    "code" |
    "link" |
    "message" |
    null
  >(null);

  async function copyText(
    text: string,
    type:
      | "code"
      | "link"
      | "message"
  ) {
    try {
      await navigator.clipboard
        .writeText(text);

      setCopied(type);

      window.setTimeout(
        () =>
          setCopied(null),
        1800
      );
    } catch {
      setCopied(null);
    }
  }

  function openWhatsApp() {
    const url =
      `https://wa.me/?text=${encodeURIComponent(
        invitationMessage
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function nativeShare() {
    if (
      typeof navigator.share !==
      "function"
    ) {
      await copyText(
        invitationMessage,
        "message"
      );

      return;
    }

    try {
      await navigator.share({
        title:
          collectionTitle,

        text:
          invitationMessage,

        url:
          joinUrl,
      });
    } catch {
      // User may cancel the
      // native share dialog.
    }
  }

  return (
    <div className="space-y-6">

      {/* THREEPLE CODE */}

      <section className="rounded-3xl border bg-white p-6 md:p-8">

        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Threeple Code
        </p>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="font-mono text-3xl font-bold tracking-[0.18em]">
            {joinCode}
          </div>

          <button
            type="button"
            onClick={() =>
              copyText(
                joinCode,
                "code"
              )
            }
            className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 px-5 text-sm font-semibold hover:bg-neutral-50"
          >
            {copied === "code"
              ? "Copied ✓"
              : "Copy Code"}
          </button>

        </div>

        <p className="mt-4 text-sm leading-6 text-neutral-500">
          Participants can enter
          this code on the Threeple
          Join page.
        </p>

      </section>

      {/* JOIN LINK */}

      <section className="rounded-3xl border bg-white p-6 md:p-8">

        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Join Link
        </p>

        <div className="mt-4 rounded-xl bg-neutral-50 p-4">
          <p className="break-all text-sm font-medium">
            {joinUrl}
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">

          <button
            type="button"
            onClick={() =>
              copyText(
                joinUrl,
                "link"
              )
            }
            className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            {copied === "link"
              ? "Link Copied ✓"
              : "Copy Join Link"}
          </button>

          <a
            href={joinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 px-5 text-sm font-semibold hover:bg-neutral-50"
          >
            Preview Join Page
          </a>

        </div>

      </section>

      {/* QR CODE */}

      <section className="rounded-3xl border bg-white p-6 md:p-8">

        <div className="grid gap-7 md:grid-cols-[220px_1fr] md:items-center">

          <div className="rounded-2xl border bg-white p-4">
            <img
              src={qrDataUrl}
              alt={`QR code for ${collectionTitle}`}
              className="mx-auto h-auto w-full"
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              QR Code
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Scan to join
            </h2>

            <p className="mt-3 text-sm leading-6 text-neutral-500">
              Participants can scan
              this QR code with
              their phone to open
              the Collection join
              page immediately.
            </p>

            <a
              href={qrDataUrl}
              download={`threeple-${joinCode}-qr.png`}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 px-5 text-sm font-semibold hover:bg-neutral-50"
            >
              Download QR Code
            </a>

          </div>

        </div>

      </section>

      {/* INVITATION MESSAGE */}

      <section className="rounded-3xl border bg-white p-6 md:p-8">

        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Invitation Message
        </p>

        <h2 className="mt-2 text-xl font-semibold">
          Ready to send
        </h2>

        <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-neutral-50 p-5 text-sm leading-7 text-neutral-700">
          {invitationMessage}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">

          <button
            type="button"
            onClick={() =>
              copyText(
                invitationMessage,
                "message"
              )
            }
            className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 px-5 text-sm font-semibold hover:bg-neutral-50"
          >
            {copied ===
            "message"
              ? "Copied ✓"
              : "Copy Message"}
          </button>

          <button
            type="button"
            onClick={
              openWhatsApp
            }
            className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Share on WhatsApp
          </button>

          <button
            type="button"
            onClick={
              nativeShare
            }
            className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 px-5 text-sm font-semibold hover:bg-neutral-50"
          >
            Share
          </button>

        </div>

      </section>

    </div>
  );
}