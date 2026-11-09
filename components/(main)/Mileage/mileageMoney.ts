// Guarded money formatters shared by the Mileage cost figures (spec 41).
// Every figure is derived (price/L = cost ÷ litres, cost/km = cost ÷ distance), so a
// missing/zero source must read "—", never "৳undefined" or "৳NaN".

const taka0 = (n: number) =>
  `৳${Math.round(n)?.toLocaleString()}`;

const taka2 = (n: number) =>
  `৳${n?.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Total fuel cost, whole-taka. "—" when absent/zero. */
export const fuelCostStr = (cost?: number) =>
  typeof cost === "number" && cost > 0 ? taka0(cost) : "—";

/** cost ÷ divisor to 2 dp. "—" when the cost is absent/zero or the divisor is ≤ 0. */
export const perUnitStr = (cost?: number, divisor?: number) =>
  typeof cost === "number" && cost > 0 && typeof divisor === "number" && divisor > 0
    ? taka2(cost / divisor)
    : "—";
