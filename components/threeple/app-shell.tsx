"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type ShellMode = "member" | "admin";

type NavItem = {
  label: string;
  href: string;
  shortLabel?: string;
  mark: string;
  exact?: boolean;
};

const memberItems: NavItem[] = [
  {
    label: "Home",
    shortLabel: "Home",
    href: "/dashboard",
    mark: "H",
    exact: true,
  },
  {
    label: "My Collections",
    shortLabel: "Collections",
    href: "/my-collections",
    mark: "C",
  },
  {
    label: "Join",
    shortLabel: "Join",
    href: "/join",
    mark: "J",
  },
  {
    label: "Create Collection",
    shortLabel: "Create",
    href: "/dashboard/collections/new",
    mark: "+",
  },
];

const adminItems: NavItem[] = [
  {
    label: "Overview",
    shortLabel: "Overview",
    href: "/admin",
    mark: "O",
    exact: true,
  },
  {
    label: "Users",
    shortLabel: "Users",
    href: "/admin/users",
    mark: "U",
  },
  {
    label: "Organizations",
    shortLabel: "Orgs",
    href: "/admin/organizations",
    mark: "G",
  },
  {
    label: "Collections",
    shortLabel: "Collections",
    href: "/admin/collections",
    mark: "C",
  },
  {
    label: "Trust & Safety",
    shortLabel: "Safety",
    href: "/admin/trust-safety",
    mark: "T",
  },
];

function activeFor(pathname: string, item: NavItem) {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function Brand({
  mode,
}: {
  mode: ShellMode;
}) {
  return (
    <Link
      href={mode === "admin" ? "/admin" : "/dashboard"}
      className="group flex items-center gap-3"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--tp-primary)] text-sm font-black text-white shadow-[0_8px_24px_rgba(15,122,74,0.20)] transition-transform duration-200 group-hover:-translate-y-0.5">
        T
      </span>

      <span className="min-w-0">
        <span className="block text-xl font-black tracking-[-0.04em] text-[var(--tp-ink)]">
          Threeple
        </span>

        <span className="mt-0.5 block text-[11px] font-semibold tracking-wide text-[var(--tp-muted)]">
          {mode === "admin"
            ? "Operations Console"
            : "Money together, made simple"}
        </span>
      </span>
    </Link>
  );
}

function NavLink({
  item,
}: {
  item: NavItem;
}) {
  const pathname = usePathname();
  const active = activeFor(pathname, item);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={[
        "group flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition-all duration-200",
        active
          ? "bg-[var(--tp-primary-soft)] text-[var(--tp-primary)]"
          : "text-[var(--tp-ink-soft)] hover:bg-[var(--tp-bg-soft)] hover:text-[var(--tp-ink)]",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-all duration-200",
          active
            ? "bg-[var(--tp-primary)] text-white shadow-[0_5px_15px_rgba(15,122,74,0.18)]"
            : "border border-[var(--tp-border)] bg-[var(--tp-surface)] text-[var(--tp-muted)] group-hover:border-[var(--tp-primary-border)] group-hover:bg-[var(--tp-primary-soft)] group-hover:text-[var(--tp-primary)]",
        ].join(" ")}
      >
        {item.mark}
      </span>

      <span className="truncate">
        {item.label}
      </span>
    </Link>
  );
}

function MobileNavItem({
  item,
}: {
  item: NavItem;
}) {
  const pathname = usePathname();
  const active = activeFor(pathname, item);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={[
        "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-bold transition-colors",
        active
          ? "text-[var(--tp-primary)]"
          : "text-[var(--tp-muted)]",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black transition-all",
          active
            ? "bg-[var(--tp-primary-soft)] text-[var(--tp-primary)]"
            : "text-[var(--tp-muted)]",
        ].join(" ")}
      >
        {item.mark}
      </span>

      <span className="max-w-full truncate">
        {item.shortLabel ?? item.label}
      </span>

      {active && (
        <span className="absolute bottom-0 h-1 w-1 rounded-full bg-[var(--tp-primary)]" />
      )}
    </Link>
  );
}

export function ThreepleAppShell({
  children,
  mode = "member",
  title,
  subtitle,
  actions,
  status,
}: {
  children: ReactNode;
  mode?: ShellMode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  status?: ReactNode;
}) {
  const items =
    mode === "admin"
      ? adminItems
      : memberItems;

  return (
    <div className="min-h-screen bg-[var(--tp-bg)] text-[var(--tp-ink)]">
      {/* DESKTOP SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[276px] border-r border-[var(--tp-border)] bg-[var(--tp-surface)] lg:flex lg:flex-col">
        <div className="px-6 pb-6 pt-7">
          <Brand mode={mode} />
        </div>

        <div className="px-4">
          <div className="h-px bg-[var(--tp-border)]" />
        </div>

        <nav
          className="flex-1 space-y-1.5 px-4 py-6"
          aria-label="Primary navigation"
        >
          <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--tp-faint)]">
            {mode === "admin"
              ? "Administration"
              : "Workspace"}
          </p>

          {items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
            />
          ))}
        </nav>

        <div className="p-4">
          <div className="overflow-hidden rounded-[1.4rem] border border-[var(--tp-primary-border)] bg-[var(--tp-primary-soft)] p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--tp-success)]" />

              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--tp-primary)]">
                Threeple ready
              </p>
            </div>

            <p className="mt-3 text-sm font-bold text-[var(--tp-ink)]">
              Built for every screen
            </p>

            <p className="mt-1.5 text-xs leading-5 text-[var(--tp-muted)]">
              Phone · Tablet · Desktop
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[276px]">
        {/* MOBILE / TABLET HEADER */}
        <header className="sticky top-0 z-30 border-b border-[var(--tp-border)] bg-[color:var(--tp-surface)]/90 backdrop-blur-xl lg:hidden">
          <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-6">
            <Brand mode={mode} />

            {actions && (
              <div className="shrink-0">
                {actions}
              </div>
            )}
          </div>

          {/* TABLET NAV */}
          <nav className="hidden overflow-x-auto border-t border-[var(--tp-border)] px-4 py-2 sm:flex lg:hidden">
            <div className="flex min-w-max gap-1.5">
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                />
              ))}
            </div>
          </nav>
        </header>

        {/* DESKTOP PAGE HEADER */}
        {(title ||
          subtitle ||
          actions ||
          status) && (
          <header className="hidden border-b border-[var(--tp-border)] bg-[color:var(--tp-surface)]/95 backdrop-blur lg:block">
            <div className="mx-auto flex min-h-[88px] max-w-[1480px] items-center justify-between gap-8 px-8">
              <div className="min-w-0">
                {title && (
                  <h1 className="truncate text-[1.35rem] font-black tracking-[-0.025em] text-[var(--tp-ink)]">
                    {title}
                  </h1>
                )}

                {subtitle && (
                  <p className="mt-1 max-w-2xl truncate text-sm text-[var(--tp-muted)]">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {status}
                {actions}
              </div>
            </div>
          </header>
        )}

        {/* PAGE CONTENT */}
        <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-5 sm:px-6 sm:pb-10 sm:pt-7 lg:px-8 lg:py-8 xl:px-10">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--tp-border)] bg-[color:var(--tp-surface)]/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_35px_rgba(22,35,28,0.06)] backdrop-blur-xl sm:hidden"
        aria-label="Primary navigation"
      >
        <div className="mx-auto flex max-w-lg">
          {items
            .slice(0, 4)
            .map((item) => (
              <MobileNavItem
                key={item.href}
                item={item}
              />
            ))}
        </div>
      </nav>
    </div>
  );
}
