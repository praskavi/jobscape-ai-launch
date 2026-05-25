import * as React from "react";

export function ConfirmDeleteModal({
  open,
  type,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  type: "resume" | "cover_letter" | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open || !type) return null;
  const label = type === "resume" ? "resume" : "cover letter";
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-foreground">Delete {label}?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          This will remove the current file from your account. You can upload a new one afterwards.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete file
          </button>
        </div>
      </div>
    </div>
  );
}
