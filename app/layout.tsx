import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Permanent_Marker, Great_Vibes, UnifrakturCook } from "next/font/google";
import "./globals.css";

// ============================================================================
// FONT CONFIGURATION
// ============================================================================
// Each font is loaded with a specific subset and assigned to a CSS variable.
// Tailwind reads these variables via the font-* utility classes.
// ============================================================================

// Permanent Marker — for FAMILY HERO titles (uppercase only)
const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

// Great Vibes — for personal names and intimate script moments
const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
  display: "swap",
});

// UnifrakturCook — for dates, generations, historical anchors
const unifrakturCook = UnifrakturCook({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-historic",
  display: "swap",
});

// ============================================================================
// PAGE METADATA
// ============================================================================

export const metadata: Metadata = {
  title: "Family Tree",
  description: "Una constelación viva de quienes te formaron y acompañan.",
};

// ============================================================================
// ROOT LAYOUT
// ============================================================================

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${GeistSans.variable} ${GeistMono.variable} ${permanentMarker.variable} ${greatVibes.variable} ${unifrakturCook.variable}`}
    >
      <body className="font-sans bg-surface-deep text-zinc-50 antialiased">
        {children}
        {modal}
      </body>
    </html>
  );
}

