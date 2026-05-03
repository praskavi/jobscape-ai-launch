import * as React from "react";
import {
  FileText,
  Trash2,
  Upload,
  LogOut,
  LayoutDashboard,
  FileStack,
  Search,
  Settings as SettingsIcon,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  History,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types — Supabase-ready                                              */
/* ------------------------------------------------------------------ */
// Future Supabase tables:
// profiles { id, user_id, full_name, email }
// user_documents { id, user_id, document_type: 'resume'|'cover_letter',
//                  file_name, file_path, file_url, mime_type, uploaded_at }
// job_searches { id, user_id, keyword, location, created_at }

type DocumentType = "resume" | "cover_letter";

interface UserDocument {
  id: string;
  document_type: DocumentType;
  file_name: string;
  file_url: string; // Object URL for now; Supabase storage URL later
  mime_type: string;
  uploaded_at: string; // ISO date
}

interface JobSearch {
  id: string;
  keyword: string;
  location: string;
  results: number;
  created_at: string;
}

interface UserProfile {
  full_name: string;
  email: string;
}

const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXT = [".pdf", ".doc", ".docx"];

/* ------------------------------------------------------------------ */
/* Mock data                                                            */
/* ------------------------------------------------------------------ */
const MOCK_USER: UserProfile = {
  full_name: "Prashant Kumar",
  email: "prashant@example.com",
};

const MOCK_SEARCHES: JobSearch[] = [
  {
    id: "s1",
    keyword: "Salesforce Developer",
    location: "Melbourne",
    results: 10,
    created_at: "2026-05-02",
  },
  {
    id: "s2",
    keyword: "Business Analyst",
    location: "Sydney",
    results: 8,
    created_at: "2026-05-01",
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getFileTypeLabel(mime: string, name: string): "PDF" | "DOC" | "DOCX" {
  if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) return "PDF";
  if (name.toLowerCase().endsWith(".docx")) return "DOCX";
  return "DOC";
}

function validateFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  const okExt = ALLOWED_EXT.some((e) => lower.endsWith(e));
  const okMime = ALLOWED_MIME.includes(file.type) || file.type === "";
  if (!okExt || !okMime) return "Only PDF, DOC, or DOCX files are allowed.";
  return null;
}

/* ------------------------------------------------------------------ */
/* Small UI primitives                                                  */
/* ------------------------------------------------------------------ */
function FileTypeBadge({ type }: { type: "PDF" | "DOC" | "DOCX" }) {
  const tone =
    type === "PDF"
      ? "bg-red-50 text-red-700 border-red-100"
      : "bg-blue-50 text-blue-700 border-blue-100";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide",
        tone,
      )}
    >
      {type}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "good" | "warn";
}) {
  const dot =
    tone === "good"
      ? "bg-emerald-500"
      : tone === "warn"
        ? "bg-amber-500"
        : "bg-foreground/30";
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Upload box                                                           */
/* ------------------------------------------------------------------ */
function UploadBox({
  label,
  onFile,
  error,
}: {
  label: string;
  onFile: (file: File) => void;
  error?: string | null;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFile(files[0]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-surface px-6 py-10 text-center transition-colors",
        drag ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Upload className="h-5 w-5" />
      </div>
      <h4 className="mt-3 text-sm font-semibold text-foreground">{label}</h4>
      <p className="mt-1 text-xs text-muted-foreground">Allowed formats: PDF, DOC, DOCX</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-4 text-xs font-medium text-background transition-opacity hover:opacity-90"
      >
        <Plus className="h-3.5 w-3.5" /> Choose file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Document card                                                        */
/* ------------------------------------------------------------------ */
function DocumentCard({
  doc,
  onDelete,
}: {
  doc: UserDocument;
  onDelete: () => void;
}) {
  const type = getFileTypeLabel(doc.mime_type, doc.file_name);
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{doc.file_name}</p>
            <FileTypeBadge type={type} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Uploaded {formatDate(doc.uploaded_at)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={doc.file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View file <ExternalLink className="h-3 w-3" />
            </a>
            <button
              type="button"
              disabled
              title="Delete the current file before uploading a new one."
              className="cursor-not-allowed text-xs font-medium text-muted-foreground/70"
            >
              Replace
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${doc.file_name}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confirm delete modal                                                 */
/* ------------------------------------------------------------------ */
function ConfirmDeleteModal({
  open,
  type,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  type: DocumentType | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open || !type) return null;
  const label = type === "resume" ? "resume" : "cover letter";
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-foreground">Delete {label}?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          This will remove the current file from your account. You can upload a new one
          afterwards.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete file
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Document section (resume or cover letter)                            */
/* ------------------------------------------------------------------ */
function DocumentSection({
  title,
  type,
  doc,
  onUpload,
  onRequestDelete,
}: {
  title: string;
  type: DocumentType;
  doc: UserDocument | null;
  onUpload: (file: File) => void;
  onRequestDelete: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);

  const handleFile = (file: File) => {
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onUpload(file);
  };

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {doc ? (
        <DocumentCard doc={doc} onDelete={onRequestDelete} />
      ) : (
        <UploadBox
          label={`Upload your ${type === "resume" ? "resume" : "cover letter"}`}
          onFile={handleFile}
          error={error}
        />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Recent searches                                                      */
/* ------------------------------------------------------------------ */
function RecentSearches({ searches }: { searches: JobSearch[] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Job Searches</h3>
        <span className="text-xs text-muted-foreground">{searches.length} total</span>
      </div>
      {searches.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-border py-10 text-center">
          <Search className="h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-foreground">You haven't searched for jobs yet.</p>
          <button className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground">
            Start your first search
          </button>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {searches.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{s.keyword}</p>
                <p className="text-xs text-muted-foreground">
                  {s.location} • {s.results} results
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(s.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar + Header                                                     */
/* ------------------------------------------------------------------ */
const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Resume & Cover Letter", icon: FileStack, active: false },
  { label: "Job Searches", icon: Search, active: false },
  { label: "Settings", icon: SettingsIcon, active: false },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="px-2 pb-3">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Jobscape <span className="text-primary">AI</span>
        </span>
      </div>
      {NAV.map((item) => (
        <button
          key={item.label}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            item.active
              ? "bg-foreground/[0.06] text-foreground"
              : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function DashboardHeader({
  user,
  onMenu,
}: {
  user: UserProfile;
  onMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="text-base font-semibold tracking-tight text-foreground md:hidden">
          Jobscape <span className="text-primary">AI</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          aria-label={`${user.full_name} avatar`}
        >
          {getInitials(user.full_name)}
        </div>
        <button
          type="button"
          // TODO: Supabase signOut here
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export function DashboardPage() {
  const [user] = React.useState<UserProfile>(MOCK_USER);
  const [resume, setResume] = React.useState<UserDocument | null>(null);
  const [coverLetter, setCoverLetter] = React.useState<UserDocument | null>(null);
  const [searches] = React.useState<JobSearch[]>(MOCK_SEARCHES);
  const [pendingDelete, setPendingDelete] = React.useState<DocumentType | null>(null);
  const [mobileNav, setMobileNav] = React.useState(false);

  const handleUpload = (type: DocumentType, file: File) => {
    // TODO: upload to Supabase storage + insert into user_documents
    const doc: UserDocument = {
      id: crypto.randomUUID(),
      document_type: type,
      file_name: file.name,
      file_url: URL.createObjectURL(file),
      mime_type: file.type,
      uploaded_at: new Date().toISOString(),
    };
    if (type === "resume") setResume(doc);
    else setCoverLetter(doc);
  };

  const confirmDelete = () => {
    // TODO: delete from Supabase storage + user_documents row
    if (pendingDelete === "resume") setResume(null);
    if (pendingDelete === "cover_letter") setCoverLetter(null);
    setPendingDelete(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:block">
          <div className="sticky top-0 h-screen">
            <Sidebar />
          </div>
        </aside>

        {/* Mobile sidebar drawer */}
        {mobileNav && (
          <div
            className="fixed inset-0 z-40 bg-foreground/40 md:hidden"
            onClick={() => setMobileNav(false)}
          >
            <div
              className="h-full w-72 bg-surface"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4">
                <span className="text-base font-semibold">Menu</span>
                <button
                  onClick={() => setMobileNav(false)}
                  aria-label="Close menu"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Sidebar onNavigate={() => setMobileNav(false)} />
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <DashboardHeader user={user} onMenu={() => setMobileNav(true)} />

          <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
            {/* Welcome */}
            <section className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Welcome back, {user.full_name.split(" ")[0]}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your resume, cover letter, and job search activity.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                  <Search className="h-4 w-4" /> Start New Job Search
                </button>
                <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-muted">
                  <History className="h-4 w-4" /> View Search History
                </button>
              </div>
            </section>

            {/* Stats */}
            <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Total Searches" value={searches.length} hint="All time" />
              <StatCard
                label="Resume Status"
                value={
                  <span className="inline-flex items-center gap-2">
                    {resume ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    )}
                    {resume ? "Uploaded" : "Missing"}
                  </span>
                }
                tone={resume ? "good" : "warn"}
              />
              <StatCard
                label="Cover Letter Status"
                value={
                  <span className="inline-flex items-center gap-2">
                    {coverLetter ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    )}
                    {coverLetter ? "Uploaded" : "Missing"}
                  </span>
                }
                tone={coverLetter ? "good" : "warn"}
              />
            </section>

            {/* Documents */}
            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <DocumentSection
                title="Resume"
                type="resume"
                doc={resume}
                onUpload={(f) => handleUpload("resume", f)}
                onRequestDelete={() => setPendingDelete("resume")}
              />
              <DocumentSection
                title="Cover Letter"
                type="cover_letter"
                doc={coverLetter}
                onUpload={(f) => handleUpload("cover_letter", f)}
                onRequestDelete={() => setPendingDelete("cover_letter")}
              />
            </div>

            {/* Recent searches */}
            <RecentSearches searches={searches} />
          </main>
        </div>
      </div>

      <ConfirmDeleteModal
        open={pendingDelete !== null}
        type={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default DashboardPage;
