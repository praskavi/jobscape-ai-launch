import LandingPage from "../components/LandingPage";

export const metadata = {
  title: "Jobscape AI - AI-powered job search & resume matching",
  description:
    "Upload your resume, search live jobs, and instantly see which roles are worth applying for with AI-powered match scores.",
  openGraph: {
    title: "Jobscape AI - Apply smarter, not harder",
    description: "AI resume matching and ATS scoring for live job listings.",
    type: "website",
  },
};

export default function Home() {
  return <LandingPage />;
}
