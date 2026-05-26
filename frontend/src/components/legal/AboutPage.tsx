import { Footer } from "@/components/layout/Footer";

export function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-bold mb-6">About Jobscape AI</h1>
        <p className="mb-4">
          Jobscape AI helps job seekers discover relevant job opportunities,
          manage resumes, and improve job applications using intelligent search
          and AI-assisted matching.
        </p>
        <p>
          Our goal is to make job searching more focused, efficient, and
          personalised for each user.
        </p>
      </main>
      <Footer />
    </div>
  );
}