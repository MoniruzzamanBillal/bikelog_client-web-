"use client";
import PrimaryButton from "@/components/shared/PrimaryButton/PrimaryButton";
import { useDelete, useFetchData } from "@/hooks/useApi";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import BikeDocumentCard from "./BikeDocumentCard";
import BikeDocumentFormModal from "./BikeDocumentFormModal";
import {
  TBikeDocument,
  TBikeDocumentsApiResponse,
} from "./type/bike-document.types";

export default function BikeDocument() {
  const params = useParams();
  const bikeId = params.bikeId as string;

  // no filter exists on this page to ever reset it, so this is a plain constant, not state
  const page = 1;
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<TBikeDocument | null>(
    null,
  );
  const limit = 20;

  const { data, isLoading } = useFetchData<TBikeDocumentsApiResponse>(
    ["bikeDocuments", bikeId, page.toString()],
    `/bikes/${bikeId}/documents?page=${page}&limit=${limit}`,
  );

  const { mutateAsync: deleteMutation } = useDelete([
    ["bikeDocuments", bikeId],
  ]);

  const documents = data?.data?.result ?? [];

  const handleEdit = (document: TBikeDocument) => setEditingDocument(document);

  const handleDelete = async (document: TBikeDocument) => {
    if (!confirm("Delete this document?")) return;
    try {
      const result = await deleteMutation({
        url: `/bikes/${bikeId}/documents/${document._id}`,
      });
      if (result?.success) {
        toast.success("Document deleted");
      }
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete");
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Documents</h1>
        <PrimaryButton onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 size-4" />
          Add
        </PrimaryButton>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents yet.</p>
      ) : (
        <div className="space-y-3">
          {documents.map((document) => (
            <BikeDocumentCard
              key={document._id}
              document={document}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <BikeDocumentFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        bikeId={bikeId}
      />

      {editingDocument && (
        <BikeDocumentFormModal
          open
          onClose={() => setEditingDocument(null)}
          bikeId={bikeId}
          document={editingDocument}
        />
      )}
    </div>
  );
}
