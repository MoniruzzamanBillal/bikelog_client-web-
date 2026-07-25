//! deployed base url
// export const baseURL = "https://bikelog-server.vercel.app";

// ! main base url
export const baseURL = "http://localhost:5000";

export const getBaseUrl = (): string => {
  return `${baseURL}/api`;
  // return process.env.NEXT_PUBLIC_API_BASE_URL || `${baseURL}/api`;
};
