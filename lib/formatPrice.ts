/** Converts cents to a display string. e.g. 4999 → "$49" or "$49.99" */
export function formatPrice(cents: number, showCents = false): string {
  const dollars = cents / 100;
  return showCents
    ? `$${dollars.toFixed(2)}`
    : `$${dollars.toFixed(0)}`;
}
