"use client";

import ConfirmDeleteModal from "@/components/shared/Modal/ConfirmDeleteModal";
import { Button } from "@/components/ui/button";
import { useDelete, useFetchData, usePatch, usePost } from "@/hooks/useApi";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import CatalogCard, { catalogInput } from "./CatalogCard";
import { TEngineOilType } from "./type/engine-oil-type.types";

export default function EngineOilTypeSection() {
  const { data, isLoading } = useFetchData<TEngineOilType[]>(
    ["engineOilTypes"],
    "/engine-oil-types",
  );
  const { mutateAsync: createMutation, isPending } = usePost([
    ["engineOilTypes"],
  ]);
  const { mutateAsync: updateMutation, isPending: isUpdating } = usePatch([
    ["engineOilTypes"],
  ]);
  const { mutateAsync: deleteMutation, isPending: isDeleting } = useDelete([
    ["engineOilTypes"],
  ]);
  const types = data?.data ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [suggestedIntervalKm, setSuggestedIntervalKm] = useState("");

  // a target object, not a boolean — the modal copy names the row being deleted
  const [deleteTarget, setDeleteTarget] = useState<TEngineOilType | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIntervalKm, setEditIntervalKm] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault();
    if (!name?.trim() || !suggestedIntervalKm) return;
    try {
      await createMutation({
        url: "/engine-oil-types",
        payload: {
          name: name?.trim(),
          suggestedIntervalKm: Number(suggestedIntervalKm),
        } as unknown as Record<string, unknown>,
      });
      toast.success("Engine oil type created");
      setName("");
      setSuggestedIntervalKm("");
      setAddOpen(false);
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to create engine oil type");
    }
  };

  const startEdit = (type: TEngineOilType) => {
    setEditingId(type?._id);
    setEditName(type?.name);
    setEditIntervalKm(String(type?.suggestedIntervalKm));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditIntervalKm("");
  };

  const handleSaveEdit = async () => {
    if (!editName?.trim() || !editIntervalKm || !editingId) return;
    try {
      await updateMutation({
        url: `/engine-oil-types/${editingId}`,
        payload: {
          name: editName?.trim(),
          suggestedIntervalKm: Number(editIntervalKm),
        } as unknown as Record<string, unknown>,
      });
      toast.success("Engine oil type updated");
      cancelEdit();
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to update engine oil type");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteMutation({ url: `/engine-oil-types/${target?._id}` });
      toast.success("Engine oil type deleted");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      // ! The backend's 409 sentence arrives here verbatim and is the whole point —
      // ! toast.warning, not toast.error: a refusal is not a failure.
      toast.warning(message ?? "Failed to delete engine oil type");
    }
  };

  return (
    <>
      <CatalogCard
        title="Engine oil types"
        subtitle="Suggested interval pre-fills the Engine Oil service form"
        headers={[{ label: "Suggested km", short: "km" }]}
        isLoading={isLoading}
        isEmpty={types?.length === 0}
        emptyText="No engine oil types yet."
        addOpen={addOpen}
        onToggleAdd={() => setAddOpen((o) => !o)}
        addForm={
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e?.target?.value)}
                placeholder="Name (e.g. Synthetic)"
                required
                className={catalogInput}
              />
              <input
                type="number"
                value={suggestedIntervalKm}
                onChange={(e) => setSuggestedIntervalKm(e?.target?.value)}
                placeholder="Suggested km"
                required
                className={catalogInput}
              />
            </div>
            <Button
              type="submit"
              disabled={isPending || !name?.trim() || !suggestedIntervalKm}
              className="self-start"
            >
              {isPending ? "Adding…" : "Add oil type"}
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
              <td className="px-1 py-1.5">
                <input
                  type="number"
                  value={editIntervalKm}
                  onChange={(e) => setEditIntervalKm(e?.target?.value)}
                  placeholder="km"
                  className={`${catalogInput} text-right`}
                />
              </td>
              <td className="py-1.5 pr-2">
                <div className="flex justify-end gap-0.5">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isUpdating || !editName?.trim() || !editIntervalKm}
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
                {t?.suggestedIntervalKm?.toLocaleString()}
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
        title="Delete engine oil type?"
        description={`"${deleteTarget?.name}" will be removed from the catalog. Maintenance logs that already used it keep their history.`}
        isLoading={isDeleting}
      />
    </>
  );
}
