import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Wellness", template: "%s · Wellness" },
  description: "A personal wellness and habit dashboard.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1422" },
  ],
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const stored = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = stored === "light" || stored === "dark" ? stored : "system";
  return (
    <html lang="en-GB" data-theme={theme} className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
