import { Footer } from "./layout/Footer";
import { HeroSection, TrustStrip } from "./landing/Hero";
import { FeaturesSection, HowItWorksSection } from "./landing/Features";
import { DashboardPreview } from "./landing/Preview";
import { PricingSection } from "./landing/Pricing";
import { TestimonialsSection, FAQSection, CTASection } from "./landing/TestimonialsFAQ";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <main>
        <HeroSection />
        <TrustStrip />
        <FeaturesSection />
        <HowItWorksSection />
        <DashboardPreview />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
