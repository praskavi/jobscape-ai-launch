# Solution Design: Job Ingestion Pipeline

## Jira

- Epic: KAN-4 - APIs, scraping, and job data collection

## Problem / Goal

JobScrape's matching features depend on reliable job data ingestion, deduplication, text normalization, chunking, embeddings, and search-ready storage. The goal is to document the expected ingestion architecture even where workflow implementation lives outside the frontend app.

## Scope

- Source job collection from external job boards/APIs.
- Normalize job title, company, location, salary, type, and apply URL.
- Store raw and searchable job descriptions.
- Generate job chunks and embeddings.
- Support vector matching through Supabase RPCs.
- Keep client writes blocked for ingestion-owned tables.

## Design

Expected ingestion stages:

1. Collect jobs from configured sources.
2. Normalize fields into the `jobs` table.
3. Deduplicate by source identifiers, apply URL, title/company/location, or hash.
4. Extract clean text from job descriptions.
5. Split descriptions into chunks.
6. Generate embeddings.
7. Store chunks and embeddings in Supabase.
8. Expose read/match access through RLS-safe views/RPCs.

The application consumes this data through:

- `/api/find-jobs`
- `match_jobs` RPC
- Public/readable `jobs`
- RLS-protected `job_chunks`

## User Stories

### Ingest Jobs From Sources

- Jira: KAN-4
- Who: As the JobScrape system.
- What: I want to collect jobs from configured external sources.
- Why: So that users have fresh roles to search and match against.

### Normalize Job Records

- Jira: KAN-4
- Who: As the JobScrape system.
- What: I want incoming job data normalized into consistent fields.
- Why: So that search, filtering, and display work across multiple sources.

### Deduplicate Jobs

- Jira: KAN-4
- Who: As a user browsing job results.
- What: I want duplicate jobs removed or merged.
- Why: So that I do not waste time reviewing repeated listings.

### Prepare Jobs For Matching

- Jira: KAN-4
- Who: As the JobScrape system.
- What: I want job descriptions chunked and embedded.
- Why: So that resume-to-job matching can use semantic similarity.

### Protect Ingestion Tables

- Jira: KAN-4
- Who: As the JobScrape system.
- What: I want clients prevented from writing job chunks and embeddings.
- Why: So that searchable data remains trusted and controlled by ingestion workflows.

## Acceptance Criteria

- Job ingestion flow is documented from source to searchable storage.
- Deduplication strategy is defined.
- Chunking and embedding responsibilities are defined.
- App read paths are identified.
- Client write restrictions are documented.

## Risks / Follow-ups

- Source terms of service and scraping reliability must be reviewed.
- Embedding model changes can affect match quality.
- Ingestion observability and retries need dedicated operational design.
