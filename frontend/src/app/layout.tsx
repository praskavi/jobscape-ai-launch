import "../styles.css";
import { AppLayoutWrapper } from "@/components/layout/AppLayoutWrapper";
import { Toaster } from "@/components/ui/sonner";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { defaultSeoDescription, siteName, siteUrl } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: "Jobscape AI - AI Job Matching and ATS Resume Checker",
    template: `%s - ${siteName}`,
  },
  description: defaultSeoDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName,
    url: "/",
    title: "Jobscape AI - AI Job Matching and ATS Resume Checker",
    description: defaultSeoDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "Jobscape AI - AI Job Matching and ATS Resume Checker",
    description: defaultSeoDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SubscriptionProvider>
          <AppLayoutWrapper>
            {children}
          </AppLayoutWrapper>
        </SubscriptionProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
