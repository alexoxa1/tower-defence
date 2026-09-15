const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const standard = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return compact.format(value);
  return standard.format(value);
}

export function money(value: number): string {
  return `$${formatNumber(Math.round(value))}`;
}
