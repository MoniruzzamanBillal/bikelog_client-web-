"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/feature/auth/AuthLayout";
import RegisterForm from "@/components/feature/auth/RegisterForm";
import { getToken, hasUsableRefreshToken } from "@/lib/tokenManager";

export default function RegisterPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // ! Spec 32 §F: a usable refresh token is a session too, so someone returning after a
    // ! week goes to the dashboard rather than being shown a login form they don't need.
    // ! Deliberately NOT a refresh call — these pages must not hit the network before the
    // ! user has done anything.
    if (getToken() || hasUsableRefreshToken()) {
      router?.replace("/dashboard");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only "already logged in" check must run post-hydration to avoid a server/client cookie-read mismatch
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <AuthLayout
      heading="Create your account"
      lede="Start logging your first bike in a minute."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
