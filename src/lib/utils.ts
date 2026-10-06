/**
 * Format number with comma separators consistently across SSR and client,
 * avoiding hydration mismatch between server (en-US) and user's browser locale (id-ID).
 */
export function formatNumber(num: number): string {
  return Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
