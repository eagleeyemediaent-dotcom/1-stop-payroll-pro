Replace EVERYTHING inside:

app/layout.tsx

with this FULL file:

```tsx
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
```

THEN:

1. Save file
2. Redeploy in Vercel
3. Delete gray app from phone
4. Reopen deployment
5. Press:

Install App

NOT shortcut.

This forces Android to use your real gold icon instead of the gray V.
