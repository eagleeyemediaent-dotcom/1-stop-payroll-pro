import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "1 Stop Payroll",
  description: "1 Stop Payroll App",
  manifest: "/manifest.json",
  themeColor: "#000000",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
