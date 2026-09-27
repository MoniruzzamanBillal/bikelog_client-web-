"use client";

import ControlledInput from "@/components/shared/input/ControlledInput";
import { Button } from "@/components/ui/button";
import { usePost } from "@/hooks/useApi";
import { setToken } from "@/lib/tokenManager";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { loginSchema, TLoginForm } from "./auth.schema";

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const methods = useForm<TLoginForm>({ resolver: zodResolver(loginSchema) });
  const { mutateAsync: loginMutation, isPending } = usePost();
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit: SubmitHandler<TLoginForm> = async (data) => {
    setServerError(null);
    try {
      const result = await loginMutation({
        url: "/auth/login",
        payload: data,
      });
      if (result?.token) {
        toast.success("Logged in successfully");
        setToken(result.token);
        setTimeout(() => router.replace("/dashboard"), 100);
      }
    } catch (error) {
      const message = (error as { message?: string })?.message;
      setServerError(message ?? "Something went wrong!!");
    }
  };

  return (
    <FormProvider {...methods}>
      {serverError && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-lg bg-destructive/8 px-3 py-2.5 text-[13px] shadow-[0_0_0_1px_color-mix(in_srgb,var(--destructive)_45%,transparent)]"
        >
          <AlertTriangle className="size-[15px] shrink-0 text-destructive" />
          {serverError}
        </div>
      )}

      <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
        <ControlledInput
          name="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          isRequired
          className="h-11"
        />
        <ControlledInput
          name="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          isRequired
          className="h-11"
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-muted-foreground"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          }
        />

        <Button
          type="submit"
          disabled={isPending}
          className="mt-1 h-11 w-full"
        >
          {isPending ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="m-0 text-[13px] text-muted-foreground">
        New to Bike Log?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </FormProvider>
  );
}
