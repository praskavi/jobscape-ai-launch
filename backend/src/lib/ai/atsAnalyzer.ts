import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeResumeMatch(resumeText: string, jobDescription: string) {
  const prompt = `
    You are an expert ATS (Applicant Tracking System) and senior technical recruiter.
    Analyze the provided Resume against the Job Description.
    
    Job Description:
    """
    ${jobDescription}
    """
    
    Resume Text:
    """
    ${resumeText}
    """
    
    Return ONLY a raw JSON object with the following exact structure (no markdown, no code blocks):
    {
      "matchScore": <number between 0 and 100>,
      "strengths": ["<string>", "<string>"],
      "missingKeywords": ["<string>", "<string>"],
      "feedback": "<A short, actionable paragraph of feedback>"
    }
  `;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  // Strip markdown formatting if the LLM includes it
  const cleanJsonString = responseText.replace(/```json\n?|\n?```/g, "").trim();
  
  return JSON.parse(cleanJsonString);
}