import type { ComponentProps } from "react";

/**
 * The app's entire UI kit: four plain-Tailwind building blocks.
 *
 * These replace what a component library would provide. They are deliberately dumb —
 * no variants engine, no polymorphic `as`, no context. Each one is a native element with
 * a class string, so the markup a component renders is obvious from reading it.
 */

/** Join class names, dropping falsy ones. Enough for conditional styling here. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const BUTTON_BASE =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:pointer-events-none disabled:opacity-50";

const BUTTON_VARIANTS = {
  // Filled: inverts in dark mode so it stays the most prominent thing on the card.
  primary:
    "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300",
  outline:
    "border border-neutral-300 text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800",
  ghost:
    "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
  danger:
    "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-950",
} as const;

const BUTTON_SIZES = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
}) {
  return (
    <button
      type="button"
      className={cx(
        BUTTON_BASE,
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

/** Same look as Button, for a real link (used by Connect, which is an <a>). */
export function buttonClass(
  variant: keyof typeof BUTTON_VARIANTS = "primary",
  size: keyof typeof BUTTON_SIZES = "md",
): string {
  return cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size]);
}

const BADGE_VARIANTS = {
  solid:
    "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900",
  muted:
    "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
  outline:
    "border border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300",
  danger:
    "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400",
} as const;

export function Badge({
  variant = "muted",
  className,
  ...props
}: ComponentProps<"span"> & { variant?: keyof typeof BADGE_VARIANTS }) {
  return (
    <span
      className={cx(
        "inline-flex h-5 w-fit shrink-0 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap",
        BADGE_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
      {...props}
    />
  );
}

export function Divider({ className, ...props }: ComponentProps<"hr">) {
  return (
    <hr
      className={cx(
        "border-neutral-200 dark:border-neutral-800",
        className,
      )}
      {...props}
    />
  );
}
