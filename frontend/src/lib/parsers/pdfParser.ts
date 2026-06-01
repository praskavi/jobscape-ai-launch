import pdfParse from "pdf-parse-fork";

export async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    const pdfData = await pdfParse(buffer);
    return pdfData.text;
  } catch (error) {
    console.error("PDF Parsing Error:", error);
    throw new Error("Failed to extract text from PDF.");
  }
}
