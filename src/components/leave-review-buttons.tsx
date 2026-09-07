"use client";

import { useRouter } from "next/navigation";
import { reviewLeaveRequest } from "@/lib/actions/leave";
import { toast } from "sonner";

export function LeaveReviewButtons({ id }: { id: string }) {
  const router = useRouter();

  async function review(status: "onaylandi" | "reddedildi") {
    const result = await reviewLeaveRequest(id, status);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(status === "onaylandi" ? "Onaylandı" : "Reddedildi");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => review("onaylandi")}
        className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:opacity-90"
      >
        Onayla
      </button>
      <button
        type="button"
        onClick={() => review("reddedildi")}
        className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white hover:opacity-90"
      >
        Reddet
      </button>
    </div>
  );
}
