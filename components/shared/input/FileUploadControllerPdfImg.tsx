"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

export const SUPPORTED_FILE_TYPES_Pdf_img = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
];

interface IFileUploadControllerProps {
  name: string;
  className?: string;
  label?: string;
}

export default function FileUploadControllerPdfImg({
  name,
  className,
  label,
}: IFileUploadControllerProps) {
  const { control } = useFormContext();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={null}
      render={({ field, fieldState }) => {
        const file: File | null = field.value;

        const isImage = previewUrl?.startsWith("data:image");
        const isPdf = previewUrl?.startsWith("data:application/pdf");

        const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;

          if (!SUPPORTED_FILE_TYPES_Pdf_img.includes(file.type)) {
            alert("Allowed: PNG, JPG, WEBP, SVG, PDF");
            return;
          }

          // Convert to Base64
          const base64 = await convertToBase64(file);

          setPreviewUrl(base64);
          field.onChange(file);
        };

        const handleDelete = () => {
          setPreviewUrl(null);
          field.onChange(null);
        };

        return (
          <div>
            <div
              className={cn(
                "w-[244px] h-[150px] border border-dashed border-border rounded-lg bg-muted flex items-center justify-center relative",
                className,
              )}
            >
              {file ? (
                <>
                  {/* DELETE BUTTON */}
                  <button
                    onClick={handleDelete}
                    type="button"
                    className="absolute w-6 h-6 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-full p-1 -right-2 -top-2 z-10"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>

                  {/* IMAGE PREVIEW */}
                  {isImage && (
                    <Image
                      src={previewUrl!}
                      alt="Preview"
                      width={1980}
                      height={1280}
                      className="w-full h-full rounded-lg "
                    />
                  )}

                  {/* PDF PREVIEW */}
                  {isPdf && (
                    <iframe
                      src={previewUrl!}
                      className="w-full h-full rounded-lg"
                    />
                  )}

                  {/* UNKNOWN TYPE */}
                  {!isImage && !isPdf && (
                    <div className="text-center text-muted-foreground">
                      <p>Unsupported file</p>
                    </div>
                  )}
                </>
              ) : (
                // Upload Placeholder
                <label
                  htmlFor={`${name}-file`}
                  className="cursor-pointer flex flex-col items-center justify-center gap-2 text-center"
                >
                  <Image
                    width={36}
                    height={36}
                    src="/gallery-add.svg"
                    alt="Upload"
                  />
                  <span className="text-xs text-muted-foreground px-2">
                    {label || "Upload Image or PDF (PNG, JPG, WEBP, SVG, PDF)"}
                  </span>

                  <input
                    id={`${name}-file`}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg,.pdf"
                    className="hidden"
                    onChange={handleFile}
                  />
                </label>
              )}
            </div>

            {fieldState.error && (
              <p className="text-rose-500 text-xs mt-1 pl-2">
                {fieldState.error.message}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}
