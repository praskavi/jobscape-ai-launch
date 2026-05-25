import * as React from "react";
import { Upload, Plus, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface UploadBoxProps {
  label: string;
  onFile: (file: File) => void;
  error?: string | null;
  isLoading?: boolean;
}

export function UploadBox({
  label,
  onFile,
  error,
  isLoading,
}: UploadBoxProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);

  const handleFiles = (files: FileList | null) => {
    // Prevent handling if loading or no files exist
    if (!files || files.length === 0 || isLoading) return;
    onFile(files[0]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!isLoading) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!isLoading) handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-surface px-6 py-10 text-center transition-colors",
        drag ? "border-primary bg-primary/5" : "border-border",
        isLoading && "opacity-70 cursor-not-allowed" // Visual feedback during upload
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Upload className="h-5 w-5" />
        )}
      </div>
      
      <h4 className="mt-3 text-sm font-semibold text-foreground">
        {isLoading ? "Uploading to secure storage..." : label}
      </h4>
      
      <p className="mt-1 text-xs text-muted-foreground">Allowed formats: PDF, DOC, DOCX</p>
      
      <button
        type="button"
        disabled={isLoading}
        onClick={() => inputRef.current?.click()}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-4 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" /> Choose file
          </>
        )}
      </button>
      
      <input
        ref={inputRef}
        type="file"
        disabled={isLoading}
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      
      {error && !isLoading && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  );
}