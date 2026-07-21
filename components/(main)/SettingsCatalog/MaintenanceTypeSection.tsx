"use client";

import { useFetchData, usePost } from "@/hooks/useApi";
import { useState } from "react";
import { toast } from "sonner";
import {
  TMaintenanceType
} from "./type/maintenance-type.types";

export default function MaintenanceTypeSection() {
  const { data, isLoading } = useFetchData<TMaintenanceType[]>(
    ["maintenanceTypes"],
    "/maintenance-types",
  );
  const { mutateAsync: createMutation, isPending } = usePost([
    ["maintenanceTypes"],
  ]);
  const types = data?.data ?? [];

  const [name, setName] = useState("");
  const [defaultIntervalKm, setDefaultIntervalKm] = useState("");
  const [defaultIntervalDays, setDefaultIntervalDays] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createMutation({
        url: "/maintenance-types",
        payload: {
          name: name.trim(),
          ...(defaultIntervalKm
            ? { defaultIntervalKm: Number(defaultIntervalKm) }
            : {}),
          ...(defaultIntervalDays
            ? { defaultIntervalDays: Number(defaultIntervalDays) }
            : {}),
        } as unknown as Record<string, unknown>,
      });
      toast.success("Maintenance type created");
      setName("");
      setDefaultIntervalKm("");
      setDefaultIntervalDays("");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to create maintenance type");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Maintenance Types</h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-lg border border-border bg-card p-4"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (e.g. Chain Lube)"
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="flex gap-3">
          <input
            type="number"
            value={defaultIntervalKm}
            onChange={(e) => setDefaultIntervalKm(e.target.value)}
            placeholder="Interval km (optional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={defaultIntervalDays}
            onChange={(e) => setDefaultIntervalDays(e.target.value)}
            placeholder="Interval days (optional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Add"}
        </button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : types.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No maintenance types yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {types.map((t) => (
            <li
              key={t._id}
              className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
            >
              <span className="font-medium">{t.name}</span>
              {t.defaultIntervalKm && (
                <span className="ml-2 text-muted-foreground">
                  · {t.defaultIntervalKm} km
                </span>
              )}
              {t.defaultIntervalDays && (
                <span className="ml-2 text-muted-foreground">
                  · {t.defaultIntervalDays} days
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
