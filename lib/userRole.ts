import { JwtPayload } from "jsonwebtoken";
import { getDecodedToken } from "./tokenManager";

export type TUserRole = "admin" | "user";

type TTokenPayload = JwtPayload & {
  userId?: string;
  userEmail?: string;
  userRole?: TUserRole;
};

// ! UI-only gate — the backend's adminCheck middleware is the real authorization
export const isAdminUser = (): boolean =>
  getDecodedToken<TTokenPayload>()?.userRole === "admin";

export const getUserEmail = (): string | undefined =>
  getDecodedToken<TTokenPayload>()?.userEmail;
