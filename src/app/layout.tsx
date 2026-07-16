import type { Metadata } from "next";
import "./globals.css";
import SmoothScrollProvider from "@/components/common/SmoothScrollProvider";
import PageLoader from "@/components/common/PageLoader";

export const metadata: Metadata = {
  title: "Momentum | Unified Assessment & Learning Platform",
  description: "A comprehensive dashboard and testing suite for teachers, administrators, and students.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <PageLoader>
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </PageLoader>
      </body>
    </html>
  );
}
