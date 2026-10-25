import Link from "next/link";
import type {
  ReactNode,
} from "react";

function cx(
  ...values: Array<
    string |
    false |
    null |
    undefined
  >
) {
  return values
    .filter(Boolean)
    .join(" ");
}

export function ThreeplePage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cx(
        "tp-page",
        className
      )}
    >
      {children}
    </main>
  );
}

export function ThreepleContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "tp-container",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ThreepleCard({
  children,
  className,
  soft = false,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  soft?: boolean;
  interactive?: boolean;
}) {
  return (
    <section
      className={cx(
        soft
          ? "rounded-[var(--tp-radius-lg)] border border-[var(--tp-border)] bg-[var(--tp-bg-soft)]"
          : "rounded-[var(--tp-radius-lg)] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)]",
        interactive &&
          "transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--tp-primary-border)] hover:shadow-[var(--tp-shadow-md)]",
        className
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tp-primary)]">
            {eyebrow}
          </p>
        )}

        <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[var(--tp-ink)]">
          {title}
        </h2>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tp-muted)]">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

export function ThreepleBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?:
    | "neutral"
    | "primary"
    | "success"
    | "warning"
    | "danger";
  className?: string;
}) {
  const tones = {
    neutral:
      "border-[var(--tp-border)] bg-[var(--tp-bg-soft)] text-[var(--tp-muted)]",
    primary:
      "border-[var(--tp-primary-border)] bg-[var(--tp-primary-soft)] text-[var(--tp-primary)]",
    success:
      "border-[var(--tp-success-border)] bg-[var(--tp-success-soft)] text-[var(--tp-success)]",
    warning:
      "border-[var(--tp-warning-border)] bg-[var(--tp-warning-soft)] text-[var(--tp-warning)]",
    danger:
      "border-[var(--tp-danger-border)] bg-[var(--tp-danger-soft)] text-[var(--tp-danger)]",
  };

  return (
    <span
      className={cx(
        "inline-flex min-h-6 items-center rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function ThreepleAlert({
  children,
  tone = "info",
  className,
}: {
  children: ReactNode;
  tone?:
    | "info"
    | "success"
    | "warning"
    | "danger";
  className?: string;
}) {
  const tones = {
    info:
      "border-[var(--tp-info-border)] bg-[var(--tp-info-soft)] text-[var(--tp-info)]",
    success:
      "border-[var(--tp-success-border)] bg-[var(--tp-success-soft)] text-[var(--tp-success)]",
    warning:
      "border-[var(--tp-warning-border)] bg-[var(--tp-warning-soft)] text-[var(--tp-warning)]",
    danger:
      "border-[var(--tp-danger-border)] bg-[var(--tp-danger-soft)] text-[var(--tp-danger)]",
  };

  return (
    <div
      className={cx(
        "rounded-2xl border px-4 py-3.5 text-sm leading-6",
        tones[tone],
        className
      )}
    >
      {children}
    </div>
  );
}

export function ThreepleButton({
  children,
  type = "button",
  variant = "primary",
  className,
  disabled,
}: {
  children: ReactNode;
  type?:
    | "button"
    | "submit"
    | "reset";
  variant?:
    | "primary"
    | "secondary"
    | "soft"
    | "danger";
  className?: string;
  disabled?: boolean;
}) {
  const variants = {
    primary:
      "border border-[var(--tp-primary)] bg-[var(--tp-primary)] text-white shadow-[0_5px_16px_rgba(47,125,101,0.14)] hover:border-[var(--tp-primary-hover)] hover:bg-[var(--tp-primary-hover)]",
    secondary:
      "border border-[var(--tp-border-strong)] bg-[var(--tp-surface)] text-[var(--tp-ink)] hover:border-[var(--tp-primary-border)] hover:bg-[var(--tp-bg-soft)]",
    soft:
      "border border-[var(--tp-primary-border)] bg-[var(--tp-primary-soft)] text-[var(--tp-primary)] hover:bg-[var(--tp-primary-border)]",
    danger:
      "border border-[var(--tp-danger)] bg-[var(--tp-danger)] text-white hover:bg-[var(--tp-danger-hover)]",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 focus-visible:outline-none",
        variants[variant],
        disabled &&
          "cursor-not-allowed opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

export function ThreepleLinkButton({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?:
    | "primary"
    | "secondary"
    | "soft"
    | "danger";
  className?: string;
}) {
  const variants = {
    primary:
      "border border-[var(--tp-primary)] bg-[var(--tp-primary)] text-white shadow-[0_5px_16px_rgba(47,125,101,0.14)] hover:border-[var(--tp-primary-hover)] hover:bg-[var(--tp-primary-hover)]",
    secondary:
      "border border-[var(--tp-border-strong)] bg-[var(--tp-surface)] text-[var(--tp-ink)] hover:border-[var(--tp-primary-border)] hover:bg-[var(--tp-bg-soft)]",
    soft:
      "border border-[var(--tp-primary-border)] bg-[var(--tp-primary-soft)] text-[var(--tp-primary)] hover:bg-[var(--tp-primary-border)]",
    danger:
      "border border-[var(--tp-danger)] bg-[var(--tp-danger)] text-white hover:bg-[var(--tp-danger-hover)]",
  };

  return (
    <Link
      href={href}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 focus-visible:outline-none",
        variants[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}

export function ThreepleStat({
  label,
  value,
  helper,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  tone?:
    | "neutral"
    | "primary"
    | "success"
    | "warning";
  className?: string;
}) {
  const indicator =
    tone === "success"
      ? "bg-[var(--tp-success)]"
      : tone === "warning"
        ? "bg-[var(--tp-warning)]"
        : tone === "primary"
          ? "bg-[var(--tp-primary)]"
          : "bg-[var(--tp-border-strong)]";

  return (
    <div
      className={cx(
        "rounded-[var(--tp-radius-lg)] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5 shadow-[var(--tp-shadow-sm)]",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cx(
            "h-1.5 w-1.5 rounded-full",
            indicator
          )}
        />

        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--tp-muted)]">
          {label}
        </p>
      </div>

      <div className="mt-3 text-2xl font-black tracking-[-0.035em] text-[var(--tp-ink)]">
        {value}
      </div>

      {helper && (
        <p className="mt-2 text-xs leading-5 text-[var(--tp-muted)]">
          {helper}
        </p>
      )}
    </div>
  );
}

export function ThreepleProgress({
  value,
  label,
  helper,
  className,
}: {
  value: number;
  label?: string;
  helper?: ReactNode;
  className?: string;
}) {
  const safeValue =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(value)
      )
    );

  return (
    <div className={className}>
      {(label || helper) && (
        <div className="mb-2.5 flex items-center justify-between gap-4 text-sm">
          <span className="font-semibold text-[var(--tp-ink-soft)]">
            {label}
          </span>

          <span className="font-bold text-[var(--tp-ink)]">
            {helper ??
              `${safeValue}%`}
          </span>
        </div>
      )}

      <div className="h-2 overflow-hidden rounded-full bg-[var(--tp-primary-soft)]">
        <div
          className="h-full rounded-full bg-[var(--tp-primary)] transition-[width] duration-300"
          style={{
            width:
              `${safeValue}%`,
          }}
        />
      </div>
    </div>
  );
}

export function ThreepleEmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-[var(--tp-radius-lg)] border border-[var(--tp-border)] bg-[var(--tp-surface)] px-6 py-10 text-center shadow-[var(--tp-shadow-sm)] sm:px-8 sm:py-12",
        className
      )}
    >
      <div className="mx-auto h-1 w-10 rounded-full bg-[var(--tp-primary)]" />

      <h3 className="mt-5 text-lg font-black tracking-[-0.025em] text-[var(--tp-ink)]">
        {title}
      </h3>

      {description && (
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--tp-muted)]">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-6 flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}

export function ThreepleDangerZone({
  title = "Danger zone",
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-[var(--tp-radius-lg)] border border-[var(--tp-danger-border)] bg-[var(--tp-surface)] p-6 md:p-8",
        className
      )}
    >
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tp-danger)]">
        Destructive actions
      </p>

      <h2 className="mt-2 text-xl font-black tracking-[-0.025em] text-[var(--tp-ink)]">
        {title}
      </h2>

      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tp-muted)]">
          {description}
        </p>
      )}

      <div className="mt-5 border-t border-[var(--tp-danger-border)] pt-5">
        {children}
      </div>
    </section>
  );
}
