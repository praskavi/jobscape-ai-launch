import "../styles.css";
import { AppLayoutWrapper } from "@/components/layout/AppLayoutWrapper";
import { Toaster } from "@/components/ui/sonner";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";

export const metadata = {
  title: "Jobscape AI",
  description: "Jobscape AI - Automate your job search",
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
