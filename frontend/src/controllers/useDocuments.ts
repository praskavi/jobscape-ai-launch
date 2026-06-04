"use client";
import { useState } from "react";
import { validateFile } from "../models/documentModel";

export interface UserDocument {
  id: string;
  file_type: "resume" | "cover_letter";  // was: document_type (renamed to match user_files.file_type)
  file_name: string;
  file_path: string;                      // storage path — required for signed URL generation and delete
  file_url: string;                       // generated signed URL (not stored in DB)
  mime_type: string;
  file_size_bytes?: number | null;
  created_at: string;                     // was: uploaded_at (matches user_files.created_at)
}

export function useDocuments(initialDocs: UserDocument[] = []) {
  const [documents, setDocuments] = useState<UserDocument[]>(initialDocs);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    // Here you would upload to Supabase and update state
    setError(null);
  };

  const handleDelete = (docId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
  };

  return { documents, error, handleUpload, handleDelete };
}
