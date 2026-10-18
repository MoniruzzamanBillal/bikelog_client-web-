"use client";

import ConfirmDeleteModal from "@/components/shared/Modal/ConfirmDeleteModal";
import { Button } from "@/components/ui/button";
import { useDelete, useFetchData, usePatch, usePost } from "@/hooks/useApi";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import CatalogCard, { catalogInput } from "./CatalogCard";
import { TMaintenanceType } from "./type/maintenance-type.types";

const dash = (v?: number | null) => (v == null ? "—" : v?.toLocaleString());

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
  const { mutateAsync: deleteMutation, isPending: isDeleting } = useDelete([
    ["maintenanceTypes"],
  ]);
  const types = data?.data ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [defaultIntervalKm, setDefaultIntervalKm] = useState("");
  const [defaultIntervalDays, setDefaultIntervalDays] = useState("");
  // ! Spec 33 §F: the "needs an engine oil type" checkbox is GONE from both the add form
  // ! and the inline edit row. It gated the engine-oil select on the maintenance log,
  // ! which no longer exists — engine oil is its own module now. `requiresOilType` stays
  // ! in the database and in the API (the server's spec 54 import selector reads it), and
  // ! neither payload below sends it any more, so existing flags are left exactly as they
  // ! are rather than being silently cleared on the next edit.

  // a target object, not a boolean — the modal copy names the row being deleted
  const [deleteTarget, setDeleteTarget] = useState<TMaintenanceType | null>(
    null,
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIntervalKm, setEditIntervalKm] = useState("");
  const [editIntervalDays, setEditIntervalDays] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault();
    if (!name?.trim()) return;
    try {
      await createMutation({
        url: "/maintenance-types",
        payload: {
          name: name?.trim(),
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
    setEditingId(type?._id);
    setEditName(type?.name);
    setEditIntervalKm(
      type?.defaultIntervalKm != null ? String(type?.defaultIntervalKm) : "",
    );
    setEditIntervalDays(
      type?.defaultIntervalDays != null ? String(type?.defaultIntervalDays) : "",
    );
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditIntervalKm("");
    setEditIntervalDays("");
  };

  const handleSaveEdit = async () => {
    if (!editName?.trim() || !editingId) return;
    try {
      await updateMutation({
        url: `/maintenance-types/${editingId}`,
        payload: {
          name: editName?.trim(),
          defaultIntervalKm: editIntervalKm?.trim()
            ? Number(editIntervalKm)
            : null,
          defaultIntervalDays: editIntervalDays?.trim()
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

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteMutation({ url: `/maintenance-types/${target?._id}` });
      toast.success("Maintenance type deleted");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      // ! The backend's 409 sentence arrives here verbatim and is the whole point —
      // ! toast.warning, not toast.error: a refusal is not a failure.
      toast.warning(message ?? "Failed to delete maintenance type");
    }
  };

  return (
    <>
      <CatalogCard
        title="Maintenance types"
        subtitle="Your catalog · used by your maintenance logs and reminders"
        headers={[
          { label: "Interval km", short: "km" },
          { label: "Interval days", short: "days" },
        ]}
        isLoading={isLoading}
        isEmpty={types?.length === 0}
        emptyText="No maintenance types yet — add the services you want to track (oil change, chain lube, tyres). Your catalog starts empty."
        addOpen={addOpen}
        onToggleAdd={() => setAddOpen((o) => !o)}
        addForm={
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e?.target?.value)}
              placeholder="Name (e.g. Chain Lube)"
              required
              className={catalogInput}
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={defaultIntervalKm}
                onChange={(e) => setDefaultIntervalKm(e?.target?.value)}
                placeholder="Interval km (optional)"
                className={catalogInput}
              />
              <input
                type="number"
                value={defaultIntervalDays}
                onChange={(e) => setDefaultIntervalDays(e?.target?.value)}
                placeholder="Interval days (optional)"
                className={catalogInput}
              />
            </div>
            <Button
              type="submit"
              disabled={isPending || !name?.trim()}
              className="self-start"
            >
              {isPending ? "Adding…" : "Add type"}
            </Button>
          </form>
        }
      >
        {types?.map((t) =>
          editingId === t?._id ? (
            <tr key={t?._id} className="row-fade">
              <td className="py-1.5 pr-1 pl-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e?.target?.value)}
                  placeholder="Name"
                  className={catalogInput}
                />
              </td>
              <td className="px-1 py-1.5 align-top">
                <input
                  type="number"
                  value={editIntervalKm}
                  onChange={(e) => setEditIntervalKm(e?.target?.value)}
                  placeholder="km"
                  className={`${catalogInput} text-right`}
                />
              </td>
              <td className="px-1 py-1.5 align-top">
                <input
                  type="number"
                  value={editIntervalDays}
                  onChange={(e) => setEditIntervalDays(e?.target?.value)}
                  placeholder="days"
                  className={`${catalogInput} text-right`}
                />
              </td>
              <td className="py-1.5 pr-2 align-top">
                <div className="flex justify-end gap-0.5">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isUpdating || !editName?.trim()}
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
            <tr key={t?._id} className="row-fade h-11">
              <td className="pl-4">{t?.name}</td>
              <td className="px-2 text-right text-muted-foreground">
                {dash(t?.defaultIntervalKm)}
              </td>
              <td className="px-2 text-right text-muted-foreground">
                {dash(t?.defaultIntervalDays)}
              </td>
              <td className="pr-2">
                <div className="flex justify-end gap-0.5">
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    className="grid size-[30px] place-items-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                    title="Edit"
                    aria-label={`Edit ${t?.name}`}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(t)}
                    className="grid size-[30px] place-items-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-destructive"
                    title="Delete"
                    aria-label={`Delete ${t?.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ),
        )}
      </CatalogCard>

      {/* ! outside CatalogCard — it renders a <table>, and a modal inside a <tr> is invalid DOM nesting */}
      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete maintenance type?"
        description={`"${deleteTarget?.name}" will be removed from the catalog. Maintenance logs that already used it keep their history.`}
        isLoading={isDeleting}
      />
    </>
  );
}
