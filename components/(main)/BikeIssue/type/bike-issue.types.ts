import { TCloudinaryImage } from "@/components/shared/type/image.types";

export type TBikeIssueStatus = "open" | "resolved";

export interface TBikeIssue {
  _id: string;
  bike: string;
  title: string;
  description?: string;
  dateReported: string;
  status: TBikeIssueStatus;
  images?: (TCloudinaryImage & { _id: string })[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TCreateBikeIssuePayload {
  title: string;
  description?: string;
  dateReported?: string;
}

export interface TUpdateBikeIssuePayload {
  title?: string;
  description?: string;
  dateReported?: string;
}

export interface TUpdateBikeIssueStatusPayload {
  status: TBikeIssueStatus;
}

export interface TBikeIssuesApiResponse {
  result: TBikeIssue[];
  meta: number;
}
