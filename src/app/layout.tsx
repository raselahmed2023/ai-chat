import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frontend AI Assistant",
  description:
    "An accessible streaming AI chat with structured frontend analysis tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}