import { Footer } from "@/components/layout/Footer";
import { PricingSection } from "@/components/landing/Pricing";

export const metadata = {
  title: "Pricing - Jobscape AI",
  description:
    "Choose a Jobscape AI plan for smarter job search, resume matching, and ATS insights.",
};

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
