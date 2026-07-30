export type TDocumentFile = {
  _id: string;
  url: string;
  publicId: string;
  resourceType: "image" | "raw";
  originalName: string;
  mimeType: string;
};

export interface TBikeDocument {
  _id: string;
  bike: string;
  title: string;
  description?: string;
  expiryDate?: string;
  files?: TDocumentFile[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TCreateBikeDocumentPayload {
  title: string;
  description?: string;
  expiryDate?: string;
}

export interface TUpdateBikeDocumentPayload {
  title?: string;
  description?: string;
  expiryDate?: string;
}

export interface TBikeDocumentsApiResponse {
  result: TBikeDocument[];
  meta: number;
}
