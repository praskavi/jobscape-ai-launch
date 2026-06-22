type OpenAiJsonResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

async function callOpenAiJson(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as OpenAiJsonResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI API error: ${response.statusText}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response received from OpenAI.");
  }

  return JSON.parse(content);
}

export async function generateResumeEnhancement(resumeText: string, jobDescription?: string) {
  const prompt = `
    You are an expert resume writer and recruiter.
    Improve the resume content for ATS readability, measurable impact, and role relevance.

    Resume:
    """
    ${resumeText}
    """

    ${jobDescription ? `Target Job Description:\n"""\n${jobDescription}\n"""` : ""}

    Return ONLY a raw JSON object:
    {
      "summary": "<short improved professional summary>",
      "bulletImprovements": [
        {
          "before": "<original or inferred weak bullet>",
          "after": "<strong rewritten bullet with impact>"
        }
      ],
      "keywordsToAdd": ["<keyword>", "<keyword>"],
      "formattingAdvice": ["<short advice>", "<short advice>"]
    }
  `;

  return callOpenAiJson(prompt);
}

export async function generateCoverLetter(
  resumeText: string,
  jobDescription: string,
  companyName?: string,
  roleTitle?: string,
) {
  const prompt = `
    You are an expert career coach.
    Write a concise, professional cover letter using the resume and job description.

    Role: ${roleTitle || "Target role"}
    Company: ${companyName || "Target company"}

    Job Description:
    """
    ${jobDescription}
    """

    Resume:
    """
    ${resumeText}
    """

    Return ONLY a raw JSON object:
    {
      "coverLetter": "<complete cover letter>",
      "subjectLine": "<email subject line>",
      "keySellingPoints": ["<point>", "<point>", "<point>"]
    }
  `;

  return callOpenAiJson(prompt);
}
