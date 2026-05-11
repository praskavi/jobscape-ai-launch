import * as React from "react";
import { DocumentCard } from "./DocumentCard";
import { UploadBox } from "./UploadBox";
import { validateFile } from "../../models/documentModel";
import type { UserDocument } from "../../controllers/useDocuments";

export function DocumentSection({
  title,
  type,
  doc,
  onUpload,
  onRequestDelete,
}: {
  title: string;
  type: "resume" | "cover_letter";
  doc: UserDocument | null;
  onUpload: (file: File) => void;
  onRequestDelete: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);

  const handleFile = (file: File) => {
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onUpload(file);
  };

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {doc ? (
        <DocumentCard doc={doc} onDelete={onRequestDelete} />
      ) : (
        <UploadBox
          label={`Upload your ${type === "resume" ? "resume" : "cover letter"}`}
          onFile={handleFile}
          error={error}
        />
      )}
    </section>
  );
}
