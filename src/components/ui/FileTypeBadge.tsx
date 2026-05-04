import * as React from "react";
import { cn } from "../../lib/utils";

export function FileTypeBadge({ type }: { type: "PDF" | "DOC" | "DOCX" }) {
  const tone =
    type === "PDF"
      ? "bg-red-50 text-red-700 border-red-100"
      : "bg-blue-50 text-blue-700 border-blue-100";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide",
        tone,
      )}
    >
      {type}
    </span>
  );
}
