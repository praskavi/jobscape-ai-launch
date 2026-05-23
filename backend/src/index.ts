import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { extractTextFromFile } from "./lib/parsers/extractText";
import { analyzeResumeMatch } from "./lib/ai/atsAnalyzer";

// Load environment variables (.env file)
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configure Multer to store uploaded files in memory
// We don't need to save them to the disk, just pass the buffer to the parsers
const upload = multer({ storage: multer.memoryStorage() });

// The ATS Analysis Route
// upload.single('resume') tells Multer to look for a file attached to the 'resume' field
app.post("/api/analyze-ats", upload.single("resume"), async (req: Request, res: Response): Promise<void> => {
  try {
    const resumeFile = req.file;
    const jobDescription = req.body.jobDescription;

    if (!resumeFile || !jobDescription) {
      res.status(400).json({ error: "Missing resume or job description" });
      return;
    }

    // 1. Pass the buffer directly to our parser utility
    const extractedText = await extractTextFromFile(
      resumeFile.buffer, 
      resumeFile.mimetype, 
      resumeFile.originalname
    );

    if (!extractedText.trim()) {
      res.status(400).json({ error: "Could not extract text from the document." });
      return;
    }

    // 2. Send the raw text and JD to Gemini
    const analysisResult = await analyzeResumeMatch(extractedText, jobDescription);

    // 3. Return the payload to the frontend
    res.json({
      success: true,
      analysis: analysisResult,
    });

  } catch (error: any) {
    console.error("Express API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during analysis." });
  }
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});