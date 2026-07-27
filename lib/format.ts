/** "in 59 minutes" / "3 minutes ago". Null until the clock has started (see useNow). */
export function relativeTime(target: string, now: number): string | null {
  if (now === 0) return null;

  const deltaSeconds = Math.round((new Date(target).getTime() - now) / 1000);
  const absolute = Math.abs(deltaSeconds);

  const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
    absolute < 60
      ? [deltaSeconds, "second"]
      : absolute < 3600
        ? [Math.round(deltaSeconds / 60), "minute"]
        : [Math.round(deltaSeconds / 3600), "hour"];

  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
    value,
    unit,
  );
}
