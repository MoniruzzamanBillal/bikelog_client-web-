export interface TErrorLogSource {
  path: string | number;
  message: string;
}

export interface TErrorLog {
  _id: string;
  status: number;
  message: string;
  errorName?: string | null;
  errorSources?: TErrorLogSource[] | null;
  stack?: string | null;
  method: string;
  path: string;
  userId?: string | null;
  userEmail?: string | null;
  createdAt: string;
}

export type TErrorLogMethodFilter =
  | "all"
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE";
