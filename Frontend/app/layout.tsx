import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { AnalysisProvider } from "@/context/analysis-context"
import "./globals.css"

export const metadata: Metadata = {
  title: "GradVoice - AI-Powered CV Analysis",
  description:
    "Transform your CV with AI-powered insights. Get instant feedback on ATS compatibility, keyword optimization, and recruiter recommendations.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png",  media: "(prefers-color-scheme: dark)"  },
      { url: "/icon.svg",             type: "image/svg+xml"                  },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AnalysisProvider>
          {children}
        </AnalysisProvider>
        <Analytics />
      </body>
    </html>
  )
}
