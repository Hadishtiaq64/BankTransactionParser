import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lustre — AI-Powered Transaction Intelligence",
  description:
    "Upload your bank transactions and let AI categorize spending and surface anomalies. A monochrome, liquid-chrome demo experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
