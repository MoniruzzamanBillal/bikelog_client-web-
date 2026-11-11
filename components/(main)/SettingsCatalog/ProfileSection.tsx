"use client";

import UserAvatar from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDelete,
  useFetchData,
  usePatch,
  usePut,
} from "@/hooks/useApi";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2, Lock, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import ControlledInput from "@/components/shared/input/ControlledInput";
import { TMe } from "./type/profile.types";

const ME_KEY = ["auth", "me"];

const nameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Max 60 characters"),
});
type TNameForm = z.infer<typeof nameSchema>;

export default function ProfileSection() {
  const { data, isLoading } = useFetchData<TMe>(ME_KEY, "/auth/me");
  const me = data?.data;

  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // all four mutations refresh the collapsed row + avatar via the shared ["auth","me"] key
  const { mutateAsync: saveName, isPending: isSavingName } = usePatch([ME_KEY]);
  const { mutateAsync: uploadPhoto, isPending: isUploading } = usePut([ME_KEY]);
  const { mutateAsync: removePhoto, isPending: isRemoving } = useDelete([
    ME_KEY,
  ]);

  const methods = useForm<TNameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: "" },
  });

  // seed the name field once identity loads (and whenever it changes under us)
  useEffect(() => {
    if (me?.name != null) methods.reset({ name: me?.name });
  }, [me?.name, methods]);

  const onSaveName = methods.handleSubmit(async ({ name }) => {
    if (name === me?.name) return;
    try {
      // ! only `name` is ever sent — the server (spec 55) refuses a submitted `email`
      // ! with a 400; the email is the account's sign-in ID and is not editable (H-A).
      await saveName({ url: "/auth/update-profile", payload: { name } });
      toast.success("Name updated");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to update name");
    }
  });

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    // reset so picking the same file again still fires onChange
    e.target.value = "";
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("image", file);
      await uploadPhoto({ url: "/auth/profile-picture", payload: formData });
      toast.success("Photo updated");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to upload photo");
    }
  };

  const onRemovePhoto = async () => {
    try {
      await removePhoto({ url: "/auth/profile-picture" });
      toast.success("Photo removed");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to remove photo");
    }
  };

  const isBusyPhoto = isUploading || isRemoving;

  return (
    <section className="panel flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div>
          <div className="font-medium">Profile</div>
          <div className="text-xs text-muted-foreground">
            Your name, photo and sign-in email
          </div>
        </div>
        {!isLoading && me && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Edit"}
          </Button>
        )}
      </div>

      <div className="px-4 pb-4">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="size-14 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
        ) : !me ? (
          <p className="py-2 text-sm text-muted-foreground">
            Couldn&apos;t load your profile.
          </p>
        ) : !open ? (
          // ── collapsed ──
          <div className="flex items-center gap-3">
            <UserAvatar
              name={me?.name}
              image={me?.profilePicture}
              size={56}
            />
            <div className="min-w-0">
              <div className="truncate font-medium">{me?.name}</div>
              <div className="truncate text-sm text-muted-foreground">
                {me?.email}
              </div>
            </div>
          </div>
        ) : (
          // ── expanded editor ──
          <div className="flex flex-col gap-4">
            {/* avatar + photo controls */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <UserAvatar
                  name={me?.name}
                  image={me?.profilePicture}
                  size={88}
                />
                {isBusyPhoto && (
                  <div className="absolute inset-0 grid place-items-center rounded-full bg-background/60">
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-start gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusyPhoto}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-60"
                >
                  <Camera className="size-4" />
                  {me?.profilePicture ? "Change photo" : "Add photo"}
                </button>
                {me?.profilePicture && (
                  <button
                    type="button"
                    onClick={onRemovePhoto}
                    disabled={isBusyPhoto}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive disabled:opacity-60"
                  >
                    <Trash2 className="size-4" />
                    Remove photo
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickFile}
                />
              </div>
            </div>

            {/* name */}
            <FormProvider {...methods}>
              <form
                onSubmit={onSaveName}
                className="flex flex-col gap-2"
              >
                <ControlledInput name="name" label="Name" isRequired />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingName}
                  className="self-start"
                >
                  {isSavingName ? "Saving…" : "Save name"}
                </Button>
              </form>
            </FormProvider>

            {/* email — shown but locked (spec 36 H-A/H-B): dimmed + padlock so it reads
                as locked, not broken; never part of any submit payload */}
            <div className="flex flex-col gap-1">
              <label className="block text-xs text-foreground/70">Email</label>
              <div className="relative opacity-[0.72]">
                <Input
                  type="email"
                  value={me?.email ?? ""}
                  disabled
                  readOnly
                  className="pr-10"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                  <Lock className="size-4" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Your email is your sign-in ID and can&apos;t be changed.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
