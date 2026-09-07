"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadEmployeePhoto } from "@/lib/actions/employees";
import { toast } from "sonner";
import Image from "next/image";

export function PhotoUpload({
  employeeId,
  photoUrl,
  name,
}: {
  employeeId: string;
  photoUrl: string | null;
  name: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.set("photo", file);
    const result = await uploadEmployeePhoto(employeeId, formData);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Fotoğraf güncellendi");
    router.refresh();
  }

  return (
    <div className="panel flex flex-col items-center gap-3">
      <h2 className="w-full font-semibold">Profil fotoğrafı</h2>
      <div className="relative size-28 overflow-hidden rounded-full border-2 border-[var(--brand)] bg-[var(--brand-soft)]">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="112px"
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center text-2xl font-semibold text-[var(--brand)]">
            {initials}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
      <button
        type="button"
        disabled={loading}
        className="btn-outline"
        onClick={() => inputRef.current?.click()}
      >
        {loading ? "Yükleniyor..." : "Fotoğraf yükle"}
      </button>
      <p className="text-center text-xs text-[var(--ink-muted)]">
        JPG/PNG, en fazla 4 MB
      </p>
    </div>
  );
}
