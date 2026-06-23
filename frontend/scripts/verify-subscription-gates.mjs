#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SUBSCRIPTION_GATE_BASE_URL || "http://localhost:3000";
const strict = process.env.SUBSCRIPTION_GATE_STRICT === "1";
const sampleResumePath = process.env.SUBSCRIPTION_GATE_RESUME_FILE;
const sampleJobDescription =
  process.env.SUBSCRIPTION_GATE_JOB_DESCRIPTION ||
  "We are hiring a software engineer with TypeScript, React, API design, SQL, and production debugging experience.";

const scenarios = [
  { label: "free", token: process.env.SUBSCRIPTION_GATE_FREE_TOKEN },
  { label: "basic", token: process.env.SUBSCRIPTION_GATE_BASIC_TOKEN },
  { label: "premium", token: process.env.SUBSCRIPTION_GATE_PREMIUM_TOKEN },
  { label: "admin", token: process.env.SUBSCRIPTION_GATE_ADMIN_TOKEN },
].filter((scenario) => scenario.token);

let hasUnexpectedResult = false;

function printResult(name, status, body, expectedStatuses = []) {
  const reason = body?.reason ? ` reason=${body.reason}` : "";
  const error = body?.error ? ` error="${body.error}"` : "";
  const expected = expectedStatuses.length === 0 || expectedStatuses.includes(status);
  const marker = expected ? "" : " [unexpected]";

  if (!expected) {
    hasUnexpectedResult = true;
  }

  console.log(`${name}: HTTP ${status}${reason}${error}${marker}`);
}

async function parseJson(response) {
  return response.json().catch(() => null);
}

async function postForm(endpoint, token, formData) {
  return fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
}

async function createResumeFormData(extraFields = {}) {
  if (!sampleResumePath) {
    throw new Error("Set SUBSCRIPTION_GATE_RESUME_FILE to a PDF or DOCX file path.");
  }

  const buffer = await readFile(sampleResumePath);
  const ext = path.extname(sampleResumePath).toLowerCase();
  const type = ext === ".pdf"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const file = new Blob([buffer], { type });
  const formData = new FormData();
  formData.append("resume", file, path.basename(sampleResumePath));

  for (const [key, value] of Object.entries(extraFields)) {
    formData.append(key, value);
  }

  return formData;
}

async function verifyUnauthenticated() {
  const formData = new FormData();
  const response = await postForm("/api/analyze-ats", null, formData);
  const body = await parseJson(response);
  printResult("unauthenticated analyze-ats", response.status, body, [401]);
}

async function verifyScenario({ label, token }) {
  const uploadForm = await createResumeFormData();
  const uploadResponse = await postForm("/api/upload-resume", token, uploadForm);
  printResult(`${label} upload-resume`, uploadResponse.status, await parseJson(uploadResponse));

  const atsForm = await createResumeFormData({
    jobDescription: sampleJobDescription,
    fetchAdvancedAI: "false",
  });
  const atsResponse = await postForm("/api/analyze-ats", token, atsForm);
  printResult(`${label} analyze-ats`, atsResponse.status, await parseJson(atsResponse));

  const matchForm = new FormData();
  matchForm.append("jobTitle", "Software Engineer");
  matchForm.append("location", "Melbourne");
  const matchResponse = await postForm("/api/find-jobs", token, matchForm);
  printResult(`${label} find-jobs`, matchResponse.status, await parseJson(matchResponse));
}

async function main() {
  console.log(`Subscription gate verification target: ${baseUrl}`);
  await verifyUnauthenticated();

  if (scenarios.length === 0) {
    console.log("No user tokens provided. Set SUBSCRIPTION_GATE_*_TOKEN env vars to run plan-specific checks.");
  } else {
    for (const scenario of scenarios) {
      await verifyScenario(scenario);
    }
  }

  if (hasUnexpectedResult) {
    const message = "One or more checks returned an unexpected status. Ensure the target app is running and env vars are correct.";
    if (strict) {
      throw new Error(message);
    }
    console.warn(`${message} Set SUBSCRIPTION_GATE_STRICT=1 to fail on unexpected statuses.`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
