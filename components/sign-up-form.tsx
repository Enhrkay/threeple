"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = safeNext(searchParams.get("next"));

  const handleSignUp = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (fullName.trim().length < 2) {
      setError("Please enter your full name");
      setIsLoading(false);
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const confirmUrl = new URL(
        "/auth/confirm",
        window.location.origin
      );

      confirmUrl.searchParams.set("next", nextPath);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: confirmUrl.toString(),
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setNeedsEmailConfirmation(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const loginHref =
    nextPath === "/dashboard"
      ? "/auth/login"
      : `/auth/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/40">
          Get started
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#171717]">
          Create your Threeple account
        </h1>
        <p className="mt-3 text-sm leading-6 text-black/55">
          Create collections, invite your group, and keep every contribution
          transparent.
        </p>
      </div>

      {needsEmailConfirmation ? (
        <div className="rounded-3xl border border-green-200 bg-green-50 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
            Almost there
          </p>

          <h2 className="mt-2 text-xl font-black text-green-950">
            Check your email to finish signing in
          </h2>

          <p className="mt-3 text-sm leading-6 text-green-800">
            We sent a secure confirmation link to <strong>{email}</strong>.
            After you confirm, Threeple will bring you straight back to where you were going.
          </p>
        </div>
      ) : (
<form onSubmit={handleSignUp} className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="full-name"
            className="block text-sm font-semibold text-[#171717]"
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
            onChange={(e) => setFullName(e.target.value)}
            className="h-12 rounded-2xl border-black/10 bg-white px-4 text-[#171717] shadow-none placeholder:text-black/30 focus-visible:ring-black/20"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-[#171717]"
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
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-2xl border-black/10 bg-white px-4 text-[#171717] shadow-none placeholder:text-black/30 focus-visible:ring-black/20"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-[#171717]"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-2xl border-black/10 bg-white px-4 text-[#171717] shadow-none focus-visible:ring-black/20"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="repeat-password"
            className="block text-sm font-semibold text-[#171717]"
          >
            Confirm password
          </label>
          <Input
            id="repeat-password"
            type="password"
            autoComplete="new-password"
            required
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            className="h-12 rounded-2xl border-black/10 bg-white px-4 text-[#171717] shadow-none focus-visible:ring-black/20"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-12 w-full items-center justify-center rounded-full bg-black px-6 text-sm font-bold text-white transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Creating account..." : "Create account"}
        </button>
      </form>
      )}

      <p className="mt-6 text-center text-sm text-black/50">
        Already have an account?{" "}
        <Link
          href={loginHref}
          className="font-bold text-black underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}


