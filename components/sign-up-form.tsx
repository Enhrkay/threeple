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

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    repeatPassword,
    setRepeatPassword,
  ] = useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const [
    needsEmailConfirmation,
    setNeedsEmailConfirmation,
  ] = useState(false);

  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const nextPath =
    safeNext(
      searchParams.get("next")
    );

  const handleSignUp = async (
    e: React.SubmitEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const supabase =
      createClient();

    setIsLoading(true);
    setError(null);

    if (
      fullName.trim().length < 2
    ) {
      setError(
        "Please enter your full name"
      );
      setIsLoading(false);
      return;
    }

    if (
      password !== repeatPassword
    ) {
      setError(
        "Passwords do not match"
      );
      setIsLoading(false);
      return;
    }

    try {
      const confirmUrl =
        new URL(
          "/auth/confirm",
          window.location.origin
        );

      confirmUrl.searchParams.set(
        "next",
        nextPath
      );

      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              confirmUrl.toString(),
            data: {
              full_name:
                fullName.trim(),
            },
          },
        });

      if (error) {
        throw error;
      }

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setNeedsEmailConfirmation(
        true
      );
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

  const loginHref =
    nextPath === "/dashboard"
      ? "/auth/login"
      : `/auth/login?next=${encodeURIComponent(
          nextPath
        )}`;

  const inputClass =
    "h-12 rounded-xl border-[var(--tp-border-strong)] bg-white px-4 text-[var(--tp-ink)] shadow-none placeholder:text-[var(--tp-faint)] focus-visible:border-[var(--tp-primary)] focus-visible:ring-4 focus-visible:ring-[rgba(47,125,101,0.10)]";

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
          Get started
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--tp-ink)] sm:text-4xl">
          Create your account
        </h1>

        <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--tp-muted)]">
          Start a collection,
          invite your group and keep
          every contribution clear.
        </p>
      </div>

      {needsEmailConfirmation ? (
        <div className="rounded-2xl border border-[var(--tp-primary-border)] bg-[var(--tp-primary-soft)] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-primary)]">
            Almost there
          </p>

          <h2 className="mt-3 text-xl font-black tracking-[-0.03em] text-[var(--tp-ink)]">
            Check your email
          </h2>

          <p className="mt-3 text-sm leading-6 text-[var(--tp-muted)]">
            We sent a secure
            confirmation link to{" "}
            <strong className="font-bold text-[var(--tp-ink)]">
              {email}
            </strong>
            . Confirm your email and
            Threeple will bring you
            back to where you were going.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSignUp}
          className="space-y-5"
        >
          <div className="space-y-2">
            <label
              htmlFor="full-name"
              className="block text-sm font-bold text-[var(--tp-ink)]"
            >
              Full name
            </label>

            <Input
              id="full-name"
              type="text"
              placeholder="Your full name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
              value={fullName}
              onChange={(e) =>
                setFullName(
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>

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
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-bold text-[var(--tp-ink)]"
            >
              Password
            </label>

            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="repeat-password"
              className="block text-sm font-bold text-[var(--tp-ink)]"
            >
              Confirm password
            </label>

            <Input
              id="repeat-password"
              type="password"
              autoComplete="new-password"
              required
              value={repeatPassword}
              onChange={(e) =>
                setRepeatPassword(
                  e.target.value
                )
              }
              className={inputClass}
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
              ? "Creating account..."
              : "Create account"}
          </button>
        </form>
      )}

      <p className="mt-7 text-center text-sm text-[var(--tp-muted)]">
        Already have an account?{" "}
        <Link
          href={loginHref}
          className="font-bold text-[var(--tp-primary)] transition hover:text-[var(--tp-primary-hover)]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
