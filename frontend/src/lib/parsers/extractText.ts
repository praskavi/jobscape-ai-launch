import { parsePDF } from "./pdfParser";
import { parseDOCX } from "./docxParser";

export async function extractTextFromFile(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  if (mimetype === "application/pdf") {
    return parsePDF(buffer);
  }

  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype === "application/msword" ||
    filename.endsWith(".docx")
  ) {
    return parseDOCX(buffer);
  }

  throw new Error(`Unsupported file format: ${mimetype}. Please upload PDF or DOCX.`);
}
