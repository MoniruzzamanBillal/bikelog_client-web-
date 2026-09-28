"use client";
import ConfirmDeleteModal from "@/components/shared/Modal/ConfirmDeleteModal";
import PageHeader from "@/components/shared/PageHeader/PageHeader";
import PrimaryButton from "@/components/shared/PrimaryButton/PrimaryButton";
import StateCard from "@/components/shared/StateCard/StateCard";
import { TablePagination } from "@/components/shared/table/TablePagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useDelete, useFetchData } from "@/hooks/useApi";
import { FileText, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TBike } from "../Bike/type/bike.types";
import BikeDocumentCard from "./BikeDocumentCard";
import BikeDocumentFormModal from "./BikeDocumentFormModal";
import {
  TBikeDocument,
  TBikeDocumentsApiResponse,
} from "./type/bike-document.types";

// soonest expiry first; documents without an expiry date go last
const byExpiry = (a: TBikeDocument, b: TBikeDocument) => {
  if (!a?.expiryDate && !b?.expiryDate) return 0;
  if (!a?.expiryDate) return 1;
  if (!b?.expiryDate) return -1;
  return new Date(a?.expiryDate).getTime() - new Date(b?.expiryDate).getTime();
};

export default function BikeDocument() {
  const params = useParams();
  const bikeId = params?.bikeId as string;

  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<TBikeDocument | null>(
    null,
  );
  const [deletingDocument, setDeletingDocument] =
    useState<TBikeDocument | null>(null);
  const limit = 20;

  const { data, isLoading, isError, error, refetch } =
    useFetchData<TBikeDocumentsApiResponse>(
      ["bikeDocuments", bikeId, page?.toString()],
      `/bikes/${bikeId}/documents?page=${page}&limit=${limit}`,
    );

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
  );

  const { mutateAsync: deleteMutation, isPending: isDeleting } = useDelete([
    ["bikeDocuments", bikeId],
  ]);

  const documents = [...(data?.data?.result ?? [])].sort(byExpiry);
  const meta = data?.data?.meta ?? 0;
  const totalPages = Math.ceil(meta / limit);

  const handleConfirmDelete = async () => {
    if (!deletingDocument) return;
    try {
      const result = await deleteMutation({
        url: `/bikes/${bikeId}/documents/${deletingDocument?._id}`,
      });
      if (result?.success) {
        toast.success("Document deleted");
      }
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete");
    } finally {
      setDeletingDocument(null);
    }
  };

  const addButton = (label: string) => (
    <PrimaryButton onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" />
      {label}
    </PrimaryButton>
  );

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        title="Documents"
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: bikeData?.data?.nickname ?? "Bike",
            href: `/bikes/${bikeId}`,
          },
          { label: "Documents" },
        ]}
        description={documents?.length > 0 ? "Soonest expiry first" : ""}
        actions={
          <>
            <span className="lg:hidden">{addButton("Add")}</span>
            <span className="hidden lg:inline-flex">
              {addButton("Add document")}
            </span>
          </>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[132px] rounded-[10px]" />
          ))}
        </div>
      ) : isError ? (
        <StateCard
          variant="error"
          title="Couldn’t load documents"
          message={error?.message}
          onRetry={() => refetch()}
        />
      ) : documents?.length === 0 ? (
        <StateCard
          icon={FileText}
          title="No documents yet"
          message="Keep registration, tax token, insurance and licence copies here with their expiry dates."
          action={addButton("Add document")}
        />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {documents?.map((document) => (
            <BikeDocumentCard
              key={document?._id}
              document={document}
              onEdit={setEditingDocument}
              onDelete={setDeletingDocument}
            />
          ))}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={meta}
          itemsPerPage={limit}
          onPageChange={setPage}
          className="panel border-t-0"
        />
      )}

      {createOpen && (
        <BikeDocumentFormModal
          open
          onClose={() => setCreateOpen(false)}
          bikeId={bikeId}
        />
      )}

      {editingDocument && (
        <BikeDocumentFormModal
          open
          onClose={() => setEditingDocument(null)}
          bikeId={bikeId}
          document={editingDocument}
        />
      )}

      <ConfirmDeleteModal
        open={!!deletingDocument}
        onClose={() => setDeletingDocument(null)}
        onConfirm={handleConfirmDelete}
        title="Delete document?"
        description="This document and its attached files will be permanently removed."
        isLoading={isDeleting}
      />
    </div>
  );
}
