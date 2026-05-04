export const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const ALLOWED_EXT = [".pdf", ".doc", ".docx"];

export function validateFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  const okExt = ALLOWED_EXT.some((e) => lower.endsWith(e));
  const okMime = ALLOWED_MIME.includes(file.type) || file.type === "";
  
  if (!okExt || !okMime) return "Only PDF, DOC, or DOCX files are allowed.";
  return null;
}
