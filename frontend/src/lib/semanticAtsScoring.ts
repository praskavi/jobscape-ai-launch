const HUGGING_FACE_EMBEDDING_URL =
  "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction";

const LOW_SIGNAL_WORDS = new Set([
  "about",
  "ability",
  "able",
  "across",
  "also",
  "and",
  "any",
  "are",
  "being",
  "can",
  "could",
  "day",
  "did",
  "does",
  "done",
  "duties",
  "ensure",
  "environment",
  "experience",
  "for",
  "from",
  "full",
  "have",
  "how",
  "include",
  "including",
  "job",
  "junior",
  "knowledge",
  "looking",
  "management",
  "member",
  "more",
  "must",
  "new",
  "not",
  "only",
  "our",
  "part",
  "permanent",
  "preferred",
  "provide",
  "required",
  "responsibilities",
  "role",
  "senior",
  "should",
  "skills",
  "some",
  "strong",
  "such",
  "team",
  "that",
  "the",
  "their",
  "they",
  "this",
  "time",
  "using",
  "was",
  "were",
  "what",
  "when",
  "which",
  "who",
  "will",
  "with",
  "within",
  "work",
  "working",
  "would",
  "years",
  "you",
  "your",
]);

type Phrase = {
  text: string;
  weight: number;
};

export type SemanticAtsScore = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
};

export type SemanticResumeProfile = {
  phrases: Phrase[];
  vectors: number[][];
};

function cleanText(text: string) {
  return (text || "").toLowerCase().replace(/[^a-z0-9\s/+.-]/g, " ");
}

function toWords(text: string) {
  return cleanText(text)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function isSignalWord(word: string) {
  return word.length > 2 && !LOW_SIGNAL_WORDS.has(word) && Number.isNaN(Number(word));
}

function phraseKey(words: string[]) {
  return words.join(" ");
}

function extractPhrases(text: string, limit: number): Phrase[] {
  const candidates = text
    .split(/[\n\r•;:|.]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const phraseWeights = new Map<string, number>();

  for (const candidate of candidates) {
    const signalWords = toWords(candidate).filter(isSignalWord);

    if (signalWords.length < 2) {
      continue;
    }

    const phraseLength = Math.min(6, signalWords.length);
    const primaryPhrase = phraseKey(signalWords.slice(0, phraseLength));
    phraseWeights.set(primaryPhrase, (phraseWeights.get(primaryPhrase) || 0) + 2);

    for (let i = 0; i <= signalWords.length - 2; i += 1) {
      const bigram = phraseKey(signalWords.slice(i, i + 2));
      phraseWeights.set(bigram, (phraseWeights.get(bigram) || 0) + 1);
    }

    for (let i = 0; i <= signalWords.length - 3; i += 1) {
      const trigram = phraseKey(signalWords.slice(i, i + 3));
      phraseWeights.set(trigram, (phraseWeights.get(trigram) || 0) + 1.5);
    }
  }

  return Array.from(phraseWeights.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, weight]) => ({ text, weight }));
}

function fallbackKeywordScore(resumeText: string, jdText: string): SemanticAtsScore {
  const jdKeywords = Array.from(new Set(toWords(jdText).filter(isSignalWord))).slice(0, 20);
  const resumeWords = new Set(toWords(resumeText).filter(isSignalWord));
  const matchedKeywords = jdKeywords.filter((keyword) => resumeWords.has(keyword));
  const missingKeywords = jdKeywords.filter((keyword) => !resumeWords.has(keyword));
  const targetCount = Math.min(jdKeywords.length, 15);
  const score = targetCount > 0 ? Math.min(100, Math.round((matchedKeywords.length / targetCount) * 100)) : 0;

  return { score, matchedKeywords, missingKeywords };
}

function normalizeEmbeddingResponse(value: unknown): number[][] {
  if (!Array.isArray(value)) {
    return [];
  }

  if (value.every((item) => typeof item === "number")) {
    return [value as number[]];
  }

  return value
    .map((item) => {
      if (!Array.isArray(item)) {
        return null;
      }

      if (item.every((entry) => typeof entry === "number")) {
        return item as number[];
      }

      if (Array.isArray(item[0]) && item[0].every((entry: unknown) => typeof entry === "number")) {
        return item[0] as number[];
      }

      return null;
    })
    .filter((item): item is number[] => Array.isArray(item));
}

async function embedTexts(texts: string[]) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!apiKey || texts.length === 0) {
    return [];
  }

  const response = await fetch(HUGGING_FACE_EMBEDDING_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: texts }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate semantic ATS embeddings.");
  }

  return normalizeEmbeddingResponse(await response.json());
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let aMagnitude = 0;
  let bMagnitude = 0;

  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    dot += a[i] * b[i];
    aMagnitude += a[i] * a[i];
    bMagnitude += b[i] * b[i];
  }

  if (aMagnitude === 0 || bMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude));
}

export async function createSemanticResumeProfile(resumeText: string): Promise<SemanticResumeProfile> {
  const phrases = extractPhrases(resumeText, 45);
  const vectors = await embedTexts(phrases.map((phrase) => phrase.text));

  return { phrases, vectors };
}

export async function calculateSemanticAtsScoreFromProfile(
  profile: SemanticResumeProfile,
  jdText: string
): Promise<SemanticAtsScore> {
  const jdPhrases = extractPhrases(jdText, 20);

  if (jdPhrases.length === 0 || profile.vectors.length === 0) {
    return fallbackKeywordScore(profile.phrases.map((phrase) => phrase.text).join(" "), jdText);
  }

  const jdVectors = await embedTexts(jdPhrases.map((phrase) => phrase.text));

  if (jdVectors.length !== jdPhrases.length) {
    return fallbackKeywordScore(profile.phrases.map((phrase) => phrase.text).join(" "), jdText);
  }

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];
  let coveredWeight = 0;
  let totalWeight = 0;

  jdPhrases.forEach((phrase, index) => {
    const bestSimilarity = Math.max(
      ...profile.vectors.map((resumeVector) => cosineSimilarity(jdVectors[index], resumeVector))
    );

    totalWeight += phrase.weight;

    if (bestSimilarity >= 0.74) {
      coveredWeight += phrase.weight;
      matchedKeywords.push(phrase.text);
    } else if (bestSimilarity >= 0.66) {
      coveredWeight += phrase.weight * 0.5;
      matchedKeywords.push(phrase.text);
    } else {
      missingKeywords.push(phrase.text);
    }
  });

  const score = totalWeight > 0 ? Math.min(100, Math.round((coveredWeight / totalWeight) * 100)) : 0;

  return {
    score,
    matchedKeywords: matchedKeywords.slice(0, 12),
    missingKeywords: missingKeywords.slice(0, 12),
  };
}

export async function calculateSemanticAtsScore(resumeText: string, jdText: string) {
  try {
    const profile = await createSemanticResumeProfile(resumeText);
    return await calculateSemanticAtsScoreFromProfile(profile, jdText);
  } catch (error) {
    console.error("Semantic ATS scoring failed; using keyword fallback.", error);
    return fallbackKeywordScore(resumeText, jdText);
  }
}
