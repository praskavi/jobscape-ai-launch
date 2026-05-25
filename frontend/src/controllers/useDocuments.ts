"use client";
import { useState } from "react";
import { validateFile } from "../models/documentModel";

export interface UserDocument {
  id: string;
  document_type: "resume" | "cover_letter";
  file_name: string;
  file_url: string;
  mime_type: string;
  uploaded_at: string;
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
