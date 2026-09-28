"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import ControlledInput from "@/components/shared/input/ControlledInput";
import { Button } from "@/components/ui/button";
import { usePost } from "@/hooks/useApi";
import { registerSchema, TRegisterForm } from "./auth.schema";

export default function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const methods = useForm<TRegisterForm>({
    resolver: zodResolver(registerSchema),
  });
  const { mutateAsync: registerMutation, isPending } = usePost();

  const onSubmit: SubmitHandler<TRegisterForm> = async (data) => {
    try {
      await registerMutation({ url: "/auth/register", payload: data });
      toast.success("Registered successfully");
      setTimeout(() => router?.replace("/login"), 100);
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Something went wrong!!", { duration: 2000 });
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods?.handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
        <ControlledInput
          name="name"
          label="Name"
          placeholder="Your name"
          isRequired
          className="h-11"
        />
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
          {isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="m-0 text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </FormProvider>
  );
}
