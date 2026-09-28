"use client";

import { Button } from "@/components/ui/button";
import { useFetchData, usePatch, usePost } from "@/hooks/useApi";
import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import CatalogCard, { catalogInput } from "./CatalogCard";
import { TMaintenanceType } from "./type/maintenance-type.types";

const dash = (v?: number | null) => (v == null ? "—" : v.toLocaleString());

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

  const [addOpen, setAddOpen] = useState(false);
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
      setAddOpen(false);
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to create maintenance type");
    }
  };

  const startEdit = (type: TMaintenanceType) => {
    setEditingId(type._id);
    setEditName(type.name);
    setEditIntervalKm(
      type.defaultIntervalKm != null ? String(type.defaultIntervalKm) : "",
    );
    setEditIntervalDays(
      type.defaultIntervalDays != null ? String(type.defaultIntervalDays) : "",
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
    <CatalogCard
      title="Maintenance types"
      subtitle="Shared catalog · used by maintenance logs and reminders"
      headers={[
        { label: "Interval km", short: "km" },
        { label: "Interval days", short: "days" },
      ]}
      isLoading={isLoading}
      isEmpty={types.length === 0}
      emptyText="No maintenance types yet."
      addOpen={addOpen}
      onToggleAdd={() => setAddOpen((o) => !o)}
      addForm={
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (e.g. Chain Lube)"
            required
            className={catalogInput}
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={defaultIntervalKm}
              onChange={(e) => setDefaultIntervalKm(e.target.value)}
              placeholder="Interval km (optional)"
              className={catalogInput}
            />
            <input
              type="number"
              value={defaultIntervalDays}
              onChange={(e) => setDefaultIntervalDays(e.target.value)}
              placeholder="Interval days (optional)"
              className={catalogInput}
            />
          </div>
          <Button
            type="submit"
            disabled={isPending || !name.trim()}
            className="self-start"
          >
            {isPending ? "Adding…" : "Add type"}
          </Button>
        </form>
      }
    >
      {types.map((t) =>
        editingId === t._id ? (
          <tr key={t._id} className="row-fade">
            <td className="py-1.5 pr-1 pl-4">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Name"
                className={catalogInput}
              />
            </td>
            <td className="px-1 py-1.5">
              <input
                type="number"
                value={editIntervalKm}
                onChange={(e) => setEditIntervalKm(e.target.value)}
                placeholder="km"
                className={`${catalogInput} text-right`}
              />
            </td>
            <td className="px-1 py-1.5">
              <input
                type="number"
                value={editIntervalDays}
                onChange={(e) => setEditIntervalDays(e.target.value)}
                placeholder="days"
                className={`${catalogInput} text-right`}
              />
            </td>
            <td className="py-1.5 pr-2">
              <div className="flex justify-end gap-0.5">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isUpdating || !editName.trim()}
                  className="grid size-[30px] place-items-center rounded-md text-success hover:bg-surface-hover disabled:opacity-45"
                  title="Save"
                  aria-label="Save"
                >
                  <Check className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="grid size-[30px] place-items-center rounded-md text-muted-foreground hover:bg-surface-hover"
                  title="Cancel"
                  aria-label="Cancel"
                >
                  <X className="size-4" />
                </button>
              </div>
            </td>
          </tr>
        ) : (
          <tr key={t._id} className="row-fade h-11">
            <td className="pl-4">{t.name}</td>
            <td className="px-2 text-right text-muted-foreground">
              {dash(t.defaultIntervalKm)}
            </td>
            <td className="px-2 text-right text-muted-foreground">
              {dash(t.defaultIntervalDays)}
            </td>
            <td className="pr-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  className="grid size-[30px] place-items-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  title="Edit"
                  aria-label={`Edit ${t.name}`}
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
            </td>
          </tr>
        ),
      )}
    </CatalogCard>
  );
}
