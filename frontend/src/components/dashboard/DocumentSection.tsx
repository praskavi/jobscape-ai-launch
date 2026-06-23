import * as React from "react";
import { DocumentCard } from "./DocumentCard";
import { UploadBox } from "./UploadBox";
import { validateFile } from "../../models/documentModel";
import type { UserDocument } from "../../controllers/useDocuments";

interface DocumentSectionProps {
  title: string;
  type: "resume" | "cover_letter";
  doc: UserDocument | null;
  isUploading?: boolean;
  uploadError?: string | null;
  onUpload: (file: File) => void;
  onRequestDelete: () => void;
}

export function DocumentSection({
  title,
  type,
  doc,
  isUploading,
  uploadError,
  onUpload,
  onRequestDelete,
}: DocumentSectionProps) {
  const [error, setError] = React.useState<string | null>(null);

  const handleFile = (file: File) => {
    // 1. Validate the file format and size
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }
    
    // 2. Clear previous errors and trigger the upload to Supabase
    setError(null);
    onUpload(file);
  };

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      
      {doc ? (
        // Render the uploaded document card with the delete action
        <DocumentCard doc={doc} onDelete={onRequestDelete} />
      ) : (
        // Render the dropzone if no document exists yet
        <UploadBox
          label={`Upload your ${type === "resume" ? "resume" : "cover letter"}`}
          onFile={handleFile}
          error={error || uploadError}
          isLoading={isUploading} 
        />
      )}
    </section>
  );
}
