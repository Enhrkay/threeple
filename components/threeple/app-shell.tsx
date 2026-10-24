"use client";

import Link from "next/link";
import {
  usePathname,
} from "next/navigation";
import type {
  ReactNode,
} from "react";

type ShellMode =
  | "member"
  | "admin";

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
    label: "Create",
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

function activeFor(
  pathname: string,
  item: NavItem
) {
  if (item.exact) {
    return pathname === item.href;
  }

  return (
    pathname === item.href ||
    pathname.startsWith(
      `${item.href}/`
    )
  );
}

function NavLink({
  item,
  compact = false,
}: {
  item: NavItem;
  compact?: boolean;
}) {
  const pathname =
    usePathname();

  const active =
    activeFor(
      pathname,
      item
    );

  return (
    <Link
      href={item.href}
      className={[
        "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition",
        active
          ? "bg-[var(--tp-primary-soft)] text-[var(--tp-primary)]"
          : "text-[var(--tp-ink-soft)] hover:bg-[var(--tp-bg-soft)] hover:text-[var(--tp-ink)]",
        compact
          ? "justify-center"
          : "",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black",
          active
            ? "bg-[var(--tp-primary)] text-white"
            : "bg-[var(--tp-surface-soft)] text-[var(--tp-ink-soft)]",
        ].join(" ")}
      >
        {item.mark}
      </span>

      {!compact && (
        <span>
          {item.label}
        </span>
      )}
    </Link>
  );
}

function MobileNavItem({
  item,
}: {
  item: NavItem;
}) {
  const pathname =
    usePathname();

  const active =
    activeFor(
      pathname,
      item
    );

  return (
    <Link
      href={item.href}
      className={[
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-bold transition",
        active
          ? "text-[var(--tp-primary)]"
          : "text-[var(--tp-muted)]",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black",
          active
            ? "bg-[var(--tp-primary-soft)] text-[var(--tp-primary)]"
            : "bg-transparent",
        ].join(" ")}
      >
        {item.mark}
      </span>

      <span className="max-w-full truncate">
        {item.shortLabel ??
          item.label}
      </span>
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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-[var(--tp-border)] bg-[var(--tp-surface)] lg:flex lg:flex-col">
        <div className="border-b border-[var(--tp-border)] px-6 py-6">
          <Link
            href={
              mode === "admin"
                ? "/admin"
                : "/dashboard"
            }
            className="text-2xl font-black tracking-tight text-[var(--tp-primary)]"
          >
            Threeple
          </Link>

          <p className="mt-1 text-xs font-medium text-[var(--tp-muted)]">
            {mode === "admin"
              ? "Operations Console"
              : "Together, clearly."}
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {items.map(
            (item) => (
              <NavLink
                key={item.href}
                item={item}
              />
            )
          )}
        </nav>

        <div className="border-t border-[var(--tp-border)] p-4">
          <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--tp-faint)]">
              Device ready
            </p>

            <p className="mt-2 text-sm font-bold text-[var(--tp-ink-soft)]">
              Phone · Tablet · Desktop
            </p>

            <p className="mt-1 text-xs leading-5 text-[var(--tp-muted)]">
              Offline collector sync will plug into this shell later.
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        {/* TABLET + MOBILE TOP BAR */}
        <header className="sticky top-0 z-30 border-b border-[var(--tp-border)] bg-[color:var(--tp-surface)]/95 backdrop-blur lg:hidden">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="min-w-0">
              <Link
                href={
                  mode === "admin"
                    ? "/admin"
                    : "/dashboard"
                }
                className="text-xl font-black tracking-tight text-[var(--tp-primary)]"
              >
                Threeple
              </Link>

              {subtitle && (
                <p className="truncate text-xs text-[var(--tp-muted)]">
                  {subtitle}
                </p>
              )}
            </div>

            {actions && (
              <div className="shrink-0">
                {actions}
              </div>
            )}
          </div>

          {/* TABLET NAV */}
          <nav className="hidden overflow-x-auto border-t border-[var(--tp-border)] px-4 py-2 sm:flex lg:hidden">
            <div className="flex min-w-max gap-1">
              {items.map(
                (item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                  />
                )
              )}
            </div>
          </nav>
        </header>

        {/* DESKTOP PAGE HEADER */}
        {(title ||
          subtitle ||
          actions ||
          status) && (
          <div className="hidden border-b border-[var(--tp-border)] bg-[var(--tp-surface)] lg:block">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-8 py-5">
              <div className="min-w-0">
                {title && (
                  <h1 className="truncate text-lg font-black text-[var(--tp-ink)]">
                    {title}
                  </h1>
                )}

                {subtitle && (
                  <p className="mt-1 truncate text-sm text-[var(--tp-muted)]">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {status}
                {actions}
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 sm:pb-10 lg:px-8 lg:py-8">
          {children}
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--tp-border)] bg-[color:var(--tp-surface)]/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur sm:hidden"
        aria-label="Primary navigation"
      >
        <div className="mx-auto flex max-w-lg">
          {items
            .slice(0, 4)
            .map(
              (item) => (
                <MobileNavItem
                  key={item.href}
                  item={item}
                />
              )
            )}
        </div>
      </nav>
    </div>
  );
}
