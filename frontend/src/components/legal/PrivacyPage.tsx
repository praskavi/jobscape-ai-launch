import { Footer } from "@/components/layout/Footer";

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="mb-4">
          Jobscape AI respects your privacy. This page explains how we collect,
          use, and protect your personal information when you use our platform.
        </p>
        <p className="mb-4">
          We may collect information such as your account details, uploaded
          documents, resume data, job search activity, and usage information to
          provide job search and recommendation services.
        </p>
        <p>
          We do not sell your personal information. Your data is used to operate,
          improve, and secure the Jobscape AI platform.
        </p>
      </main>
      <Footer />
    </div>
  );
}