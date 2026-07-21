"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RegisterForm from "@/components/feature/auth/RegisterForm";
import { getToken } from "@/lib/tokenManager";

export default function RegisterPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only "already logged in" check must run post-hydration to avoid a server/client cookie-read mismatch
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-semibold">Register</h1>
        <RegisterForm />
      </div>
    </div>
  );
}
