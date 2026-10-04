"use client";

import ConfirmDeleteModal from "@/components/shared/Modal/ConfirmDeleteModal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  // ! Spec 30 §B. Plain useState and the `components/ui/checkbox` primitive directly, NOT
  // ! `ControlledCheckbox` as spec 30 §B suggested — that one calls `useFormContext()` and
  // ! this file has no react-hook-form anywhere. See spec 30a for the full reasoning.
  const [requiresOilType, setRequiresOilType] = useState(false);

  // a target object, not a boolean — the modal copy names the row being deleted
  const [deleteTarget, setDeleteTarget] = useState<TMaintenanceType | null>(
    null,
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIntervalKm, setEditIntervalKm] = useState("");
  const [editIntervalDays, setEditIntervalDays] = useState("");
  const [editRequiresOilType, setEditRequiresOilType] = useState(false);

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
          requiresOilType,
        } as unknown as Record<string, unknown>,
      });
      toast.success("Maintenance type created");
      setName("");
      setDefaultIntervalKm("");
      setDefaultIntervalDays("");
      setRequiresOilType(false);
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
    setEditRequiresOilType(!!type?.requiresOilType);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditIntervalKm("");
    setEditIntervalDays("");
    setEditRequiresOilType(false);
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
          requiresOilType: editRequiresOilType,
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
            <div className="flex items-start gap-2">
              <Checkbox
                id="requiresOilType"
                checked={requiresOilType}
                // ! Radix types this `boolean | "indeterminate"`, hence the narrowing
                onCheckedChange={(v) => setRequiresOilType(v === true)}
                className="mt-0.5"
              />
              <label
                htmlFor="requiresOilType"
                className="cursor-pointer text-[13px] leading-5"
              >
                Needs an engine oil type
                <span className="block text-xs text-muted-foreground">
                  Shows the oil-type picker when logging this service
                </span>
              </label>
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
                {/* ! Stacked UNDER the name input, inside the existing Name cell, rather
                    ! than given a column of its own — a 5th column squeezes the name input
                    ! below usability at 375px, which is this project's real design target
                    ! (bikelog_app spec 43 hit exactly this with the same table pattern). */}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Checkbox
                    id={`requiresOilType-${t?._id}`}
                    checked={editRequiresOilType}
                    onCheckedChange={(v) => setEditRequiresOilType(v === true)}
                  />
                  <label
                    htmlFor={`requiresOilType-${t?._id}`}
                    className="cursor-pointer text-xs whitespace-nowrap text-muted-foreground"
                  >
                    Needs oil type
                  </label>
                </div>
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
