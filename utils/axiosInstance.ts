import axios from "axios";
import { clearToken, getToken, isTokenExpired } from "@/lib/tokenManager";
import { getBaseUrl } from "./config/envConfig";

const instance = axios.create({
  baseURL: getBaseUrl(),
});

instance.defaults.timeout = 60000;

const isPublicAuthRoute = (url?: string) =>
  !!url && (url.includes("/auth/login") || url.includes("/auth/register"));

instance.interceptors.request.use(
  function (config) {
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    } else {
      config.headers["Content-Type"] = "multipart/form-data";
    }

    if (!isPublicAuthRoute(config.url)) {
      const token = getToken();
      if (!token || isTokenExpired(token)) {
        clearToken();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(new Error("No valid session"));
      }
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  function (error) {
    return Promise.reject(error);
  },
);

instance.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    if (error?.response?.status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    const errorObj = {
      statusCode: error?.response?.data?.statusCode || 500,
      message: error?.response?.data?.message || "Something went wrong",
      errors: error?.response?.data?.errors,
    };

    return Promise.reject(errorObj);
  },
);

export { instance as axiosInstance };
