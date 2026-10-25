"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f7f9f8] text-[#15221d] antialiased">
        <main className="flex min-h-screen items-center justify-center px-5 py-12">
          <section className="w-full max-w-xl rounded-[2.25rem] border border-[#ecdada] bg-white p-8 text-center shadow-[0_16px_40px_rgba(23,35,30,0.055)] sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fbf2f2] text-xl font-black text-[#a15353]">
              !
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[#a15353]">
              Application error
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#15221d] sm:text-4xl">
              Threeple couldn&apos;t load correctly.
            </h1>

            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#64716b] sm:text-base">
              An unexpected application error occurred. You can try loading the
              application again.
            </p>

            {error.digest ? (
              <p className="mt-4 text-xs text-[#8b9892]">
                Reference: {error.digest}
              </p>
            ) : null}

            <div className="mt-8">
              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#246b57] px-5 text-sm font-bold text-white transition hover:bg-[#1d5747]"
              >
                Try again
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}