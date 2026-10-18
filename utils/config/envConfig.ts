const DEFAULT_API_ORIGIN = "https://bikelog-server.vercel.app";

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_ORIGIN
).replace(/\/+$/, "");

export const getBaseUrl = (): string => `${API_ORIGIN}/api`;

// export const getBaseUrl = (): string => `http://localhost:5000/api`;
