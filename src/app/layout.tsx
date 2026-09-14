import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";

export const metadata: Metadata = {
  title: "Frontend AI Assistant",
  description:
    "An accessible streaming AI chat with structured frontend analysis tools.",
};

const globalCss = fs.readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8"
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: globalCss,
          }}
        />
      </head>

      <body>{children}</body>
    </html>
  );
}