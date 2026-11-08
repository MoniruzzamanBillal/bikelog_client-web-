"use client";

import { format } from "date-fns";
import { useTankForecast } from "./useTankForecast";

/**
 * ! The range sentence is fixed copy and identical in every state that shows it, so the
 * ! number is recognisably the same wherever the rider meets it. The `~` moves with the
 * ! mileage figure.
 */
function rangeSentence(halfRangeKm: number): string {
  return `~${halfRangeKm.toLocaleString()} km on half a tank`;
}

/**
 * ! The basis is named, never implied. A 40 → 45 km/L swing moves the half-range by 30 km,
 * ! so an unlabelled figure is one the rider cannot audit.
 */
function basisLine(kmPerLiter: number, basis: "exact" | "approximate"): string {
  const label = basis === "exact" ? "exact" : "estimated";
  return `${kmPerLiter.toFixed(1)} km/L (${label})`;
}

/**
 * ! The date is the thing the rider asked for, so it is the headline in every live state that
 * ! has one. `~` is load-bearing: `currentOdometer` only advances on a fuel/maintenance log or
 * ! the Settings panel, so between logs this card reports MORE fuel than the bike has — the
 * ! hook floors every figure to compensate, and an unhedged date would be a measurement-shaped
 * ! lie. Never a named weekday: the Dhaka weekend is Fri–Sat and may be the non-riding days.
 */
function headline(halfDate: Date | null, kmToHalf: number): string {
  if (!halfDate) return `~${kmToHalf.toLocaleString()} km to go`;
  return `Half tank ~ ${format(halfDate, "d MMM")}`;
}

function subLine(daysToHalf: number, kmToHalf: number): string {
  const when =
    daysToHalf <= 0
      ? "today"
      : daysToHalf === 1
        ? "tomorrow"
        : `in ${daysToHalf} days`;
  return `${when} · ~${kmToHalf.toLocaleString()} km to go`;
}

/**
 * The half-tank date and the standing full-to-half range (ported from `bikelog_app` spec 55).
 *
 * ! Deliberately NOT styled like a reminder alert — this is a forecast, so it carries no tone
 * ! colour, no icon badge and no status pill. The audit lines below the headline are what make
 * ! it checkable: if the date looks wrong, that is where the rider sees why.
 */
export default function TankForecastCard({ bikeId }: { bikeId: string }) {
  const forecast = useTankForecast(bikeId);

  // A bike with no usable mileage figure gets no card at all, rather than a card full of dashes.
  if (forecast?.state === "unavailable") return null;

  const { halfRangeKm, kmPerLiter, basis } = forecast;
  const rangeAndBasis = `${rangeSentence(halfRangeKm)} · ${basisLine(
    kmPerLiter,
    basis,
  )}`;

  return (
    <div className="panel flex flex-col gap-0.5 px-3.5 py-3 tabular-nums">
      <span className="mb-1 text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
        Tank forecast
      </span>

      {forecast?.state === "range-only" ? (
        <>
          <span className="text-[13px] font-medium text-foreground">
            {rangeSentence(halfRangeKm)}
          </span>
          <span className="text-[10px] text-foreground">
            {basisLine(kmPerLiter, basis)}
          </span>
          <span className="mt-1 text-[10.5px] text-muted-foreground">
            Mark a fill-up as a full tank to get the date.
          </span>
        </>
      ) : forecast?.pastHalf ? (
        <>
          <span className="text-sm font-semibold text-foreground">
            Past half tank
          </span>
          <div className="mt-1.5 flex flex-col gap-0.5 text-[10px] text-foreground">
            <span>
              {forecast?.riddenSinceAnchorKm?.toLocaleString()} km since{" "}
              {format(new Date(forecast?.anchorDate), "d MMM")} full tank
            </span>
            <span>{rangeAndBasis}</span>
          </div>
        </>
      ) : (
        <>
          <span className="text-sm font-semibold text-foreground">
            {headline(forecast?.halfDate, forecast?.kmToHalf)}
          </span>
          {forecast?.daysToHalf != null && (
            <span className="text-[11px] font-medium text-foreground/90">
              {subLine(forecast?.daysToHalf, forecast?.kmToHalf)}
            </span>
          )}
          <div className="mt-1.5 flex flex-col gap-0.5 text-[10px] text-foreground">
            <span>
              {forecast?.riddenSinceAnchorKm?.toLocaleString()} km since{" "}
              {format(new Date(forecast?.anchorDate), "d MMM")} full tank
            </span>
            <span>{rangeAndBasis}</span>
          </div>
        </>
      )}

      {/* ! Said once, and only here. `fuelTankCapacityLiters` is nominal, and a gauge needle at
          ! "half" is not half the fuel — so the card computes half the FUEL and says so. */}
      <span className="mt-1.5 text-[9.5px] text-foreground">
        Half the fuel, not the gauge.
      </span>
    </div>
  );
}
