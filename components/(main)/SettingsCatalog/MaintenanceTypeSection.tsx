"use client";

import { useFetchData, usePatch, usePost } from "@/hooks/useApi";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TMaintenanceType } from "./type/maintenance-type.types";

export default function MaintenanceTypeSection() {
  const { data, isLoading } = useFetchData<TMaintenanceType[]>(
    ["maintenanceTypes"],
    "/maintenance-types",
  );
  const { mutateAsync: createMutation, isPending } = usePost([
    ["maintenanceTypes"],
  ]);
  const { mutateAsync: updateMutation, isPending: isUpdating } = usePatch([
    ["maintenanceTypes"],
  ]);
  const types = data?.data ?? [];

  const [name, setName] = useState("");
  const [defaultIntervalKm, setDefaultIntervalKm] = useState("");
  const [defaultIntervalDays, setDefaultIntervalDays] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIntervalKm, setEditIntervalKm] = useState("");
  const [editIntervalDays, setEditIntervalDays] = useState("");

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

  const startEdit = (type: TMaintenanceType) => {
    setEditingId(type._id);
    setEditName(type.name);
    setEditIntervalKm(
      type.defaultIntervalKm !== undefined
        ? String(type.defaultIntervalKm)
        : "",
    );
    setEditIntervalDays(
      type.defaultIntervalDays !== undefined
        ? String(type.defaultIntervalDays)
        : "",
    );
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditIntervalKm("");
    setEditIntervalDays("");
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    try {
      await updateMutation({
        url: `/maintenance-types/${editingId}`,
        payload: {
          name: editName.trim(),
          defaultIntervalKm: editIntervalKm.trim()
            ? Number(editIntervalKm)
            : null,
          defaultIntervalDays: editIntervalDays.trim()
            ? Number(editIntervalDays)
            : null,
        } as unknown as Record<string, unknown>,
      });
      toast.success("Maintenance type updated");
      cancelEdit();
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to update maintenance type");
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
          {types.map((t) =>
            editingId === t._id ? (
              <li
                key={t._id}
                className="space-y-3 rounded-lg border border-border bg-card p-4"
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Name"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={editIntervalKm}
                    onChange={(e) => setEditIntervalKm(e.target.value)}
                    placeholder="Interval km (optional)"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={editIntervalDays}
                    onChange={(e) => setEditIntervalDays(e.target.value)}
                    placeholder="Interval days (optional)"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isUpdating || !editName.trim()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={t._id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm"
              >
                <div>
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
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  title="Edit"
                >
                  <Pencil className="size-4" />
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
