"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchData, usePatch } from "@/hooks/useApi";
import { useState } from "react";
import { toast } from "sonner";
import { TBike, TUpdateOdometerPayload } from "../Bike/type/bike.types";
import { catalogInput } from "./CatalogCard";

/**
 * Settings card for setting a bike's latest odometer reading without logging fuel
 * or maintenance. The backend (spec 44) rejects anything below the current reading;
 * the same rule is checked here first so the rider gets the message without a round trip.
 */
export default function OdometerSection() {
  const { data, isLoading } = useFetchData<TBike[]>(["bikes"], "/bikes");
  // prefix keys: ["bikes"] also covers ["bikes", bikeId], ["reminders"] covers ["reminders", bikeId]
  const { mutateAsync: updateOdometer, isPending } = usePatch([
    ["bikes"],
    ["reminders"],
  ]);
  const bikes = data?.data ?? [];

  const [selectedId, setSelectedId] = useState("");
  const [reading, setReading] = useState("");

  // fall back to the first bike until the rider picks one (or if the picked bike vanished)
  const bike = bikes?.find((b) => b?._id === selectedId) ?? bikes?.[0];
  const current = bike?.currentOdometer ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault();
    if (!bike || !reading?.trim()) return;

    const value = Number(reading);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid odometer reading");
      return;
    }
    if (value < current) {
      toast.error(`Must be at least ${current?.toLocaleString()} km`);
      return;
    }

    const payload: TUpdateOdometerPayload = { currentOdometer: value };
    try {
      await updateOdometer({
        url: `/bikes/${bike?._id}/odometer`,
        payload: payload as unknown as Record<string, unknown>,
      });
      toast.success("Odometer updated");
      setReading("");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to update odometer");
    }
  };

  return (
    <section className="panel flex flex-col">
      <div className="px-4 pt-3.5 pb-2">
        <div className="font-medium">Odometer</div>
        <div className="text-xs text-muted-foreground">
          Set your bike&apos;s latest reading
        </div>
      </div>

      <div className="px-4 pb-4">
        {isLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : bikes?.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Add a bike first.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {bikes?.length > 1 ? (
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Bike
                <select
                  value={bike?._id}
                  onChange={(e) => setSelectedId(e?.target?.value)}
                  className={catalogInput}
                >
                  {bikes?.map((b) => (
                    <option key={b?._id} value={b?._id}>
                      {b?.nickname}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="text-sm">{bike?.nickname}</div>
            )}

            <div className="text-sm text-muted-foreground">
              Current:{" "}
              <span className="font-medium tabular-nums text-foreground">
                {current?.toLocaleString()} km
              </span>
            </div>

            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              New odometer reading (km)
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                value={reading}
                onChange={(e) => setReading(e?.target?.value)}
                placeholder={String(current)}
                className={catalogInput}
              />
            </label>

            <Button
              type="submit"
              disabled={isPending || !reading?.trim()}
              className="self-start"
            >
              {isPending ? "Updating…" : "Update odometer"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
