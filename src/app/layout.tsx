import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Redfeed",
  description: "Mobile RSS-style Reddit client with hide/ignore workflows",
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
