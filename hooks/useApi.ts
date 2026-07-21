import { TgenericResponse } from "@/lib/apiResponse";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/api";
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { AxiosRequestConfig } from "axios";

type TFetchOptions<TData> = Omit<
  UseQueryOptions<TgenericResponse<TData>, Error>,
  "queryKey" | "queryFn"
>;

export const useFetchData = <TData>(
  key: string[],
  endpoint: string,
  options?: TFetchOptions<TData>,
) => {
  return useQuery({
    queryKey: key,
    queryFn: () => apiGet(endpoint),
    ...options,
  });
};

export const usePost = (invalidateQueriesKeys?: Array<string[]>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      url: string;
      payload: Record<string, unknown> | FormData;
      config?: AxiosRequestConfig;
    }) => apiPost(params.url, params.payload, params.config),
    onSuccess: () => {
      invalidateQueriesKeys?.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      );
    },
  });
};

export const usePatch = (invalidateQueriesKeys?: Array<string[]>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      url: string;
      payload: Record<string, unknown> | FormData;
      config?: AxiosRequestConfig;
    }) => apiPatch(params.url, params.payload),
    onSuccess: () => {
      invalidateQueriesKeys?.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      );
    },
  });
};

export const useDelete = (invalidateQueriesKeys?: Array<string[]>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { url: string }) => apiDelete(params.url),
    onSuccess: () => {
      invalidateQueriesKeys?.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      );
    },
  });
};
