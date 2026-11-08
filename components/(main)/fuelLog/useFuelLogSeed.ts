import { useFetchData } from "@/hooks/useApi";
import { useMemo } from "react";
import { TBike } from "../Bike/type/bike.types";
import { TFuelLogsApiResponse } from "./type/fuel-log.types";

export type TFuelLogSeed = {
  fuelStation?: string;
  pricePerLiter: number;
  isFullTank?: boolean;
};

/**
 * Everything the fuel screen needs to pre-fill a *new* fill-up and to drive the
 * tank forecast. Ported from `bikelog_app`'s `useFuelLogSeed` (spec 52 / 55).
 *
 * ! The newest log comes from its own `?limit=12&sort=-date` query, never from
 * ! the paginated Fuel logs list — on page 2 the first rendered row is a
 * ! months-old log, and seeding the price from it would corrupt the cost history.
 *
 * ! The odometer seed is the bike's `currentOdometer`, NOT the newest fuel log's
 * ! reading: maintenance logs and the Settings odometer panel also advance it, and
 * ! the server validates a new reading against the higher of the two. So
 * ! `currentOdometer` is the floor of the accepted range — least typing, furthest
 * ! from a 400.
 *
 * ! The window is `limit=12`, not `limit=1`: `useTankForecast` has to sum every
 * ! fill-up back to the last full tank, and the list query is paginated and so
 * ! unusable for it. 12 covers a full-tank interval at any realistic fill pattern;
 * ! when it doesn't, the forecast hook's window check degrades the card instead of
 * ! guessing. Same cache key, so the seed still just reads `result[0]`.
 */
export function useFuelLogSeed(bikeId: string) {
  const { data: bikeData, isLoading: isBikeLoading } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeData?.data;

  const { data: lastLogData, isLoading: isLastLogLoading } =
    useFetchData<TFuelLogsApiResponse>(
      ["fuelLogs", bikeId, "latest"],
      `/bikes/${bikeId}/fuel-logs?limit=12&sort=-date`,
      { enabled: !!bikeId },
    );
  const recentLogs = lastLogData?.data?.result ?? [];
  const lastLog = recentLogs[0];

  const seed = useMemo<TFuelLogSeed | undefined>(() => {
    if (!lastLog) return undefined;
    return {
      fuelStation: lastLog?.fuelStation,
      pricePerLiter: lastLog?.pricePerLiter,
      isFullTank: lastLog?.isFullTank ?? false,
    };
  }, [lastLog]);

  return {
    seed,
    odometerSeed: bike?.currentOdometer,
    bike,
    recentLogs,
    isLoading: isBikeLoading || isLastLogLoading,
  };
}
