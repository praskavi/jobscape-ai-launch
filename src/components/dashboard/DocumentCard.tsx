import * as React from "react";
import { FileText, ExternalLink, Trash2 } from "lucide-react";
import { FileTypeBadge } from "../ui/FileTypeBadge";
import type { UserDocument } from "../../controllers/useDocuments";

export function DocumentCard({
  doc,
  onDelete,
}: {
  doc: UserDocument;
  onDelete: () => void;
}) {
  const getFileTypeLabel = (mime: string, name: string): "PDF" | "DOC" | "DOCX" => {
    if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) return "PDF";
    if (name.toLowerCase().endsWith(".docx")) return "DOCX";
    return "DOC";
  };
  
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const type = getFileTypeLabel(doc.mime_type, doc.file_name);
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{doc.file_name}</p>
            <FileTypeBadge type={type} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Uploaded {formatDate(doc.uploaded_at)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={doc.file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View file <ExternalLink className="h-3 w-3" />
            </a>
            <button
              type="button"
              disabled
              title="Delete the current file before uploading a new one."
              className="cursor-not-allowed text-xs font-medium text-muted-foreground/70"
            >
              Replace
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${doc.file_name}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
