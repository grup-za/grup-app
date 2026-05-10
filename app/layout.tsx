import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grüp",
  description: "Group & service payments for South Africa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-brand-bg text-brand-text antialiased">
        {children}
      </body>
    </html>
  );
}
