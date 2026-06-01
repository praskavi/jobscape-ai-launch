export async function analyzeResumeMatch(resumeText: string, jobDescription: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable. Please set it in your .env file.");
  }

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

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" }, // Forces OpenAI to return valid JSON
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error("Empty response received from OpenAI");
    }

    return JSON.parse(responseText.trim());
  } catch (error: any) {
    console.error("OpenAI API Analysis Error:", error);
    throw new Error(error.message || "An error occurred during resume analysis.");
  }
}
