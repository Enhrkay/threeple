import { LoginForm } from "@/components/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#171717]">
      <nav className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-black tracking-tight">
            Threeple
          </Link>

          <Link
            href="/auth/sign-up"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-black/5"
          >
            Create account
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl lg:grid-cols-2">
        <div className="hidden border-r border-black/10 px-10 py-14 lg:flex lg:flex-col lg:justify-between">
          <div className="max-w-xl pt-10">
            <div className="inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold">
              Simple group contributions
            </div>

            <h2 className="mt-8 text-6xl font-black leading-[0.98] tracking-[-0.05em]">
              Your collections.
              <br />
              Clearly managed.
            </h2>

            <p className="mt-6 max-w-lg text-lg leading-8 text-black/55">
              Track participants, monitor payment progress, and keep your group
              aligned from one place.
            </p>
          </div>

          <p className="text-sm text-black/35">
            Threeple · Transparent group contributions
          </p>
        </div>

        <div className="flex items-center justify-center px-6 py-14 sm:px-10">
          <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-7 shadow-xl shadow-black/5 sm:p-10">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
