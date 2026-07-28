import type { ComponentProps } from "react";

/**
 * The app's entire UI kit: a class-name joiner and a button.
 *
 * This is what replaces a component library. Deliberately dumb — no variants engine, no
 * polymorphic `as`, no context — so the markup a component renders is obvious from reading
 * it. Everything else in the app styles itself with utility classes inline.
 */

/** Join class names, dropping falsy ones. Enough for conditional styling here. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const BUTTON_BASE =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:pointer-events-none disabled:opacity-50";

const BUTTON_VARIANTS = {
  // Filled: the darkest thing on screen, so it reads as the main action.
  primary: "bg-neutral-900 text-white hover:bg-neutral-700",
  outline: "border border-neutral-300 text-neutral-900 hover:bg-neutral-100",
  ghost: "text-neutral-700 hover:bg-neutral-100",
  danger: "bg-red-50 text-red-700 hover:bg-red-100",
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
