import mammoth from "mammoth";

export async function parseDOCX(buffer: Buffer): Promise<string> {
  try {
    const docxData = await mammoth.extractRawText({ buffer });
    return docxData.value;
  } catch (error) {
    console.error("DOCX Parsing Error:", error);
    throw new Error("Failed to extract text from DOCX.");
  }
}