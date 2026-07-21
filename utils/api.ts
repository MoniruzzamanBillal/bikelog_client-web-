import { AxiosRequestConfig } from "axios";
import { axiosInstance } from "./axiosInstance";

export const apiGet = async (endpoint: string) =>
  (await axiosInstance.get(endpoint)).data;

export const apiPost = async (
  endpoint: string,
  payload: object,
  config?: AxiosRequestConfig,
) => (await axiosInstance.post(endpoint, payload, config)).data;

export const apiPatch = async (endpoint: string, payload: object) =>
  (await axiosInstance.patch(endpoint, payload)).data;

export const apiDelete = async (endpoint: string) =>
  (await axiosInstance.delete(endpoint)).data;
