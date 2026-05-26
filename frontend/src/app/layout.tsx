import "../styles.css";
import { AppLayoutWrapper } from "@/components/layout/AppLayoutWrapper";

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
        <AppLayoutWrapper>
          {children}
        </AppLayoutWrapper>
      </body>
    </html>
  );
}
