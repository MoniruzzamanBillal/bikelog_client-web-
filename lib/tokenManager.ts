import { deleteCookie, getCookie, setCookie } from "cookies-next";
import jwt, { JwtPayload } from "jsonwebtoken";

const ACCESS_TOKEN_KEY = "accessToken";

export const setToken = (token: string) =>
  setCookie(ACCESS_TOKEN_KEY, token, { path: "/" });

export const getToken = (): string | undefined =>
  getCookie(ACCESS_TOKEN_KEY) as string | undefined;

export const clearToken = () => deleteCookie(ACCESS_TOKEN_KEY, { path: "/" });

export const isTokenExpired = (token: string): boolean => {
  const decoded = jwt.decode(token) as JwtPayload;
  if (!decoded?.exp) return true;
  return decoded.exp < Math.floor(Date.now() / 1000) + 60; // 60s buffer
};

export const getDecodedToken = <
  T extends JwtPayload = JwtPayload,
>(): T | null => {
  const token = getToken();
  if (!token) return null;
  try {
    const decoded = jwt.decode(token);
    return decoded && typeof decoded !== "string" ? (decoded as T) : null;
  } catch {
    return null;
  }
};
