import type { Metadata } from "next";
import {
  Source_Code_Pro,
  Inter_Tight,
  Instrument_Serif,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "RBase - AI-Powered Statistics & Data Science",
  description: "Upload a CSV and ask questions in plain English. RBase writes and runs R code in your browser. Get charts, stats, and insights without coding. Free, no setup, data stays local.",
  openGraph: {
    title: "RBase - AI-Powered Statistics & Data Science",
    description: "Upload a CSV, ask questions, get answers. AI-powered data analysis that runs entirely in your browser.",
    url: "https://tryrbase.com",
    siteName: "RBase",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RBase - AI-Powered Statistics & Data Science",
    description: "Upload a CSV, ask questions, get answers. AI-powered data analysis that runs entirely in your browser.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("sp-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${sourceCodePro.variable} ${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
