"use client";

import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
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

function safeNext(
  value: string | null
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

export function LoginForm({
  className,
  defaultNext = "/dashboard",
  adminMode = false,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  defaultNext?: string;
  adminMode?: boolean;
}) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const requestedNext =
    searchParams.get("next");

  const nextPath =
    requestedNext
      ? safeNext(requestedNext)
      : defaultNext;

  const handleLogin = async (
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
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        throw error;
      }

      router.replace(nextPath);
      router.refresh();
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

  const signUpHref =
    nextPath === "/dashboard"
      ? "/auth/sign-up"
      : `/auth/sign-up?next=${encodeURIComponent(
          nextPath
        )}`;

  return (
    <div
      className={cn(
        "w-full",
        className
      )}
      {...props}
    >
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-primary)]">
          {adminMode ? "Threeple administration" : "Welcome back"}
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--tp-ink)] sm:text-4xl">
          {adminMode ? "Admin sign in" : "Sign in"}
        </h1>

        <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--tp-muted)]">
          {adminMode
            ? "Sign in with an authorized Threeple administrator account."
            : "Continue to your collections, participants and contribution activity."}
        </p>
      </div>

      <form
        onSubmit={handleLogin}
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

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="password"
              className="block text-sm font-bold text-[var(--tp-ink)]"
            >
              Password
            </label>

            <Link
              href="/auth/forgot-password"
              className="text-sm font-semibold text-[var(--tp-primary)] transition hover:text-[var(--tp-primary-hover)]"
            >
              Forgot password?
            </Link>
          </div>

          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            className="h-12 rounded-xl border-[var(--tp-border-strong)] bg-white px-4 text-[var(--tp-ink)] shadow-none focus-visible:border-[var(--tp-primary)] focus-visible:ring-4 focus-visible:ring-[rgba(47,125,101,0.10)]"
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
            ? "Signing in..."
            : "Sign in"}
        </button>
      </form>

      {!adminMode && (
        <p className="mt-7 text-center text-sm text-[var(--tp-muted)]">
          Don&apos;t have an account?{" "}
          <Link
            href={signUpHref}
            className="font-bold text-[var(--tp-primary)] transition hover:text-[var(--tp-primary-hover)]"
          >
            Create one
          </Link>
        </p>
      )}
    </div>
  );
}
