"use client";

import Link from "next/link";
import {
  useState,
} from "react";

import {
  Input,
} from "@/components/ui/input";
import {
  createClient,
} from "@/lib/supabase/client";
import {
  cn,
} from "@/lib/utils";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const handleForgotPassword = async (
    e: React.SubmitEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const supabase =
      createClient();

    setIsLoading(true);
    setError(null);

    try {
      const {
        error,
      } =
        await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              `${window.location.origin}/auth/update-password`,
          }
        );

      if (error) {
        throw error;
      }

      setSuccess(true);
    } catch (
      error: unknown
    ) {
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "w-full",
        className
      )}
      {...props}
    >
      {success ? (
        <div>
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--tp-primary-soft)] text-lg font-black text-[var(--tp-primary)]">
            ✓
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-primary)]">
            Email sent
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--tp-ink)]">
            Check your inbox
          </h1>

          <p className="mt-3 text-sm leading-7 text-[var(--tp-muted)]">
            If an account exists for{" "}
            <strong className="font-bold text-[var(--tp-ink)]">
              {email}
            </strong>
            , you&apos;ll receive a
            password reset link shortly.
          </p>

          <Link
            href="/auth/login"
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--tp-border-strong)] bg-white px-4 text-sm font-bold text-[var(--tp-ink)] transition hover:border-[var(--tp-primary-border)] hover:bg-[var(--tp-bg-soft)]"
          >
            Return to sign in
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-primary)]">
              Account recovery
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--tp-ink)]">
              Reset your password
            </h1>

            <p className="mt-3 text-sm leading-6 text-[var(--tp-muted)]">
              Enter the email address
              linked to your account and
              we&apos;ll send you a secure
              reset link.
            </p>
          </div>

          <form
            onSubmit={handleForgotPassword}
            className="space-y-5"
          >
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-bold text-[var(--tp-ink)]"
              >
                Email address
              </label>

              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                className="h-12 rounded-xl border-[var(--tp-border-strong)] bg-white px-4 text-[var(--tp-ink)] shadow-none placeholder:text-[var(--tp-faint)] focus-visible:border-[var(--tp-primary)] focus-visible:ring-4 focus-visible:ring-[rgba(47,125,101,0.10)]"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-[var(--tp-danger-border)] bg-[var(--tp-danger-soft)] px-4 py-3 text-sm leading-6 text-[var(--tp-danger)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--tp-primary)] px-6 text-sm font-bold text-white shadow-[0_6px_18px_rgba(47,125,101,0.14)] transition hover:bg-[var(--tp-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading
                ? "Sending..."
                : "Send reset link"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[var(--tp-muted)]">
            Remember your password?{" "}
            <Link
              href="/auth/login"
              className="font-bold text-[var(--tp-primary)] transition hover:text-[var(--tp-primary-hover)]"
            >
              Sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
