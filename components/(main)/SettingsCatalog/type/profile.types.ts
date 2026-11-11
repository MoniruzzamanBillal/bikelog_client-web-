import { TCloudinaryImage } from "@/components/shared/type/image.types";

// `GET /auth/me` — the signed-in rider's identity. The JWT claims carry only email/role
// (lib/userRole.ts); name and photo have never been in the token, so this endpoint is the
// only source of them (spec 36 D2). `profilePicture` is the same `{ url, publicId }` shape
// the accessory `productImage` uses, reused here.
export type TMe = {
  id: string;
  name: string;
  email: string;
  profilePicture: TCloudinaryImage | null;
  userRole: "admin" | "user";
};
