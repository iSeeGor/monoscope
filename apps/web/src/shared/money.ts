// API money values are decimal strings with two fractional digits. Summing them
// in integer cents keeps a locally filtered subtotal identical to the totals the
// Python service reports for the same set of transactions.
export function sumMoney(values: readonly string[]) {
  const cents = values.reduce((total, value) => total + Math.round(Number(value) * 100), 0)
  return (cents / 100).toFixed(2)
}
