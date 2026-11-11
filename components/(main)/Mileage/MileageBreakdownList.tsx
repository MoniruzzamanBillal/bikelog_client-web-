"use client";

import { fuelCostStr, perUnitStr } from "./mileageMoney";

export type TBreakdownRow = {
  // headline label — a year ("2026") on Lifetime, a month name on Yearly
  label: string;
  totalDistanceKm: number;
  totalLitersConsumed: number;
  totalFuelCost?: number;
  fuelLogCount: number;
};

/**
 * A per-period metric table — a row per year (Lifetime BY YEAR) or per month.
 * Figures are derived and individually guarded (spec 41): average km/l, fuel cost,
 * price/L and cost/km each read "—" when their source is missing, never "NaN".
 */
export default function MileageBreakdownList({
  rows,
}: {
  rows: TBreakdownRow[];
}) {
  if (rows?.length === 0) return null;

  const avgStr = (r: TBreakdownRow) =>
    r?.totalLitersConsumed > 0
      ? (r?.totalDistanceKm / r?.totalLitersConsumed)?.toFixed(2)
      : "—";

  return (
    <div className="panel overflow-x-auto px-1.5 py-1">
      <table className="w-full text-[13px] tabular-nums">
        <thead>
          <tr className="row-fade">
            <th className="h-9 px-2 text-left text-[11px] font-normal tracking-[0.08em] text-muted-foreground uppercase">
              Period
            </th>
            {["Distance", "Fuel used", "Fuel cost", "Price / L", "Cost / km", "Fills", "Avg"].map(
              (h) => (
                <th
                  key={h}
                  className="h-9 px-2 text-right text-[11px] font-normal tracking-[0.08em] text-muted-foreground uppercase whitespace-nowrap"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows?.map((r) => (
            <tr key={r?.label} className="row-fade h-10">
              <td className="px-2">{r?.label}</td>
              <td className="px-2 text-right whitespace-nowrap">
                {r?.totalDistanceKm?.toLocaleString()} km
              </td>
              <td className="px-2 text-right whitespace-nowrap">
                {r?.totalLitersConsumed?.toFixed(2)} L
              </td>
              <td className="px-2 text-right whitespace-nowrap">
                {fuelCostStr(r?.totalFuelCost)}
              </td>
              <td className="px-2 text-right whitespace-nowrap">
                {perUnitStr(r?.totalFuelCost, r?.totalLitersConsumed)}
              </td>
              <td className="px-2 text-right whitespace-nowrap">
                {perUnitStr(r?.totalFuelCost, r?.totalDistanceKm)}
              </td>
              <td className="px-2 text-right">{r?.fuelLogCount}</td>
              <td className="px-2 text-right whitespace-nowrap">
                {avgStr(r) === "—" ? "—" : `${avgStr(r)} km/l`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
