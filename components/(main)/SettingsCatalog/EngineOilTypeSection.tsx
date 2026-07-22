"use client";

import { useFetchData, usePost } from "@/hooks/useApi";
import { useState } from "react";
import { toast } from "sonner";
import { TEngineOilType } from "./type/engine-oil-type.types";

export default function EngineOilTypeSection() {
  const { data, isLoading } = useFetchData<TEngineOilType[]>(
    ["engineOilTypes"],
    "/engine-oil-types",
  );
  const { mutateAsync: createMutation, isPending } = usePost([
    ["engineOilTypes"],
  ]);
  const types = data?.data ?? [];

  const [name, setName] = useState("");
  const [suggestedIntervalKm, setSuggestedIntervalKm] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !suggestedIntervalKm) return;
    try {
      await createMutation({
        url: "/engine-oil-types",
        payload: {
          name: name.trim(),
          suggestedIntervalKm: Number(suggestedIntervalKm),
        } as unknown as Record<string, unknown>,
      });
      toast.success("Engine oil type created");
      setName("");
      setSuggestedIntervalKm("");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to create engine oil type");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Engine Oil Types</h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-lg border border-border bg-card p-4"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (e.g. Synthetic)"
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          type="number"
          value={suggestedIntervalKm}
          onChange={(e) => setSuggestedIntervalKm(e.target.value)}
          placeholder="Suggested interval (km)"
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isPending || !name.trim() || !suggestedIntervalKm}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Add"}
        </button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : types.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No engine oil types yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {types.map((t) => (
            <li
              key={t._id}
              className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
            >
              <span className="font-medium">{t.name}</span>
              <span className="ml-2 text-muted-foreground">
                · {t.suggestedIntervalKm} km
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
