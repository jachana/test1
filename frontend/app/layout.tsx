import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Star-Map Laser Studio",
  description: "Generate historically accurate, laser-ready custom star maps.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
