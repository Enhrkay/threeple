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
          ? "tp-card-soft"
          : "tp-card",
        interactive &&
          "tp-hover-card",
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
      <div>
        {eyebrow && (
          <p className="tp-kicker">
            {eyebrow}
          </p>
        )}

        <h2 className="tp-heading mt-2 text-2xl">
          {title}
        </h2>

        {description && (
          <p className="tp-body mt-2 max-w-2xl text-sm">
            {description}
          </p>
        )}
      </div>

      {action}
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
  return (
    <span
      className={cx(
        "tp-badge",
        `tp-badge-${tone}`,
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
  return (
    <div
      className={cx(
        "tp-alert",
        `tp-alert-${tone}`,
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
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        "tp-btn",
        `tp-btn-${variant}`,
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
  return (
    <Link
      href={href}
      className={cx(
        "tp-btn",
        `tp-btn-${variant}`,
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
  const surface =
    tone === "success"
      ? "bg-[var(--tp-success-soft)] border-[var(--tp-success-border)]"
      : tone === "warning"
        ? "bg-[var(--tp-warning-soft)] border-[var(--tp-warning-border)]"
        : tone === "primary"
          ? "bg-[var(--tp-primary-soft)] border-[var(--tp-primary-border)]"
          : "bg-[var(--tp-surface)] border-[var(--tp-border)]";

  return (
    <div
      className={cx(
        "rounded-[var(--tp-radius-lg)] border p-5",
        surface,
        className
      )}
    >
      <p className="tp-kicker">
        {label}
      </p>

      <div className="tp-heading mt-3 text-2xl">
        {value}
      </div>

      {helper && (
        <p className="tp-muted mt-2 text-xs leading-5">
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
        <div className="mb-2 flex items-center justify-between gap-4 text-sm">
          <span className="font-bold text-[var(--tp-ink-soft)]">
            {label}
          </span>

          <span className="font-black text-[var(--tp-ink)]">
            {helper ??
              `${safeValue}%`}
          </span>
        </div>
      )}

      <div className="tp-progress-track">
        <div
          className="tp-progress-bar"
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
        "rounded-[var(--tp-radius-lg)] border border-dashed border-[var(--tp-border-strong)] bg-[var(--tp-bg-soft)] p-8 text-center",
        className
      )}
    >
      <h3 className="tp-heading text-lg">
        {title}
      </h3>

      {description && (
        <p className="tp-body mx-auto mt-2 max-w-lg text-sm">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-5 flex justify-center">
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
        "tp-danger-zone p-6 md:p-8",
        className
      )}
    >
      <p className="tp-kicker text-[var(--tp-danger)]">
        Destructive actions
      </p>

      <h2 className="mt-2 text-xl font-black text-[var(--tp-danger)]">
        {title}
      </h2>

      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tp-danger)]/80">
          {description}
        </p>
      )}

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}
