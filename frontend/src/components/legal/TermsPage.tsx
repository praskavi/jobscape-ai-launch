import { Footer } from "@/components/layout/Footer";

export function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="mb-4">
          By using Jobscape AI, you agree to use the platform responsibly and
          only for lawful job search and career-related purposes.
        </p>
        <p className="mb-4">
          Job recommendations, ATS insights, and AI-generated feedback are
          provided as guidance only and do not guarantee employment outcomes.
        </p>
        <p>
          We may update these terms from time to time as the platform evolves.
        </p>
      </main>
      <Footer />
    </div>
  );
}