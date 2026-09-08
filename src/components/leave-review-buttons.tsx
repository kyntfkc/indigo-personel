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
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => review("onaylandi")}
        className="tap min-w-20 rounded-full bg-emerald-600 px-4 text-xs font-medium text-white transition hover:opacity-90 active:scale-[0.99] sm:min-w-0 sm:px-3 sm:py-1.5"
      >
        Onayla
      </button>
      <button
        type="button"
        onClick={() => review("reddedildi")}
        className="tap min-w-20 rounded-full bg-red-600 px-4 text-xs font-medium text-white transition hover:opacity-90 active:scale-[0.99] sm:min-w-0 sm:px-3 sm:py-1.5"
      >
        Reddet
      </button>
    </div>
  );
}
