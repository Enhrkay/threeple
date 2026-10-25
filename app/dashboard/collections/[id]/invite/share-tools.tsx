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
    | "code"
    | "link"
    | "message"
    | null
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
      // The user may cancel
      // the native share dialog.
    }
  }

  return (
    <div className="space-y-6">
      {/* PRIMARY INVITE PANEL */}
      <section className="tp-card overflow-hidden">
        <div className="p-6 sm:p-8">
          <p className="tp-kicker">
            Threeple Code
          </p>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-4xl font-black tracking-[0.16em] text-[var(--tp-primary)] sm:text-5xl">
                {joinCode}
              </p>

              <p className="mt-3 text-sm leading-6 text-[var(--tp-muted)]">
                People can enter this code directly on the Threeple join page.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                copyText(
                  joinCode,
                  "code"
                )
              }
              className="tp-btn tp-btn-secondary shrink-0"
            >
              {copied === "code"
                ? "Copied"
                : "Copy code"}
            </button>
          </div>
        </div>

        <div className="border-t border-[var(--tp-border)] bg-[var(--tp-bg-soft)] p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tp-muted)]">
            Join link
          </p>

          <p className="mt-2 break-all text-sm font-semibold text-[var(--tp-ink-soft)]">
            {joinUrl}
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                copyText(
                  joinUrl,
                  "link"
                )
              }
              className="tp-btn tp-btn-primary"
            >
              {copied === "link"
                ? "Link copied"
                : "Copy join link"}
            </button>

            <a
              href={joinUrl}
              target="_blank"
              rel="noreferrer"
              className="tp-btn tp-btn-secondary"
            >
              Preview join page
            </a>
          </div>
        </div>
      </section>

      {/* SHARE MESSAGE + QR */}
      <section className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="tp-card p-6 sm:p-7">
          <p className="tp-kicker">
            Ready to send
          </p>

          <h2 className="tp-heading mt-2 text-xl">
            Invitation message
          </h2>

          <div className="mt-5 whitespace-pre-wrap rounded-2xl border border-[var(--tp-border)] bg-[var(--tp-bg-soft)] p-5 text-sm leading-7 text-[var(--tp-ink-soft)]">
            {invitationMessage}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={
                openWhatsApp
              }
              className="tp-btn tp-btn-primary"
            >
              WhatsApp
            </button>

            <button
              type="button"
              onClick={
                nativeShare
              }
              className="tp-btn tp-btn-secondary"
            >
              Share
            </button>

            <button
              type="button"
              onClick={() =>
                copyText(
                  invitationMessage,
                  "message"
                )
              }
              className="tp-btn tp-btn-secondary"
            >
              {copied === "message"
                ? "Copied"
                : "Copy message"}
            </button>
          </div>
        </div>

        <div className="tp-card p-6 sm:p-7">
          <p className="tp-kicker">
            QR code
          </p>

          <h2 className="tp-heading mt-2 text-xl">
            Scan to join
          </h2>

          <p className="mt-2 text-sm leading-6 text-[var(--tp-muted)]">
            Ideal for presentations, physical events and printed materials.
          </p>

          <div className="mx-auto mt-6 max-w-[220px] rounded-2xl border border-[var(--tp-border)] bg-white p-4">
            <img
              src={qrDataUrl}
              alt={`QR code for ${collectionTitle}`}
              className="h-auto w-full"
            />
          </div>

          <a
            href={qrDataUrl}
            download={`threeple-${joinCode}-qr.png`}
            className="tp-btn tp-btn-secondary mt-5 w-full"
          >
            Download QR code
          </a>
        </div>
      </section>
    </div>
  );
}
