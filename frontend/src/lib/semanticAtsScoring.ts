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
  "but",
  "benefits",
  "corp",
  "can",
  "career",
  "certified",
  "company",
  "could",
  "day",
  "demonstrated",
  "did",
  "does",
  "dollars",
  "done",
  "doors",
  "duties",
  "employees",
  "employer",
  "ensure",
  "environment",
  "enjoy",
  "essential",
  "experience",
  "fast",
  "for",
  "from",
  "full",
  "generous",
  "global",
  "good",
  "have",
  "help",
  "how",
  "include",
  "including",
  "industry",
  "job",
  "key",
  "junior",
  "knowledge",
  "leader",
  "leaders",
  "looking",
  "management",
  "member",
  "monthly",
  "more",
  "must",
  "needs",
  "new",
  "not",
  "only",
  "others",
  "our",
  "part",
  "past",
  "people",
  "permanent",
  "personal",
  "possible",
  "preferred",
  "professional",
  "professionals",
  "provide",
  "required",
  "responsibilities",
  "role",
  "senior",
  "shared",
  "should",
  "skills",
  "some",
  "strong",
  "success",
  "such",
  "team",
  "that",
  "the",
  "their",
  "they",
  "this",
  "time",
  "toward",
  "track",
  "thrive",
  "take",
  "using",
  "advantageous",
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
  "achievable",
  "approachable",
  "best",
  "champion",
  "deliver",
  "financial",
  "rewards",
  "shops",
  "suit",
  "through",
  "tiered",
  "towards",
  "vision",
  "world",
]);

const REQUIREMENT_SECTION_MARKERS = [
  "about the role",
  "about you",
  "responsibilities",
  "requirements",
  "key responsibilities",
  "selection criteria",
  "what you will do",
  "what you bring",
];

const NON_REQUIREMENT_SECTION_MARKERS = [
  "why work",
  "about us",
  "how to apply",
  "testimonial",
  "benefits",
  "save money",
  "overseas opportunities",
  "grow your wealth",
  "enrich our communities",
  "enrich our planet",
];

const LOW_SIGNAL_LINE_PATTERNS = [
  /\$\d/i,
  /\b\d+%/,
  /\b\d+\s*(employees|members|stores|shops|months|years)\b/i,
  /\bdonat/i,
  /\bsolar panels?\b/i,
  /\bflight centre\b/i,
  /\bb corp\b/i,
  /\bglobal gathering\b/i,
  /\bapply link\b/i,
  /\bacademy\b/i,
  /\btraining provided\b/i,
  /\bone on one coaching\b/i,
  /\bmeetings?\b/i,
  /\bflexible rostering\b/i,
  /\bopportunities\b/i,
  /\bhigh achievers?\b/i,
  /\bgrowing and looking\b/i,
  /\bcustomer champion\b/i,
  /\bworld.*bike shops\b/i,
  /\bhigh-performing culture\b/i,
  /\bcommunity-driven\b/i,
  /\bstore awards\b/i,
  /\bcharity\b/i,
  /\bembrace innovation\b/i,
  /\bdiverse backgrounds\b/i,
  /\bperfect for high performers\b/i,
  /\bsales professionals seeking\b/i,
  /\bany field\b/i,
  /\bthese could be\b/i,
];

const HIGH_SIGNAL_WORDS = new Set([
  "communication",
  "customer",
  "customers",
  "honesty",
  "initiative",
  "inventory",
  "lead",
  "leading",
  "leadership",
  "learn",
  "learning",
  "product",
  "products",
  "relationship",
  "relationships",
  "reliability",
  "reliable",
  "resilient",
  "retail",
  "sales",
  "service",
  "store",
  "support",
  "team",
  "teams",
  "train",
  "training",
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
  rawText: string;
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

function splitLines(text: string) {
  return (text || "")
    .replace(/\r/g, "\n")
    .split(/\n|[\u2022]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isSignalWord(word: string) {
  return word.length > 2 && (HIGH_SIGNAL_WORDS.has(word) || !LOW_SIGNAL_WORDS.has(word)) && Number.isNaN(Number(word));
}

function phraseKey(words: string[]) {
  return words.join(" ");
}

function selectRequirementText(text: string) {
  const lines = splitLines(text);
  const selected: string[] = [];
  let inRequirementSection = false;
  let foundRequirementSection = false;

  for (const line of lines) {
    const cleanedLine = cleanText(line);
    const isRequirementMarker = REQUIREMENT_SECTION_MARKERS.some((marker) => cleanedLine.includes(marker));
    const isNonRequirementMarker = NON_REQUIREMENT_SECTION_MARKERS.some((marker) => cleanedLine.includes(marker));

    if (isRequirementMarker) {
      inRequirementSection = true;
      foundRequirementSection = true;
      continue;
    }

    if (isNonRequirementMarker && inRequirementSection) {
      inRequirementSection = false;
      continue;
    }

    if (inRequirementSection) {
      selected.push(line);
    }
  }

  return foundRequirementSection && selected.length > 0 ? selected.join("\n") : text;
}

function isLowSignalLine(line: string) {
  const cleanedLine = cleanText(line);
  return LOW_SIGNAL_LINE_PATTERNS.some((pattern) => pattern.test(cleanedLine));
}

function normalizeMatchWord(word: string) {
  if (word === "guiding" || word === "guided") {
    return "guide";
  }

  if (word === "leading" || word === "led") {
    return "lead";
  }

  if (word.endsWith("ies") && word.length > 4) {
    return `${word.slice(0, -3)}y`;
  }

  if (word.endsWith("ing") && word.length > 5) {
    return word.slice(0, -3);
  }

  if (word.endsWith("ed") && word.length > 4) {
    return word.slice(0, -2);
  }

  if (word.endsWith("s") && word.length > 4) {
    return word.slice(0, -1);
  }

  return word;
}

function lexicalCoverage(phraseText: string, resumeClean: string, resumeWords: Set<string>) {
  const phraseWords = toWords(phraseText).filter(isSignalWord).map(normalizeMatchWord);

  if (phraseWords.length === 0) {
    return 0;
  }

  const phrase = phraseKey(phraseWords);
  if (resumeClean.includes(phrase)) {
    return 1;
  }

  const normalizedResumeWords = new Set(Array.from(resumeWords).map(normalizeMatchWord));

  if (normalizedResumeWords.has("team") && (normalizedResumeWords.has("train") || normalizedResumeWords.has("support"))) {
    normalizedResumeWords.add("lead");
    normalizedResumeWords.add("guide");
  }

  if (normalizedResumeWords.has("target")) {
    normalizedResumeWords.add("goal");
  }

  if (normalizedResumeWords.has("product") && normalizedResumeWords.has("recommendation")) {
    normalizedResumeWords.add("advice");
  }

  if (normalizedResumeWords.has("relationship")) {
    normalizedResumeWords.add("builder");
  }

  const matchedWords = phraseWords.filter((word) => normalizedResumeWords.has(word)).length;
  return matchedWords / phraseWords.length;
}

function phraseOverlap(a: string, b: string) {
  const aWords = new Set(toWords(a).filter(isSignalWord));
  const bWords = toWords(b).filter(isSignalWord);

  if (aWords.size === 0 || bWords.length === 0) {
    return 0;
  }

  const shared = bWords.filter((word) => aWords.has(word)).length;
  return shared / Math.min(aWords.size, bWords.length);
}

function extractPhrases(text: string, limit: number): Phrase[] {
  const candidates = splitLines(selectRequirementText(text))
    .flatMap((line) => line.split(/[;:|.]+/))
    .map((part) => part.trim())
    .filter((part) => part && !isLowSignalLine(part));

  const phraseWeights = new Map<string, number>();

  for (const candidate of candidates) {
    const signalWords = toWords(candidate).filter(isSignalWord);

    if (signalWords.length < 2) {
      continue;
    }

    const phraseLength = Math.min(4, signalWords.length);
    const primaryPhrase = phraseKey(signalWords.slice(0, phraseLength));
    phraseWeights.set(primaryPhrase, (phraseWeights.get(primaryPhrase) || 0) + 1.25);

    for (let i = 0; i <= signalWords.length - 2; i += 1) {
      const bigram = phraseKey(signalWords.slice(i, i + 2));
      phraseWeights.set(bigram, (phraseWeights.get(bigram) || 0) + 1.5);
    }

    for (let i = 0; i <= signalWords.length - 3; i += 1) {
      const trigram = phraseKey(signalWords.slice(i, i + 3));
      phraseWeights.set(trigram, (phraseWeights.get(trigram) || 0) + 1.75);
    }
  }

  const selected: Phrase[] = [];
  const sorted = Array.from(phraseWeights.entries()).sort((a, b) => b[1] - a[1]);

  for (const [text, weight] of sorted) {
    const isTooSimilar = selected.some((phrase) => phraseOverlap(phrase.text, text) >= 0.67);

    if (!isTooSimilar) {
      selected.push({ text, weight });
    }

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

function fallbackKeywordScore(resumeText: string, jdText: string): SemanticAtsScore {
  const jdPhrases = extractPhrases(jdText, 18);
  const resumeClean = cleanText(resumeText);
  const resumeWords = new Set(toWords(resumeText).filter(isSignalWord));
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];
  let coveredWeight = 0;
  let totalWeight = 0;

  for (const phrase of jdPhrases) {
    const coverage = lexicalCoverage(phrase.text, resumeClean, resumeWords);
    totalWeight += phrase.weight;

    if (coverage >= 0.68) {
      coveredWeight += phrase.weight;
      matchedKeywords.push(phrase.text);
    } else if (coverage >= 0.42) {
      coveredWeight += phrase.weight * 0.6;
      matchedKeywords.push(phrase.text);
    } else {
      missingKeywords.push(phrase.text);
    }
  }

  const score = totalWeight > 0 ? Math.min(100, Math.round((coveredWeight / totalWeight) * 100)) : 0;

  return {
    score,
    matchedKeywords: matchedKeywords.slice(0, 12),
    missingKeywords: missingKeywords.slice(0, 12),
  };
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

  return { phrases, vectors, rawText: resumeText };
}

export async function calculateSemanticAtsScoreFromProfile(
  profile: SemanticResumeProfile,
  jdText: string
): Promise<SemanticAtsScore> {
  const jdPhrases = extractPhrases(jdText, 20);

  if (jdPhrases.length === 0 || profile.vectors.length === 0) {
    return fallbackKeywordScore(profile.rawText, jdText);
  }

  const jdVectors = await embedTexts(jdPhrases.map((phrase) => phrase.text));

  if (jdVectors.length !== jdPhrases.length) {
    return fallbackKeywordScore(profile.rawText, jdText);
  }

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];
  const resumeClean = cleanText(profile.rawText);
  const resumeWords = new Set(toWords(profile.rawText).filter(isSignalWord));
  let coveredWeight = 0;
  let totalWeight = 0;

  jdPhrases.forEach((phrase, index) => {
    const bestSimilarity = Math.max(
      ...profile.vectors.map((resumeVector) => cosineSimilarity(jdVectors[index], resumeVector))
    );
    const lexicalScore = lexicalCoverage(phrase.text, resumeClean, resumeWords);
    const bestScore = Math.max(bestSimilarity, lexicalScore);

    totalWeight += phrase.weight;

    if (bestScore >= 0.62) {
      coveredWeight += phrase.weight;
      matchedKeywords.push(phrase.text);
    } else if (bestScore >= 0.46) {
      coveredWeight += phrase.weight * 0.6;
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
